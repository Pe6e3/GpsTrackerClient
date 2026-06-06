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

			<button
				v-if="canPlay"
				class="btn btn-secondary btn-compact"
				type="button"
				@click="openPlayback"
			>
				▶
			</button>

			<div v-if="track" class="map-bar-meta">
				<span class="map-bar-meta-name">{{ track.deviceName }} · {{ track.deviceId }}</span>
			</div>
		</div>

		<p v-if="error" class="map-error">{{ error }}</p>

		<div class="map-container" :class="{ 'playback-active': playbackActive }">
			<div ref="mapEl" class="map-leaflet"></div>

			<div v-if="playbackActive && playbackInfo" class="playback-info">
				<div class="playback-info-time">{{ playbackInfo.time }}</div>
				<div v-if="playbackInfo.speed" class="playback-info-speed">{{ playbackInfo.speed }}</div>
			</div>

			<div v-if="playbackActive" class="playback-panel">
				<div class="playback-main">
					<div class="playback-chart-body">
						<div class="playback-chart-y-axis">
							<span
								v-for="v in speedAxisLabels"
								:key="v"
								class="playback-chart-y-label"
							>{{ v }}</span>
						</div>
						<div
							class="playback-chart-plot"
							@mousedown.prevent="onChartPointerDown"
							@touchstart.prevent="onChartTouchStart"
						>
							<canvas ref="speedChartCanvas" class="playback-chart-canvas"></canvas>
							<div class="playback-chart-cursor" :style="{ left: chartCursorLeft }"></div>
						</div>
					</div>

					<div class="playback-controls">
						<button class="playback-btn playback-btn-close" type="button" aria-label="Закрыть" @click="closePlayback">
							✕
						</button>

						<button class="playback-btn" type="button" :aria-label="playing ? 'Пауза' : 'Плей'" @click="togglePlay">
							{{ playing ? '⏸' : '▶' }}
						</button>

						<div class="playback-speed">
							<span class="playback-speed-label">{{ speedLabel }}</span>
							<input
								class="playback-speed-slider"
								type="range"
								min="0"
								max="100"
								v-model.number="speedSlider"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getTrack } from '@/api/client'

const PLAYBACK_SPEED_MIN = 60
const PLAYBACK_SPEED_MAX = 10800

const CHART_SPEED_CAP = 180
const CHART_SPEED_FLOOR = 60
const CHART_SPEED_GRID = 20
const CHART_HEIGHT = 88

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

