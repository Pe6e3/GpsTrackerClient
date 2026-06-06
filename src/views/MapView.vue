<template>
	<div class="map-page">
		<div class="map-bar">
			<button class="btn btn-ghost btn-compact" type="button" @click="goBack">←</button>

			<input
				id="from"
				v-model="from"
				class="map-input map-input-date"
				type="datetime-local"
				aria-label="Начало периода"
				:disabled="loading"
			/>

			<input
				id="to"
				v-model="to"
				class="map-input map-input-date"
				type="datetime-local"
				aria-label="Конец периода"
				:disabled="loading"
			/>

			<button class="btn btn-primary btn-compact" type="button" :disabled="loading" @click="loadTrack">
				{{ loading ? '…' : 'Трек' }}
			</button>

			<div v-if="track" class="map-bar-meta">
				<span class="map-bar-meta-name">{{ track.deviceName }} · {{ track.deviceId }}</span>
				<span>· {{ track.points.length }} т.</span>
			</div>
		</div>

		<p v-if="error" class="map-error">{{ error }}</p>

		<div ref="mapEl" class="map-container"></div>
	</div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getTrack } from '@/api/client'

const markerIcon = L.divIcon({
	className: 'track-marker',
	html: '<div style="width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
	iconSize: [12, 12],
	iconAnchor: [6, 6],
})

const startIcon = L.divIcon({
	className: 'track-marker-start',
	html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
	iconSize: [14, 14],
	iconAnchor: [7, 7],
})

const endIcon = L.divIcon({
	className: 'track-marker-end',
	html: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
	iconSize: [14, 14],
	iconAnchor: [7, 7],
})

export default {
	name: 'MapView',
	data() {
		return {
			from: '',
			to: '',
			track: null,
			loading: false,
			error: '',
			map: null,
			layerGroup: null,
		}
	},
	computed: {
		deviceId() {
			return this.$route.params.deviceId
		},
	},
	mounted() {
		document.body.classList.add('map-route')
		this.initDefaultDates()
		this.$nextTick(() => {
			this.initMap()
			this.loadTrack()
		})
		window.addEventListener('resize', this.handleMapResize)
	},
	beforeUnmount() {
		document.body.classList.remove('map-route')
		window.removeEventListener('resize', this.handleMapResize)
		if (this.map) {
			this.map.remove()
			this.map = null
		}
	},
	methods: {
		initDefaultDates() {
			const now = new Date()
			const start = new Date(now)
			start.setHours(0, 0, 0, 0)

			this.from = this.toLocalInput(start)
			this.to = this.toLocalInput(now)
		},
		toLocalInput(date) {
			const pad = (n) => String(n).padStart(2, '0')
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
		},
		toApiDateTime(localValue) {
			if (!localValue) return ''
			const [datePart, timePart] = localValue.split('T')
			const [y, m, d] = datePart.split('-')
			const [hh, mm] = (timePart || '00:00').split(':')
			return `${y}-${m}-${d} ${hh}:${mm}:00`
		},
		handleMapResize() {
			if (this.map)
				this.map.invalidateSize()
		},
		initMap() {
			if (this.map) return

			this.map = L.map(this.$refs.mapEl, {
				zoomControl: true,
			}).setView([43.24, 76.86], 13)

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; OpenStreetMap',
				maxZoom: 19,
			}).addTo(this.map)

			this.layerGroup = L.layerGroup().addTo(this.map)
			this.$nextTick(() => this.handleMapResize())
		},
		goBack() {
			this.$router.push({ name: 'devices' })
		},
		async loadTrack() {
			this.loading = true
			this.error = ''

			try {
				const params = {}
				if (this.from) params.from = this.toApiDateTime(this.from)
				if (this.to) params.to = this.toApiDateTime(this.to)

				this.track = await getTrack(this.deviceId, params)
				this.renderTrack()
			} catch (e) {
				this.error = e.message || 'Не удалось загрузить трек'
				if (e.message && e.message.includes('Сессия'))
					this.$router.push({ name: 'login' })
			} finally {
				this.loading = false
				this.$nextTick(() => this.handleMapResize())
			}
		},
		renderTrack() {
			if (!this.map || !this.layerGroup) return

			this.layerGroup.clearLayers()

			const points = this.track?.points || []
			if (!points.length) {
				this.error = 'Нет точек за выбранный период'
				return
			}

			const latLngs = points.map((p) => [p.lat, p.lon])

			const polyline = L.polyline(latLngs, {
				color: '#3b82f6',
				weight: 4,
				opacity: 0.85,
			})
			this.layerGroup.addLayer(polyline)

			const first = points[0]
			const last = points[points.length - 1]

			L.marker([first.lat, first.lon], { icon: startIcon })
				.bindPopup(this.pointPopup(first, 'Старт'))
				.addTo(this.layerGroup)

			L.marker([last.lat, last.lon], { icon: endIcon })
				.bindPopup(this.pointPopup(last, 'Финиш'))
				.addTo(this.layerGroup)

			if (points.length <= 80) {
				points.forEach((p) => {
					L.marker([p.lat, p.lon], { icon: markerIcon })
						.bindPopup(this.pointPopup(p))
						.addTo(this.layerGroup)
				})
			}

			this.$nextTick(() => {
				this.handleMapResize()
				this.map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
			})
		},
		pointPopup(point, label) {
			const title = label ? `<strong>${label}</strong><br>` : ''
			return `${title}${point.timeLocal}<br>Скорость: ${point.speedKmh ?? '—'} км/ч<br>Высота: ${point.alt ?? '—'} м`
		},
	},
}
</script>

<style scoped>
.map-container :deep(.leaflet-container) {
	height: 100%;
	width: 100%;
	background: #1a2332;
	font-family: inherit;
}
</style>
