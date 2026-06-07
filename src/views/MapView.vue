<template>
	<div class="map-page">
		<header class="map-toolbar">
			<div class="map-bar map-toolbar-desktop">
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

				<button class="btn btn-primary btn-compact" type="button" :disabled="loading" @click="applyTrack">
					{{ loading ? '…' : 'Обновить' }}
				</button>

				<button
					class="btn btn-compact"
					:class="geozonesVisible ? 'btn-primary' : 'btn-secondary'"
					type="button"
					@click="toggleGeozonesVisible"
				>
					⬡ Геозоны
				</button>

				<button
					v-if="geozonesVisible && !geozoneDrawingMode"
					class="btn btn-secondary btn-compact geozone-add-btn"
					type="button"
					title="Добавить геозону"
					@click="startAddGeozone"
				>+</button>

				<div
					v-if="geozonesVisible && selectedGeozone && !geozoneDrawingMode"
					class="geozone-toolbar-panel geozone-toolbar-panel--desktop"
				>
					<span class="geozone-selected-name">{{ selectedGeozone.name }}</span>
					<button class="btn btn-ghost btn-compact geozone-delete-btn" type="button" @click="removeGeozone(selectedGeozone.id)">
						🗑 Удалить
					</button>
				</div>

				<div v-if="geozoneDrawingMode" class="geozone-toolbar-panel geozone-toolbar-panel--desktop">
					<input
						v-model="geozoneDraftName"
						class="map-input geozone-name-input"
						type="text"
						placeholder="Название геозоны"
						maxlength="64"
					/>
					<span class="geozone-edit-hint">{{ geozoneEditHintText }}</span>
					<button
						v-if="geozoneAdding"
						class="btn btn-secondary btn-compact"
						type="button"
						:disabled="!geozoneDraftPoints.length"
						@click="undoGeozonePoint"
					>↩</button>
					<button class="btn btn-primary btn-compact" type="button" :disabled="!canSaveGeozone" @click="saveGeozone">
						{{ geozoneEditingId ? 'Сохранить' : 'Создать' }}
					</button>
					<button class="btn btn-ghost btn-compact" type="button" @click="cancelGeozoneDraw">Отмена</button>
				</div>

				<div v-if="track" class="map-bar-meta">
					<span class="map-bar-meta-name">{{ track.deviceName }} · {{ track.deviceId }}</span>
				</div>
			</div>

			<div class="map-toolbar-mobile">
				<div class="map-toolbar-bar">
					<button
						class="map-toolbar-toggle"
						type="button"
						:aria-label="menuOpen ? 'Закрыть меню' : 'Открыть меню'"
						:aria-expanded="menuOpen"
						@click="toggleMenu"
					>
						{{ menuOpen ? '✕' : '☰' }}
					</button>
					<span v-if="track" class="map-toolbar-title">{{ track.deviceName }} · {{ track.deviceId }}</span>
					<span v-else class="map-toolbar-title">Карта</span>
				</div>

				<div class="map-toolbar-drawer" :class="{ 'map-toolbar-drawer--open': menuOpen }">
					<div class="map-toolbar-drawer-inner">
						<button class="btn btn-ghost map-toolbar-nav" type="button" @click="goBack">← К устройствам</button>

						<div class="map-toolbar-filters">
							<div class="map-toolbar-field">
								<label for="from-mobile">Период с</label>
								<input
									id="from-mobile"
									v-model="from"
									class="map-input map-input-date"
									type="datetime-local"
									:disabled="loading"
								/>
							</div>
							<div class="map-toolbar-field">
								<label for="to-mobile">Период по</label>
								<input
									id="to-mobile"
									v-model="to"
									class="map-input map-input-date"
									type="datetime-local"
									:disabled="loading"
								/>
							</div>
						</div>

						<button class="btn btn-primary" type="button" :disabled="loading" @click="applyTrack">
							{{ loading ? 'Обновление…' : 'Обновить' }}
						</button>

						<div class="map-toolbar-section">
							<div class="map-toolbar-section-title">Геозоны</div>
							<button
								class="btn"
								:class="geozonesVisible ? 'btn-primary' : 'btn-secondary'"
								type="button"
								@click="toggleGeozonesVisible"
							>
								{{ geozonesVisible ? '⬡ Геозоны включены' : '⬡ Показать геозоны' }}
							</button>
							<button
								v-if="geozonesVisible && !geozoneDrawingMode"
								class="btn btn-secondary"
								type="button"
								@click="startAddGeozone"
							>+ Добавить геозону</button>
							<div
								v-if="geozonesVisible && selectedGeozone && !geozoneDrawingMode"
								class="geozone-mobile-selected"
							>
								<div class="geozone-selected-name">{{ selectedGeozone.name }}</div>
								<button class="btn btn-ghost geozone-delete-btn" type="button" @click="removeGeozone(selectedGeozone.id)">
									🗑 Удалить
								</button>
							</div>
							<template v-if="geozoneDrawingMode">
								<div class="map-toolbar-field">
									<label for="geozone-name-mobile">Название</label>
									<input
										id="geozone-name-mobile"
										v-model="geozoneDraftName"
										class="map-input"
										type="text"
										placeholder="Название геозоны"
										maxlength="64"
									/>
								</div>
								<p class="geozone-edit-hint">{{ geozoneEditHintText }}</p>
								<div class="geozone-toolbar-actions">
									<button
										v-if="geozoneAdding"
										class="btn btn-secondary"
										type="button"
										:disabled="!geozoneDraftPoints.length"
										@click="undoGeozonePoint"
									>↩ Отменить точку</button>
									<button class="btn btn-primary" type="button" :disabled="!canSaveGeozone" @click="saveGeozone">
										{{ geozoneEditingId ? 'Сохранить изменения' : 'Сохранить' }}
									</button>
									<button class="btn btn-ghost" type="button" @click="cancelGeozoneDraw">Отмена</button>
								</div>
							</template>
							<ul v-if="geozonesVisible && geofences.length" class="geozone-list">
								<li v-for="zone in geofences" :key="zone.id" class="geozone-list-item">
									<button
										class="geozone-list-name"
										:class="{ 'geozone-list-name--active': selectedGeozone?.id === zone.id }"
										type="button"
										@click="selectGeozone(zone)"
									>{{ zone.name }}</button>
								</li>
							</ul>
						</div>

						<div v-if="hasTrack" class="map-toolbar-section">
							<div class="map-toolbar-section-title">Проигрывание</div>

							<button
								class="btn btn-secondary map-toolbar-play-btn"
								type="button"
								@click="togglePlay"
							>
								{{ playing ? '⏸ Пауза' : '▶ Пуск' }}
							</button>

							<div class="map-toolbar-field">
								<label for="playback-speed-mobile">Скорость · {{ speedLabel }}</label>
								<input
									id="playback-speed-mobile"
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
		</header>

		<div class="map-body">
			<div v-if="menuOpen" class="map-toolbar-backdrop" @click="closeMenu"></div>

			<p v-if="error" class="map-error">{{ error }}</p>

			<div class="map-container">
				<div ref="mapEl" class="map-leaflet"></div>

				<div v-if="hasTrack && playbackInfo" class="playback-info">
					<div class="playback-info-time">{{ playbackInfo.time }}</div>
					<div v-if="playbackInfo.speed" class="playback-info-speed">{{ playbackInfo.speed }}</div>
					<div v-if="playbackInfo.geofences && playbackInfo.geofences !== '—'" class="playback-info-geofences">
						⬡ {{ playbackInfo.geofences }}
					</div>
				</div>
			</div>

			<div v-if="hasTrack" class="speed-chart-panel">
				<div class="playback-main">
					<div class="playback-chart-body">
						<div class="playback-chart-y-axis">
							<span
								v-for="v in speedAxisLabels"
								:key="v"
								class="playback-chart-y-label"
							>{{ v }}</span>
						</div>
						<div class="playback-chart-plot-column">
							<div
								class="playback-chart-speed-area"
								@mousedown.prevent="onChartPointerDown"
								@touchstart.prevent="onChartTouchStart"
							>
								<canvas ref="speedChartCanvas" class="playback-chart-canvas"></canvas>
								<div class="playback-chart-cursor" :style="{ left: chartCursorLeft }"></div>
							</div>
							<div class="playback-chart-x-axis">
								<span
									v-for="tick in timeAxisTicks"
									:key="tick.time"
									class="playback-chart-x-label"
									:style="tick.style"
								>{{ tick.label }}</span>
							</div>
						</div>
					</div>

					<div class="playback-controls playback-controls--desktop">
						<button
							class="playback-btn"
							type="button"
							:aria-label="playing ? 'Пауза' : 'Пуск'"
							@click="togglePlay"
						>
							{{ playing ? '⏸' : '▶' }}
						</button>

						<div class="playback-speed">
							<span class="playback-speed-label">{{ speedLabel }}</span>
							<input
								id="playback-speed-desktop"
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
import { getTrack, getGeofences, createGeofence, updateGeofence, deleteGeofence } from '@/api/client'