const vehicleIcon = L.divIcon({
	className: 'vehicle-marker',
	html: '<div class="vehicle-arrow"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="#3b82f6" stroke="#fff" stroke-width="1.5" d="M12 2 L20 20 L12 16 L4 20 Z"/></svg></div>',
	iconSize: [22, 22],
	iconAnchor: [11, 11],
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
			staticLayer: null,
			playbackLayer: null,
			pointTimes: [],
			totalDuration: 0,
			playbackActive: false,
			playing: false,
			playbackTrackTime: 0,
			speedSlider: 25,
			scrubberValue: 0,
			scrubbing: false,
			chartDragging: false,
			playbackInfo: null,
			progressLine: null,
			vehicleMarker: null,
			backgroundLine: null,
			animFrameId: null,
			lastFrameTime: 0,
		}
	},
	computed: {
		deviceId() {
			return this.$route.params.deviceId
		},
		canPlay() {
			return this.track?.points?.length > 1 && !this.playbackActive
		},
		playbackSpeed() {
			const logMin = Math.log(PLAYBACK_SPEED_MIN)
			const logMax = Math.log(PLAYBACK_SPEED_MAX)
			const t = this.speedSlider / 100
			return Math.exp(logMin + t * (logMax - logMin))
		},
		speedLabel() {
			const s = this.playbackSpeed
			if (s >= 3600) {
				const h = s / 3600
				return h % 1 === 0 ? `1с = ${h}ч` : `1с = ${h.toFixed(1)}ч`
			}
			return `1с = ${Math.round(s / 60)}мин`
		},
		chartCursorLeft() {
			return `${this.scrubberValue / 10}%`
		},
		chartSpeedMax() {
			if (!this.track?.points?.length) return CHART_SPEED_CAP
			const speeds = this.track.points.map((p) => this.getPointSpeedValue(p))
			const dataMax = speeds.length ? Math.max(0, ...speeds) : 0
			return Math.min(CHART_SPEED_CAP, Math.max(CHART_SPEED_FLOOR, dataMax))
		},
		speedAxisLabels() {
			const labels = []
			for (let v = this.chartSpeedMax; v >= 0; v -= CHART_SPEED_GRID)
				labels.push(v)
			if (labels[labels.length - 1] !== 0)
				labels.push(0)
			return labels
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
		this.unbindChartDrag()
		this.stopPlaybackLoop()
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
		parsePointTime(point) {
			if (point.timeUtc)
				return new Date(point.timeUtc).getTime()

			const m = point.timeLocal?.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2})$/)
			if (m)
				return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime()

			return 0
		},
		getPointSpeed(point) {
			if (point == null) return null
			if (point.speed != null && point.speed !== '')
				return String(point.speed)
			if (point.speedKmh != null && point.speedKmh !== '')
				return `${point.speedKmh} км/ч`
			return null
		},
		getPointSpeedValue(point) {
			if (point == null) return 0
			if (point.speedKmh != null && point.speedKmh !== '') {
				const n = Number(point.speedKmh)
				if (!Number.isNaN(n)) return n
			}
			if (point.speed != null && point.speed !== '') {
				const n = parseFloat(String(point.speed).replace(/[^\d.,]/g, '').replace(',', '.'))
				if (!Number.isNaN(n)) return n
			}
			return 0
		},
		lerpAngle(from, to, t) {
			let diff = ((to - from + 540) % 360) - 180
			return (from + diff * t + 360) % 360
		},
		buildTimeline() {
			const points = this.track?.points || []
			this.pointTimes = points.map((p) => this.parsePointTime(p))
			if (points.length < 2) {
				this.totalDuration = 0
				return
			}
			this.totalDuration = Math.max(1, this.pointTimes[this.pointTimes.length - 1] - this.pointTimes[0])
		},
		getStateAtTrackTime(trackTimeMs) {
			const points = this.track.points
			const baseTime = this.pointTimes[0]
			const absoluteTime = baseTime + trackTimeMs

			if (absoluteTime <= this.pointTimes[0]) {
				const p = points[0]
				return {
					lat: p.lat,
					lon: p.lon,
					direction: p.direction ?? 0,
					time: p.timeLocal,
					speed: this.getPointSpeed(p),
					progress: 0,
					segmentIndex: 0,
					segmentT: 0,
				}
			}

			const lastIdx = points.length - 1
			if (absoluteTime >= this.pointTimes[lastIdx]) {
				const p = points[lastIdx]
				return {
					lat: p.lat,
					lon: p.lon,
					direction: p.direction ?? 0,
					time: p.timeLocal,
					speed: this.getPointSpeed(p),
					progress: 1,
					segmentIndex: lastIdx - 1,
					segmentT: 1,
				}
			}

			for (let i = 0; i < lastIdx; i++) {
				const t0 = this.pointTimes[i]
				const t1 = this.pointTimes[i + 1]
				if (absoluteTime >= t0 && absoluteTime <= t1) {
					const segDur = Math.max(1, t1 - t0)
					const t = (absoluteTime - t0) / segDur
					const p0 = points[i]
					const p1 = points[i + 1]
					const d0 = p0.direction ?? 0
					const d1 = p1.direction ?? d0
					return {
						lat: p0.lat + (p1.lat - p0.lat) * t,
						lon: p0.lon + (p1.lon - p0.lon) * t,
						direction: this.lerpAngle(d0, d1, t),
						time: p0.timeLocal,
						speed: this.getPointSpeed(t >= 0.5 ? p1 : p0),
						progress: trackTimeMs / this.totalDuration,
						segmentIndex: i,
						segmentT: t,
					}
				}
			}

			const p = points[lastIdx]
			return {
				lat: p.lat,
				lon: p.lon,
				direction: p.direction ?? 0,
				time: p.timeLocal,
				speed: this.getPointSpeed(p),
				progress: 1,
				segmentIndex: lastIdx - 1,
				segmentT: 1,
			}
		},
		getProgressLatLngs(state) {
			const points = this.track.points
			const latLngs = []
			for (let i = 0; i <= state.segmentIndex; i++)
				latLngs.push([points[i].lat, points[i].lon])

			const p0 = points[state.segmentIndex]
			const p1 = points[state.segmentIndex + 1]
			if (p1 && state.segmentT > 0)
				latLngs.push([
					p0.lat + (p1.lat - p0.lat) * state.segmentT,
					p0.lon + (p1.lon - p0.lon) * state.segmentT,
				])

			return latLngs
		},
		updateVehicleRotation(direction) {
			const el = this.vehicleMarker?.getElement()?.querySelector('.vehicle-arrow')
			if (el)
				el.style.transform = `rotate(${direction}deg)`
		},
		applyPlaybackState(trackTimeMs) {
			if (!this.track?.points?.length) return

			this.playbackTrackTime = Math.max(0, Math.min(this.totalDuration, trackTimeMs))
			const state = this.getStateAtTrackTime(this.playbackTrackTime)

			this.playbackInfo = {
				time: state.time,
				speed: state.speed,
			}

			if (!this.scrubbing)
				this.scrubberValue = Math.round(state.progress * 1000)

			const latLngs = this.getProgressLatLngs(state)
			if (this.progressLine)
				this.progressLine.setLatLngs(latLngs)

			if (this.vehicleMarker) {
				this.vehicleMarker.setLatLng([state.lat, state.lon])
				this.updateVehicleRotation(state.direction)
			}
		},
		handleMapResize() {
			if (this.map)
				this.map.invalidateSize()
			if (this.playbackActive)
				this.drawSpeedChart()
		},
		drawSpeedChart() {
			const canvas = this.$refs.speedChartCanvas
			if (!canvas || !this.playbackActive || !this.track?.points?.length) return

			const wrap = canvas.parentElement
			if (!wrap) return

			const width = wrap.clientWidth
			const height = wrap.clientHeight || CHART_HEIGHT
			if (width <= 0 || height <= 0) return

			const chartSpeedMax = this.chartSpeedMax
			const dpr = window.devicePixelRatio || 1
			canvas.width = Math.round(width * dpr)
			canvas.height = Math.round(height * dpr)
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`

			const ctx = canvas.getContext('2d')
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, width, height)

			const padY = 0
			const chartH = height - padY * 2
			const baseTime = this.pointTimes[0]
			const duration = this.totalDuration || 1

			const speedToY = (speed) =>
				padY + chartH - (Math.min(speed, chartSpeedMax) / chartSpeedMax) * chartH

			ctx.strokeStyle = 'rgba(139, 156, 179, 0.2)'
			ctx.lineWidth = 1
			for (let v = CHART_SPEED_GRID; v <= chartSpeedMax; v += CHART_SPEED_GRID) {
				const y = speedToY(v)
				ctx.beginPath()
				ctx.moveTo(0, y)
				ctx.lineTo(width, y)
				ctx.stroke()
			}

			const points = this.track.points
			const speeds = points.map((p) => this.getPointSpeedValue(p))
			const coords = points.map((p, i) => ({
				x: ((this.pointTimes[i] - baseTime) / duration) * width,
				y: speedToY(speeds[i]),
			}))

			if (coords.length < 2) return

			ctx.beginPath()
			ctx.moveTo(coords[0].x, height - padY)
			ctx.lineTo(coords[0].x, coords[0].y)
			for (let i = 1; i < coords.length; i++)
				ctx.lineTo(coords[i].x, coords[i].y)
			ctx.lineTo(coords[coords.length - 1].x, height - padY)
			ctx.closePath()
			ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
			ctx.fill()

			ctx.beginPath()
			ctx.moveTo(coords[0].x, coords[0].y)
			for (let i = 1; i < coords.length; i++)
				ctx.lineTo(coords[i].x, coords[i].y)
			ctx.strokeStyle = '#3b82f6'
			ctx.lineWidth = 1.5
			ctx.stroke()
		},
		seekChartFromEvent(clientX, targetEl) {
			const rect = targetEl.getBoundingClientRect()
			if (!rect.width) return

			const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
			this.scrubberValue = Math.round(progress * 1000)
			this.applyPlaybackState(progress * this.totalDuration)
		},
		onChartPointerDown(e) {
			this.chartDragging = true
			this.seekChartFromEvent(e.clientX, e.currentTarget)
			window.addEventListener('mousemove', this.onChartPointerMove)
			window.addEventListener('mouseup', this.onChartPointerUp)
		},
		onChartPointerMove(e) {
			if (!this.chartDragging) return
			const plot = this.$refs.speedChartCanvas?.parentElement
			if (plot)
				this.seekChartFromEvent(e.clientX, plot)
		},
		onChartPointerUp() {
			this.chartDragging = false
			this.unbindChartDrag()
			if (this.playbackTrackTime >= this.totalDuration) {
				this.stopPlaybackLoop()
				this.playing = false
			}
		},
		onChartTouchStart(e) {
			const touch = e.touches[0]
			if (!touch) return
			this.chartDragging = true
			this.seekChartFromEvent(touch.clientX, e.currentTarget)
			window.addEventListener('touchmove', this.onChartTouchMove, { passive: false })
			window.addEventListener('touchend', this.onChartTouchEnd)
		},
		onChartTouchMove(e) {
			if (!this.chartDragging) return
			e.preventDefault()
			const touch = e.touches[0]
			const plot = this.$refs.speedChartCanvas?.parentElement
			if (touch && plot)
				this.seekChartFromEvent(touch.clientX, plot)
		},
		onChartTouchEnd() {
			this.chartDragging = false
			window.removeEventListener('touchmove', this.onChartTouchMove)
			window.removeEventListener('touchend', this.onChartTouchEnd)
			if (this.playbackTrackTime >= this.totalDuration) {
				this.stopPlaybackLoop()
				this.playing = false
			}
		},
		unbindChartDrag() {
			window.removeEventListener('mousemove', this.onChartPointerMove)
			window.removeEventListener('mouseup', this.onChartPointerUp)
			window.removeEventListener('touchmove', this.onChartTouchMove)
			window.removeEventListener('touchend', this.onChartTouchEnd)
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

			this.staticLayer = L.layerGroup().addTo(this.map)
			this.playbackLayer = L.layerGroup().addTo(this.map)
			this.$nextTick(() => this.handleMapResize())
		},
		goBack() {
			this.$router.push({ name: 'devices' })
		},
		stopPlaybackLoop() {
			if (this.animFrameId) {
				cancelAnimationFrame(this.animFrameId)
				this.animFrameId = null
			}
			this.playing = false
			this.lastFrameTime = 0
		},
		resetPlaybackLayers() {
			this.stopPlaybackLoop()
			this.playbackLayer?.clearLayers()
			this.progressLine = null
			this.vehicleMarker = null
			this.playbackActive = false
			this.playbackInfo = null
			this.playbackTrackTime = 0
			this.scrubberValue = 0
			this.scrubbing = false
		},
		openPlayback() {
			if (!this.track?.points?.length) return

			this.buildTimeline()
			this.playbackActive = true
			this.playbackTrackTime = 0
			this.playing = true
			this.scrubberValue = 0

			this.playbackLayer.clearLayers()

			this.progressLine = L.polyline([], {
				color: '#3b82f6',
				weight: 5,
				opacity: 0.95,
			}).addTo(this.playbackLayer)

			this.vehicleMarker = L.marker(this.track.points[0], { icon: vehicleIcon, zIndexOffset: 1000 })
				.addTo(this.playbackLayer)

			this.applyPlaybackState(0)
			this.lastFrameTime = 0
			this.animFrameId = requestAnimationFrame((ts) => this.tick(ts))
			this.$nextTick(() => {
				this.drawSpeedChart()
				this.handleMapResize()
			})
		},
		closePlayback() {
			this.unbindChartDrag()
			this.resetPlaybackLayers()
			this.$nextTick(() => this.handleMapResize())
		},
		togglePlay() {
			if (!this.playbackActive) return

			if (this.playing) {
				this.stopPlaybackLoop()
				return
			}

			if (this.playbackTrackTime >= this.totalDuration)
				this.playbackTrackTime = 0

			this.playing = true
			this.lastFrameTime = 0
			this.animFrameId = requestAnimationFrame((ts) => this.tick(ts))
		},
		tick(timestamp) {
			if (!this.playing || !this.playbackActive) return

			if (!this.lastFrameTime)
				this.lastFrameTime = timestamp

			const deltaRealSec = (timestamp - this.lastFrameTime) / 1000
			this.lastFrameTime = timestamp

			const deltaTrackMs = deltaRealSec * this.playbackSpeed * 1000
			let nextTime = this.playbackTrackTime + deltaTrackMs

			if (nextTime >= this.totalDuration) {
				nextTime = this.totalDuration
				this.applyPlaybackState(nextTime)
				this.stopPlaybackLoop()
				return
			}

			this.applyPlaybackState(nextTime)
			this.animFrameId = requestAnimationFrame((ts) => this.tick(ts))
		},
		async loadTrack() {
			this.loading = true
			this.error = ''
			this.resetPlaybackLayers()

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
			if (!this.map || !this.staticLayer) return

			this.staticLayer.clearLayers()
			this.resetPlaybackLayers()

			const points = this.track?.points || []
			if (!points.length) {
				this.error = 'Нет точек за выбранный период'
				return
			}

			this.buildTimeline()
			const latLngs = points.map((p) => [p.lat, p.lon])

			this.backgroundLine = L.polyline(latLngs, {
				color: '#64748b',
				weight: 4,
				opacity: 0.45,
			})
			this.staticLayer.addLayer(this.backgroundLine)

			const first = points[0]
			const last = points[points.length - 1]

			L.marker([first.lat, first.lon], { icon: startIcon })
				.bindPopup(this.pointPopup(first, 'Старт'))
				.addTo(this.staticLayer)

			L.marker([last.lat, last.lon], { icon: endIcon })
				.bindPopup(this.pointPopup(last, 'Финиш'))
				.addTo(this.staticLayer)

			this.$nextTick(() => {
				this.handleMapResize()
				this.map.fitBounds(this.backgroundLine.getBounds(), { padding: [40, 40] })
			})
		},
		pointPopup(point, label) {
			const title = label ? `<strong>${label}</strong><br>` : ''
			const speed = this.getPointSpeed(point) ?? '—'
			return `${title}${point.timeLocal}<br>Скорость: ${speed}<br>Высота: ${point.alt ?? '—'} м`
		},
	},
}
</script>

<style scoped>
.map-leaflet {
	height: 100%;
	width: 100%;
}

.map-leaflet :deep(.leaflet-container) {
	height: 100%;
	width: 100%;
	background: #1a2332;
	font-family: inherit;
}

.map-leaflet :deep(.vehicle-marker) {
	background: transparent;
	border: none;
}

.map-leaflet :deep(.vehicle-arrow) {
	display: flex;
	align-items: center;
	justify-content: center;
	transform-origin: center center;
	filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
}
</style>