const PLAYBACK_SPEED_MIN = 60
const PLAYBACK_SPEED_MAX = 10800
const MIN_GEOZONE_POINTS = 4
const MAX_GEOZONE_POINTS = 8

const GEOZONE_COLORS = ['#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const CHART_SPEED_CAP = 180
const CHART_SPEED_FLOOR = 60
const CHART_SPEED_GRID = 20
const CHART_HEIGHT = 88
const CHART_TIME_AXIS_HEIGHT = 16

const TIME_AXIS_STEPS_MS = [
	3600000,
	3 * 3600000,
	6 * 3600000,
	12 * 3600000,
	86400000,
	3 * 86400000,
	7 * 86400000,
	14 * 86400000,
	30 * 86400000,
	90 * 86400000,
]

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

const GEOZONE_EDGE_HIT_PX = 14
const GEOZONE_POINT_RADIUS = 7
const GEOZONE_POINT_HIT_RADIUS = 14
const GEOZONE_LABEL_GAP = 6

function createGeozoneDraftPointsCanvasLayer(vm) {
	return L.Layer.extend({
		onAdd(map) {
			this._map = map
			this._vm = vm
			this._canvas = L.DomUtil.create('canvas', 'geozone-draft-points-canvas')
			this._canvas.style.pointerEvents = 'none'
			map.getPanes().markerPane.appendChild(this._canvas)
			this._canvas.style.zIndex = '700'
			this._draw = this._draw.bind(this)
			map.on('move zoom moveend zoomend viewreset resize', this._draw, this)
			this._draw()
		},
		onRemove(map) {
			map.off('move zoom moveend zoomend viewreset resize', this._draw, this)
			L.DomUtil.remove(this._canvas)
			this._canvas = null
		},
		redraw() {
			this._draw()
		},
		_draw() {
			if (!this._map || !this._canvas)
				return

			const vm = this._vm
			const map = this._map
			const points = vm.geozoneDraftPoints
			const size = map.getSize()
			const topLeft = map.containerPointToLayerPoint(L.point(0, 0))

			L.DomUtil.setPosition(this._canvas, topLeft)

			const dpr = window.devicePixelRatio || 1
			this._canvas.width = Math.max(1, Math.round(size.x * dpr))
			this._canvas.height = Math.max(1, Math.round(size.y * dpr))
			this._canvas.style.width = `${size.x}px`
			this._canvas.style.height = `${size.y}px`

			const ctx = this._canvas.getContext('2d')
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, size.x, size.y)

			if (!points.length)
				return

			const color = vm.geozoneEditingId != null ? '#f59e0b' : '#3b82f6'

			points.forEach((point, index) => {
				const layerPt = map.latLngToLayerPoint([point.lat, point.lon])
				const x = layerPt.x - topLeft.x
				const y = layerPt.y - topLeft.y
				const label = String(index + 1)

				ctx.font = '600 10px Segoe UI, system-ui, sans-serif'
				const textW = ctx.measureText(label).width
				const padX = 4
				const labelW = textW + padX * 2
				const labelH = 14
				const labelX = x - labelW / 2
				const labelY = y - GEOZONE_POINT_RADIUS - GEOZONE_LABEL_GAP - labelH

				ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
				ctx.fillRect(labelX, labelY, labelW, labelH)

				ctx.fillStyle = '#f8fafc'
				ctx.textAlign = 'center'
				ctx.textBaseline = 'middle'
				ctx.fillText(label, x, labelY + labelH / 2)

				ctx.beginPath()
				ctx.arc(x, y, GEOZONE_POINT_RADIUS, 0, Math.PI * 2)
				ctx.fillStyle = color
				ctx.fill()
				ctx.lineWidth = 2
				ctx.strokeStyle = '#ffffff'
				ctx.stroke()
			})
		},
	})
}

export default {
	name: 'MapView',
	data() {
		return {
			menuOpen: false,
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
			chartResizeObserver: null,
			chartDrawTimer: null,
			timeAxisTicks: [],
			desktopMenuGuard: null,
			geofences: [],
			geozonesVisible: false,
			geozoneLayer: null,
			geozoneDraftLayer: null,
			geozoneDraftPointsLayer: null,
			geozoneAdding: false,
			geozoneDraftPoints: [],
			geozoneDraftName: '',
			geozoneDraftPolygon: null,
			geozoneDraftMarkers: [],
			geozoneDraftPointsCanvas: null,
			geozoneEditingId: null,
			geozoneEdgeInsertAt: null,
			geozoneEdgeInsertLatLng: null,
			geozoneLastClickId: null,
			geozoneLastClickTime: 0,
			selectedGeozone: null,
			minGeozonePoints: MIN_GEOZONE_POINTS,
			maxGeozonePoints: MAX_GEOZONE_POINTS,
		}
	},
	computed: {
		deviceId() {
			return this.$route.params.deviceId
		},
		hasTrack() {
			return (this.track?.points?.length || 0) > 0
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
		canSaveGeozone() {
			return this.geozoneDraftName.trim().length > 0 &&
				this.geozoneDraftPoints.length >= MIN_GEOZONE_POINTS &&
				this.geozoneDraftPoints.length <= MAX_GEOZONE_POINTS
		},
		geozoneDrawingMode() {
			return this.geozoneAdding || this.geozoneEditingId != null
		},
		geozoneEditHintText() {
			if (this.geozoneEditingId)
				return `Перетащите точки (${this.geozoneDraftPoints.length}) · линия — новая · двойной клик — удалить`

			return `Кликайте по карте: ${this.geozoneDraftPoints.length} / ${this.maxGeozonePoints} (мин. ${this.minGeozonePoints})`
		},
	},
	watch: {
		hasTrack(ready) {
			if (ready) {
				this.$nextTick(() => {
					this.updateViewportMetrics()
					this.scheduleDrawSpeedChart()
					this.bindChartResizeObserver()
				})
			} else {
				this.unbindChartResizeObserver()
				this.timeAxisTicks = []
			}
		},
	},
	mounted() {
		document.body.classList.add('map-route')
		this.initDefaultDates()
		this.$nextTick(() => {
			this.initMap()
			this.loadGeofences()
			this.loadTrack()
			this.updateViewportMetrics()
		})
		window.addEventListener('resize', this.handleMapResize)
		window.addEventListener('orientationchange', this.onViewportChange)
		window.visualViewport?.addEventListener('resize', this.onViewportChange)
		window.visualViewport?.addEventListener('scroll', this.onViewportChange)
		this.bindDesktopMenuGuard()
	},
	beforeUnmount() {
		document.body.classList.remove('map-route')
		window.removeEventListener('resize', this.handleMapResize)
		window.removeEventListener('orientationchange', this.onViewportChange)
		window.visualViewport?.removeEventListener('resize', this.onViewportChange)
		window.visualViewport?.removeEventListener('scroll', this.onViewportChange)
		this.unbindDesktopMenuGuard()
		this.unbindChartResizeObserver()
		if (this.chartDrawTimer) {
			clearTimeout(this.chartDrawTimer)
			this.chartDrawTimer = null
		}
		this.unbindChartDrag()
		this.clearGeozoneClickTimer()
		this.endGeozonePointDrag()
		this.removeGeozoneDraftPointsCanvas()
		this.clearGeozoneEdgeHover()
		if (this.map) {
			this.map.off('dblclick', this.onMapGeozoneDblClick)
			this.map.doubleClickZoom.enable()
		}
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
						time: t >= 0.5 ? p1.timeLocal : p0.timeLocal,
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
			const points = this.track.points
			const pointIndex = state.segmentT >= 0.5
				? Math.min(points.length - 1, state.segmentIndex + 1)
				: state.segmentIndex

			this.playbackInfo = {
				time: state.time,
				speed: state.speed,
				geofences: this.formatPointGeofences(points[pointIndex]),
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
		applyTrackVisibility() {
			if (!this.map) return

			for (const layer of [this.staticLayer, this.playbackLayer]) {
				if (!layer) continue
				if (!this.map.hasLayer(layer))
					this.map.addLayer(layer)
			}
		},
		handleMapResize() {
			if (window.innerWidth > 768)
				this.closeMenu()
			this.updateViewportMetrics()
		},
		bindDesktopMenuGuard() {
			this.desktopMenuGuard = window.matchMedia('(min-width: 769px)')
			this.desktopMenuGuard.addEventListener('change', this.onDesktopMenuGuard)
		},
		unbindDesktopMenuGuard() {
			this.desktopMenuGuard?.removeEventListener('change', this.onDesktopMenuGuard)
			this.desktopMenuGuard = null
		},
		onDesktopMenuGuard(e) {
			if (e.matches)
				this.closeMenu()
		},
		onViewportChange() {
			this.updateViewportMetrics()
		},
		updateViewportMetrics() {
			const vv = window.visualViewport
			const height = Math.round(vv?.height || window.innerHeight)
			if (height > 0)
				document.documentElement.style.setProperty('--app-height', `${height}px`)

			this.$nextTick(() => {
				const panel = this.$el?.querySelector?.('.speed-chart-panel')
				if (panel) {
					const panelHeight = panel.offsetHeight
					if (panelHeight > 0)
						document.documentElement.style.setProperty('--speed-chart-panel-height', `${panelHeight}px`)
				}

				if (this.map)
					this.map.invalidateSize()
				if (this.hasTrack)
					this.scheduleDrawSpeedChart()
			})
		},
		bindChartResizeObserver() {
			this.unbindChartResizeObserver()
			const plot = this.$refs.speedChartCanvas?.parentElement
			if (!plot || typeof ResizeObserver === 'undefined') return

			this.chartResizeObserver = new ResizeObserver(() => {
				this.scheduleDrawSpeedChart()
			})
			this.chartResizeObserver.observe(plot)
		},
		unbindChartResizeObserver() {
			if (this.chartResizeObserver) {
				this.chartResizeObserver.disconnect()
				this.chartResizeObserver = null
			}
		},
		scheduleDrawSpeedChart() {
			if (this.chartDrawTimer)
				clearTimeout(this.chartDrawTimer)

			this.chartDrawTimer = setTimeout(() => {
				this.chartDrawTimer = null
				this.drawSpeedChart()
			}, 50)
		},
		getTimeAxisFont(plotWidth) {
			const size = plotWidth <= 480 ? 8 : 9
			return `${size}px Segoe UI, system-ui, -apple-system, sans-serif`
		},
		getTimeAxisMinGap(plotWidth) {
			return plotWidth <= 480 ? 36 : 52
		},
		alignTimeTick(time, stepMs) {
			if (stepMs >= 86400000) {
				const d = new Date(time)
				d.setHours(0, 0, 0, 0)
				let t = d.getTime()
				while (t < time)
					t += stepMs
				return t
			}

			if (stepMs >= 3600000) {
				const d = new Date(time)
				d.setMinutes(0, 0, 0)
				const stepHours = stepMs / 3600000
				let hours = d.getHours()
				hours = Math.ceil(hours / stepHours) * stepHours
				if (hours >= 24) {
					d.setDate(d.getDate() + 1)
					hours = 0
				}
				d.setHours(hours)
				let t = d.getTime()
				if (t < time)
					t += stepMs
				return t
			}

			return Math.ceil(time / stepMs) * stepMs
		},
		buildTimeTicks(baseTime, endTime, stepMs) {
			const ticks = []
			let t = this.alignTimeTick(baseTime, stepMs)
			while (t <= endTime) {
				ticks.push(t)
				t += stepMs
			}
			return ticks
		},
		formatTimeAxisLabel(time, stepMs, durationMs) {
			const d = new Date(time)
			const pad = (n) => String(n).padStart(2, '0')

			if (stepMs >= 86400000) {
				if (durationMs > 90 * 86400000)
					return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`
				return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
			}

			return `${pad(d.getHours())}:${pad(d.getMinutes())}`
		},
		timeTicksFit(ticks, baseTime, duration, plotWidth, ctx, stepMs, minGap) {
			if (ticks.length < 2)
				return true

			for (let i = 1; i < ticks.length; i++) {
				const x = ((ticks[i] - baseTime) / duration) * plotWidth
				const prevX = ((ticks[i - 1] - baseTime) / duration) * plotWidth
				const label = this.formatTimeAxisLabel(ticks[i], stepMs, duration)
				const prevLabel = this.formatTimeAxisLabel(ticks[i - 1], stepMs, duration)
				const w = ctx.measureText(label).width
				const prevW = ctx.measureText(prevLabel).width
				if (x - prevX < prevW / 2 + w / 2 + minGap)
					return false
			}

			return true
		},
		getTimeAxisLabelStyle(ratio) {
			if (ratio <= 0.06)
				return { left: `${ratio * 100}%`, transform: 'none' }
			if (ratio >= 0.94)
				return { left: `${ratio * 100}%`, transform: 'translateX(-100%)' }
			return { left: `${ratio * 100}%`, transform: 'translateX(-50%)' }
		},
		computeTimeAxis(plotWidth, ctx) {
			if (!this.hasTrack || plotWidth <= 0 || !ctx) {
				this.timeAxisTicks = []
				return { stepMs: 0, ticks: [] }
			}

			const baseTime = this.pointTimes[0]
			const endTime = baseTime + this.totalDuration
			const duration = this.totalDuration || 1
			const minGap = this.getTimeAxisMinGap(plotWidth)
			const font = this.getTimeAxisFont(plotWidth)

			ctx.save()
			ctx.font = font

			let chosenStep = TIME_AXIS_STEPS_MS[TIME_AXIS_STEPS_MS.length - 1]
			let chosenTicks = []

			for (const stepMs of TIME_AXIS_STEPS_MS) {
				const ticks = this.buildTimeTicks(baseTime, endTime, stepMs)
				if (!ticks.length)
					continue
				if (this.timeTicksFit(ticks, baseTime, duration, plotWidth, ctx, stepMs, minGap)) {
					chosenStep = stepMs
					chosenTicks = ticks
					break
				}
			}

			if (!chosenTicks.length)
				chosenTicks = this.buildTimeTicks(baseTime, endTime, chosenStep)

			this.timeAxisTicks = chosenTicks.map((t) => {
				const ratio = (t - baseTime) / duration
				return {
					time: t,
					label: this.formatTimeAxisLabel(t, chosenStep, duration),
					style: this.getTimeAxisLabelStyle(ratio),
				}
			})

			ctx.restore()
			return { stepMs: chosenStep, ticks: chosenTicks }
		},
		drawSpeedChart(retry = 0) {
			const canvas = this.$refs.speedChartCanvas
			if (!canvas || !this.hasTrack) return

			const wrap = canvas.parentElement
			if (!wrap) return

			const width = wrap.clientWidth
			const height = wrap.clientHeight || CHART_HEIGHT
			if (width <= 0 || height <= 0) {
				if (retry < 8)
					requestAnimationFrame(() => this.drawSpeedChart(retry + 1))
				return
			}

			const chartSpeedMax = this.chartSpeedMax
			const dpr = window.devicePixelRatio || 1
			canvas.width = Math.round(width * dpr)
			canvas.height = Math.round(height * dpr)
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`

			const ctx = canvas.getContext('2d')
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, width, height)

			const timeAxis = this.computeTimeAxis(width, ctx)

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

			for (const t of timeAxis.ticks) {
				const x = ((t - baseTime) / duration) * width
				ctx.beginPath()
				ctx.moveTo(x, padY)
				ctx.lineTo(x, height - padY)
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
			this.geozoneLayer = L.layerGroup().addTo(this.map)
			this.geozoneDraftLayer = L.layerGroup().addTo(this.map)
			this.geozoneDraftPointsLayer = L.layerGroup().addTo(this.map)
			this.map.on('click', this.onMapClick)
			this.updateGeozoneMapInteraction()
			this.$nextTick(() => this.handleMapResize())
		},
		updateGeozoneMapInteraction() {
			if (!this.map) return

			const blockDblClickZoom = this.geozonesVisible || this.geozoneDrawingMode

			if (blockDblClickZoom) {
				this.map.doubleClickZoom.disable()
				this.map.off('dblclick', this.onMapGeozoneDblClick)
				this.map.on('dblclick', this.onMapGeozoneDblClick)
			} else {
				this.map.off('dblclick', this.onMapGeozoneDblClick)
				this.map.doubleClickZoom.enable()
			}
		},
		isPointInGeozone(latlng, points) {
			const x = latlng.lng
			const y = latlng.lat
			let inside = false

			for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
				const xi = points[i].lon
				const yi = points[i].lat
				const xj = points[j].lon
				const yj = points[j].lat
				const intersects = (yi > y) !== (yj > y) &&
					x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

				if (intersects)
					inside = !inside
			}

			return inside
		},
		findGeozoneAt(latlng) {
			if (!this.geozonesVisible || this.geozoneDrawingMode)
				return null

			for (let i = this.geofences.length - 1; i >= 0; i--) {
				const zone = this.geofences[i]
				if (String(this.geozoneEditingId) === String(zone.id))
					continue
				if (!zone.points?.length)
					continue
				if (this.isPointInGeozone(latlng, zone.points))
					return zone
			}

			return null
		},
		onMapGeozoneDblClick(e) {
			if (!this.geozonesVisible || this.geozoneDrawingMode)
				return

			const zone = this.findGeozoneAt(e.latlng)
			if (!zone)
				return

			L.DomEvent.stop(e)
			this.clearGeozoneClickTimer()
			this.geozoneLastClickId = null
			this.geozoneLastClickTime = 0
			this.startEditGeozone(zone)
		},
		onMapClick(e) {
			if (this.geozoneAdding) {
				if (this.geozoneDraftPoints.length >= MAX_GEOZONE_POINTS)
					return

				this.geozoneDraftPoints.push({ lat: e.latlng.lat, lon: e.latlng.lng })
				this.updateGeozoneDraftLayer()
				return
			}

			if (this.geozonesVisible && !this.geozoneDrawingMode)
				this.selectedGeozone = null
		},
		async loadGeofences() {
			try {
				this.geofences = await getGeofences()
				this.renderGeofences()
			} catch (e) {
				if (e.message && e.message.includes('Сессия'))
					this.$router.push({ name: 'login' })
			}
		},
		renderGeofences() {
			if (!this.geozoneLayer)
				return

			this.geozoneLayer.clearLayers()

			if (!this.geozonesVisible)
				return

			this.geofences.forEach((zone, index) => {
				if (!zone.points?.length)
					return

				if (String(this.geozoneEditingId) === String(zone.id))
					return

				const color = GEOZONE_COLORS[index % GEOZONE_COLORS.length]
				const latLngs = zone.points.map((p) => [p.lat, p.lon])
				const isSelected = String(this.selectedGeozone?.id) === String(zone.id)

				const polygon = L.polygon(latLngs, {
					color,
					weight: 2,
					fillColor: color,
					fillOpacity: isSelected ? 0.38 : 0.18,
				})

				polygon.on('click', (e) => {
					this.onGeozonePolygonClick(zone, e)
				})

				polygon.bindTooltip(zone.name, { sticky: true })
				polygon.addTo(this.geozoneLayer)
			})
		},
		clearGeozoneClickTimer() {
			if (this.geozoneClickTimer) {
				clearTimeout(this.geozoneClickTimer)
				this.geozoneClickTimer = null
			}
		},
		onGeozonePolygonClick(zone, e) {
			L.DomEvent.stopPropagation(e)
			if (!this.geozonesVisible || this.geozoneDrawingMode)
				return

			const zoneKey = String(zone.id)
			const now = Date.now()
			const isDoubleClick = this.geozoneLastClickId === zoneKey && (now - this.geozoneLastClickTime) < 500

			this.clearGeozoneClickTimer()

			if (isDoubleClick) {
				this.geozoneLastClickId = null
				this.geozoneLastClickTime = 0
				this.startEditGeozone(zone)
				return
			}

			this.geozoneLastClickId = zoneKey
			this.geozoneLastClickTime = now

			this.geozoneClickTimer = setTimeout(() => {
				this.geozoneClickTimer = null
				this.geozoneLastClickId = null
				this.selectGeozone(zone)
			}, 350)
		},
		selectGeozone(zone) {
			if (!this.geozonesVisible || this.geozoneDrawingMode)
				return

			this.selectedGeozone = zone
			this.renderGeofences()
		},
		startEditGeozone(zone) {
			if (!zone?.points?.length)
				return

			if (String(this.geozoneEditingId) === String(zone.id))
				return

			this.clearGeozoneClickTimer()
			this.geozoneLastClickId = null
			this.stopPlaybackLoop()
			this.geozoneAdding = false
			this.selectedGeozone = null
			this.geozoneEditingId = zone.id
			this.geozoneDraftName = zone.name
			this.geozoneDraftPoints = zone.points.map((p) => ({ lat: p.lat, lon: p.lon }))
			this.renderGeofences()
			this.updateGeozoneDraftLayer({ draggable: true })
			this.updateGeozoneMapInteraction()
			this.closeMenu()
		},
		cancelGeozoneDraw() {
			const editedId = this.geozoneEditingId
			this.resetGeozoneDraft()
			this.geozoneAdding = false
			this.geozoneEditingId = null

			if (editedId)
				this.selectedGeozone = this.geofences.find((z) => z.id === editedId) || null

			this.renderGeofences()
			this.updateGeozoneMapInteraction()
		},
		toggleGeozonesVisible() {
			this.geozonesVisible = !this.geozonesVisible

			if (!this.geozonesVisible) {
				this.clearGeozoneClickTimer()
				this.geozoneLastClickId = null
				this.resetGeozoneDraft()
				this.geozoneAdding = false
				this.geozoneEditingId = null
				this.selectedGeozone = null
				this.geozoneDraftLayer?.clearLayers()
				this.geozoneDraftPointsLayer?.clearLayers()
				this.removeGeozoneDraftPointsCanvas()
			}

			this.renderGeofences()
			this.updateGeozoneMapInteraction()
		},
		startAddGeozone() {
			if (!this.geozonesVisible)
				return

			this.selectedGeozone = null
			this.stopPlaybackLoop()
			this.resetGeozoneDraft()
			this.geozoneEditingId = null
			this.geozoneAdding = true
			this.renderGeofences()
			this.updateGeozoneMapInteraction()
		},
		resetGeozoneDraft() {
			this.endGeozonePointDrag()
			this.clearGeozoneEdgeHover()
			this.geozoneDraftPoints = []
			this.geozoneDraftName = ''
			this.geozoneDraftPolygon = null
			this.geozoneDraftMarkers = []
			this.geozoneDraftLayer?.clearLayers()
			this.geozoneDraftPointsLayer?.clearLayers()
			this.removeGeozoneDraftPointsCanvas()
		},
		removeGeozoneDraftPointsCanvas() {
			if (this.geozoneDraftPointsCanvas && this.map)
				this.map.removeLayer(this.geozoneDraftPointsCanvas)

			this.geozoneDraftPointsCanvas = null
		},
		ensureGeozoneDraftPointsCanvas() {
			if (!this.map || this.geozoneDraftPointsCanvas)
				return

			const LayerClass = createGeozoneDraftPointsCanvasLayer(this)
			this.geozoneDraftPointsCanvas = new LayerClass()
			this.geozoneDraftPointsCanvas.addTo(this.map)
		},
		redrawGeozoneDraftPoints() {
			this.geozoneDraftPointsCanvas?.redraw()
		},
		endGeozonePointDrag() {
			if (!this.map) return

			this.map.dragging.enable()
			this.map.off('mousemove', this.onGeozonePointDragMove)
			this.map.off('mouseup', this.onGeozonePointDragEnd)
			this.map.off('touchmove', this.onGeozonePointDragMove)
			this.map.off('touchend', this.onGeozonePointDragEnd)
			this._geozoneDragPointIndex = null
			this._geozoneDragHitArea = null
		},
		createGeozoneDraftPointHitArea(point, index) {
			const hitArea = L.circleMarker([point.lat, point.lon], {
				radius: GEOZONE_POINT_HIT_RADIUS,
				fillColor: '#000000',
				fillOpacity: 0,
				stroke: false,
				interactive: true,
				pane: 'markerPane',
			})

			this.bindGeozonePointDrag(hitArea, index)
			return hitArea
		},
		deleteGeozoneDraftPoint(index) {
			if (this.geozoneEditingId == null)
				return

			if (this.geozoneDraftPoints.length <= MIN_GEOZONE_POINTS) {
				this.error = `Нельзя удалить: минимум ${MIN_GEOZONE_POINTS} точки`
				return
			}

			this._geozonePointClickIndex = null
			this.endGeozonePointDrag()
			this.geozoneDraftPoints.splice(index, 1)
			this.updateGeozoneDraftLayer({ draggable: true })
		},
		bindGeozonePointDrag(hitArea, index) {
			hitArea.on('click', (e) => {
				L.DomEvent.stopPropagation(e)
				if (this.geozoneEditingId == null)
					return

				if (this._geozonePointDidDrag) {
					this._geozonePointDidDrag = false
					return
				}

				const now = Date.now()
				const isDoubleClick = this._geozonePointClickIndex === index &&
					(now - this._geozonePointClickTime) < 450

				if (isDoubleClick) {
					this._geozonePointClickIndex = null
					this.deleteGeozoneDraftPoint(index)
					return
				}

				this._geozonePointClickIndex = index
				this._geozonePointClickTime = now
			})

			const startDrag = (e) => {
				L.DomEvent.stopPropagation(e)
				if (e.originalEvent?.button != null && e.originalEvent.button !== 0)
					return

				const startX = e.originalEvent.clientX
				const startY = e.originalEvent.clientY
				let dragging = false

				const onMove = (moveEvent) => {
					if (dragging)
						return

					const moveX = moveEvent.clientX ?? moveEvent.touches?.[0]?.clientX
					const moveY = moveEvent.clientY ?? moveEvent.touches?.[0]?.clientY
					if (moveX == null || moveY == null)
						return

					if (Math.hypot(moveX - startX, moveY - startY) < 5)
						return

					dragging = true
					this._geozonePointDidDrag = true
					cleanup()
					this.beginGeozonePointDrag(index, hitArea)
				}

				const onUp = () => cleanup()

				const cleanup = () => {
					window.removeEventListener('mousemove', onMove)
					window.removeEventListener('mouseup', onUp)
					window.removeEventListener('touchmove', onMove)
					window.removeEventListener('touchend', onUp)
				}

				window.addEventListener('mousemove', onMove)
				window.addEventListener('mouseup', onUp)
				window.addEventListener('touchmove', onMove, { passive: false })
				window.addEventListener('touchend', onUp)
			}

			hitArea.on('mousedown', startDrag)
			hitArea.on('touchstart', startDrag)
		},
		beginGeozonePointDrag(index, hitArea) {
			this.endGeozonePointDrag()
			this.map.dragging.disable()
			this._geozoneDragPointIndex = index
			this._geozoneDragHitArea = hitArea
			this.map.getContainer().classList.add('map-geozone-point-drag')

			this.map.on('mousemove', this.onGeozonePointDragMove)
			this.map.on('mouseup', this.onGeozonePointDragEnd)
			this.map.on('touchmove', this.onGeozonePointDragMove)
			this.map.on('touchend', this.onGeozonePointDragEnd)
		},
		onGeozonePointDragMove(e) {
			if (this._geozoneDragHitArea == null)
				return

			if (e.originalEvent?.touches?.length)
				L.DomEvent.preventDefault(e.originalEvent)

			const latlng = e.latlng
			if (!latlng)
				return

			this._geozoneDragHitArea.setLatLng(latlng)
			const index = this._geozoneDragPointIndex
			this.geozoneDraftPoints[index] = { lat: latlng.lat, lon: latlng.lng }
			this.updateGeozoneDraftPolygon(this.geozoneEditingId != null, { skipRecreate: true })
			this.redrawGeozoneDraftPoints()
		},
		onGeozonePointDragEnd() {
			this.map?.getContainer()?.classList.remove('map-geozone-point-drag')
			this.endGeozonePointDrag()
		},
		clearGeozoneEdgeHover() {
			this.geozoneEdgeInsertAt = null
			this.geozoneEdgeInsertLatLng = null
			this.map?.getContainer()?.classList.remove('map-geozone-edge-add')
		},
		closestPointOnSegment(p, a, b) {
			const dx = b.x - a.x
			const dy = b.y - a.y
			if (dx === 0 && dy === 0)
				return { dist: p.distanceTo(a), point: a }

			let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
			t = Math.max(0, Math.min(1, t))
			const proj = L.point(a.x + t * dx, a.y + t * dy)
			return { dist: p.distanceTo(proj), point: proj }
		},
		findNearestGeozoneEdge(latlng) {
			if (!this.map || this.geozoneDraftPoints.length < 2)
				return null

			const clickPt = this.map.latLngToLayerPoint(latlng)
			let bestDist = Infinity
			let bestIndex = null
			let bestLatLng = null
			const count = this.geozoneDraftPoints.length

			for (let i = 0; i < count; i++) {
				const j = (i + 1) % count
				const a = this.map.latLngToLayerPoint([
					this.geozoneDraftPoints[i].lat,
					this.geozoneDraftPoints[i].lon,
				])
				const b = this.map.latLngToLayerPoint([
					this.geozoneDraftPoints[j].lat,
					this.geozoneDraftPoints[j].lon,
				])
				const hit = this.closestPointOnSegment(clickPt, a, b)
				if (hit.dist < bestDist) {
					bestDist = hit.dist
					bestIndex = i
					bestLatLng = this.map.layerPointToLatLng(hit.point)
				}
			}

			if (bestDist > GEOZONE_EDGE_HIT_PX)
				return null

			return { index: bestIndex, latlng: bestLatLng }
		},
		onGeozonePolygonMouseMove(e) {
			if (this.geozoneEditingId == null)
				return

			if (this.geozoneDraftPoints.length >= MAX_GEOZONE_POINTS) {
				this.clearGeozoneEdgeHover()
				return
			}

			const hit = this.findNearestGeozoneEdge(e.latlng)
			if (!hit) {
				this.clearGeozoneEdgeHover()
				return
			}

			this.geozoneEdgeInsertAt = hit.index
			this.geozoneEdgeInsertLatLng = hit.latlng
			this.map.getContainer().classList.add('map-geozone-edge-add')
		},
		onGeozonePolygonMouseOut() {
			this.clearGeozoneEdgeHover()
		},
		onGeozonePolygonClick(e) {
			if (this.geozoneEditingId == null)
				return

			if (this.geozoneEdgeInsertAt == null || !this.geozoneEdgeInsertLatLng)
				return

			if (this.geozoneDraftPoints.length >= MAX_GEOZONE_POINTS)
				return

			L.DomEvent.stopPropagation(e)
			const insertAt = this.geozoneEdgeInsertAt + 1
			this.geozoneDraftPoints.splice(insertAt, 0, {
				lat: this.geozoneEdgeInsertLatLng.lat,
				lon: this.geozoneEdgeInsertLatLng.lng,
			})
			this.clearGeozoneEdgeHover()
			this.updateGeozoneDraftLayer({ draggable: true })
		},
		bindGeozonePolygonEditEvents(polygon) {
			polygon.on('mousemove', this.onGeozonePolygonMouseMove)
			polygon.on('mouseout', this.onGeozonePolygonMouseOut)
			polygon.on('click', this.onGeozonePolygonClick)
		},
		updateGeozoneDraftPolygon(isEditing, options = {}) {
			if (this.geozoneDraftPoints.length < 2)
				return

			const latLngs = this.geozoneDraftPoints.map((p) => [p.lat, p.lon])

			if (this.geozoneDraftPolygon && options.skipRecreate) {
				this.geozoneDraftPolygon.setLatLngs(latLngs)
				return
			}

			if (this.geozoneDraftPolygon) {
				this.geozoneDraftPolygon.off('mousemove', this.onGeozonePolygonMouseMove)
				this.geozoneDraftPolygon.off('mouseout', this.onGeozonePolygonMouseOut)
				this.geozoneDraftPolygon.off('click', this.onGeozonePolygonClick)
				this.geozoneDraftLayer.removeLayer(this.geozoneDraftPolygon)
				this.geozoneDraftPolygon = null
			}

			this.geozoneDraftPolygon = L.polygon(latLngs, {
				color: isEditing ? '#f59e0b' : '#3b82f6',
				weight: isEditing ? 4 : 2,
				dashArray: isEditing ? null : '6 4',
				fillColor: isEditing ? '#f59e0b' : '#3b82f6',
				fillOpacity: isEditing ? 0.2 : 0.12,
			}).addTo(this.geozoneDraftLayer)

			if (isEditing)
				this.bindGeozonePolygonEditEvents(this.geozoneDraftPolygon)
		},
		updateGeozoneDraftLayer(options = {}) {
			if (!this.geozoneDraftLayer)
				return

			const draggable = options.draggable === true || this.geozoneEditingId != null

			this.endGeozonePointDrag()
			this.clearGeozoneEdgeHover()
			this.geozoneDraftLayer.clearLayers()
			this.geozoneDraftPointsLayer?.clearLayers()
			this.geozoneDraftMarkers = []
			this.geozoneDraftPolygon = null

			this.updateGeozoneDraftPolygon(draggable)

			if (this.geozoneDraftPoints.length) {
				this.ensureGeozoneDraftPointsCanvas()
				this.redrawGeozoneDraftPoints()
			} else {
				this.removeGeozoneDraftPointsCanvas()
			}

			if (draggable) {
				this.geozoneDraftPoints.forEach((point, index) => {
					const hitArea = this.createGeozoneDraftPointHitArea(point, index)
					hitArea.addTo(this.geozoneDraftPointsLayer)
					hitArea.bringToFront()
					this.geozoneDraftMarkers.push(hitArea)
				})
			}
		},
		undoGeozonePoint() {
			if (!this.geozoneDraftPoints.length)
				return

			this.geozoneDraftPoints.pop()
			this.updateGeozoneDraftLayer()
		},
		async saveGeozone() {
			if (!this.canSaveGeozone)
				return

			const payload = {
				name: this.geozoneDraftName.trim(),
				points: this.geozoneDraftPoints.map((p) => ({ lat: p.lat, lon: p.lon })),
			}
			const savedId = this.geozoneEditingId

			try {
				if (this.geozoneEditingId)
					await updateGeofence(this.geozoneEditingId, payload)
				else
					await createGeofence(payload)

				this.geozoneEditingId = null
				this.geozoneAdding = false
				this.resetGeozoneDraft()
				await this.loadGeofences()

				if (savedId)
					this.selectedGeozone = this.geofences.find((z) => String(z.id) === String(savedId)) || null
				else
					this.selectedGeozone = null

				this.renderGeofences()
				this.closeMenu()
				this.updateGeozoneMapInteraction()
			} catch (e) {
				this.error = e.message || 'Не удалось сохранить геозону'
			}
		},
		async removeGeozone(id) {
			if (!window.confirm('Удалить геозону?'))
				return

			try {
				if (this.geozoneEditingId === id)
					this.cancelGeozoneDraw()

				if (this.selectedGeozone?.id === id)
					this.selectedGeozone = null

				await deleteGeofence(id)
				await this.loadGeofences()
			} catch (e) {
				this.error = e.message || 'Не удалось удалить геозону'
			}
		},
		formatPointGeofences(point) {
			const names = point?.geofences
			if (!names?.length)
				return '—'

			return names.join(', ')
		},
		goBack() {
			this.closeMenu()
			this.$router.push({ name: 'devices' })
		},
		toggleMenu() {
			this.menuOpen = !this.menuOpen
		},
		closeMenu() {
			this.menuOpen = false
		},
		async applyTrack() {
			await this.loadTrack()
			this.closeMenu()
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
			this.playbackInfo = null
			this.playbackTrackTime = 0
			this.scrubberValue = 0
			this.scrubbing = false
		},
		initPlayback() {
			if (!this.track?.points?.length) return

			this.buildTimeline()
			this.playbackTrackTime = 0
			this.playing = false
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
			this.applyTrackVisibility()
			this.$nextTick(() => {
				this.bindChartResizeObserver()
				this.scheduleDrawSpeedChart()
				this.handleMapResize()
			})
		},
		togglePlay() {
			if (!this.hasTrack) return

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
			if (!this.playing || !this.hasTrack) return

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
			this.track = null
			this.resetPlaybackLayers()
			this.staticLayer?.clearLayers()

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
				this.map.fitBounds(this.backgroundLine.getBounds(), { padding: [40, 40] })
				this.initPlayback()
				this.$nextTick(() => this.handleMapResize())
			})
		},
		pointPopup(point, label) {
			const title = label ? `<strong>${label}</strong><br>` : ''
			const speed = this.getPointSpeed(point) ?? '—'
			const geofences = this.formatPointGeofences(point)
			return `${title}${point.timeLocal}<br>Скорость: ${speed}<br>Высота: ${point.alt ?? '—'} м<br>Геозоны: ${geofences}`
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

.map-leaflet :deep(.geozone-draft-points-canvas) {
	pointer-events: none;
}
</style>
