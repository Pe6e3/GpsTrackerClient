<template>
	<div class="devices-page">
		<div class="page-header">
			<h1>Устройства</h1>
			<button class="btn btn-ghost" type="button" @click="logout">Выйти</button>
		</div>

		<div v-if="loading" class="loading">Загрузка…</div>

		<div v-else-if="error" class="devices-content">
			<p class="error-msg">{{ error }}</p>
			<button class="btn btn-secondary" type="button" @click="loadDevices">Повторить</button>
		</div>

		<template v-else>
			<div v-if="devices.length === 0" class="loading">Устройства не найдены</div>

			<div v-else class="devices-content">
				<div class="device-list">
					<div
						v-for="device in devices"
						:key="device.id"
						class="device-item"
						@click="openMap(device)"
					>
						<div class="device-item-main">
							<div class="device-name">{{ device.name || 'Без имени' }}</div>
							<div class="device-id">ID: {{ device.id }}</div>
							<div class="device-stats">
								<div
									v-for="period in devicePeriods(device)"
									:key="period.key"
									class="device-period"
								>
									<div class="device-period-title">{{ period.label }}</div>
									<div class="device-period-grid">
										<div class="device-period-col">
											<span class="device-period-kind">Трек</span>
											<span class="device-period-value">
												{{ formatKm(period.trackKm) }}
												<span class="device-stats-sep">·</span>
												{{ formatTrackPoints(period.trackPoints, period.heartbeatPoints) }}
											</span>
										</div>
										<div class="device-period-col device-period-col-raw">
											<span class="device-period-kind">Сырые</span>
											<span class="device-period-value">
												{{ formatKm(period.rawKm) }}
												<span class="device-stats-sep">·</span>
												{{ formatCount(period.rawPoints) }}
											</span>
										</div>
									</div>
								</div>
								<div class="device-stats-line device-stats-status">
									<span :class="telemetryClass(device.lastTelemetryAgoSeconds)">
										Связь {{ formatTelemetryAgo(device.lastTelemetryAgoSeconds) }}
									</span>
									<span
										v-if="device.lastGpsAgoSeconds != null"
										class="device-stats-gps"
									>
										GPS {{ formatTelemetryAgo(device.lastGpsAgoSeconds) }}
									</span>
								</div>
							</div>
						</div>
						<span class="device-arrow" aria-hidden="true">→</span>
					</div>
				</div>
			</div>

			<div v-if="service" class="service-panel">
				<div class="service-panel-title">Сервис · v{{ service.version }}</div>
				<div class="service-grid">
					<div class="service-item">
						<span class="service-label">Аптайм</span>
						<span class="service-value">{{ formatUptime(service.uptimeSeconds) }}</span>
					</div>
					<div class="service-item">
						<span class="service-label">База данных</span>
						<span class="service-value">{{ formatBytes(service.databaseSizeBytes) }}</span>
					</div>
					<div class="service-item">
						<span class="service-label">Логи</span>
						<span class="service-value">{{ formatBytes(service.logsSizeBytes) }}</span>
					</div>
					<div class="service-item">
						<span class="service-label">Traffic-логи</span>
						<span class="service-value">{{ formatBytes(service.trafficLogsSizeBytes) }}</span>
					</div>
					<div class="service-item">
						<span class="service-label">Raw-логи</span>
						<span class="service-value">{{ formatBytes(service.rawLogsSizeBytes) }}</span>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<script>
import { getDevices, clearToken } from '@/api/client'
import autoRefreshMixin from '@/mixins/autoRefresh'

export default {
	name: 'DevicesView',
	mixins: [autoRefreshMixin],
	data() {
		return {
			devices: [],
			service: null,
			loading: true,
			error: '',
			refreshInFlight: false,
		}
	},
	mounted() {
		this.loadDevices()
	},
	methods: {
		onAutoRefresh() {
			if (this.loading || this.refreshInFlight)
				return

			this.loadDevices({ silent: true })
		},
		async loadDevices(options = {}) {
			const silent = options.silent === true
			if (!silent) {
				this.loading = true
				this.error = ''
			}

			this.refreshInFlight = true

			try {
				const data = await getDevices()
				this.devices = data.devices || []
				this.service = data.service || null
				if (silent)
					this.error = ''
			} catch (e) {
				if (!silent) {
					this.error = e.message || 'Не удалось загрузить устройства'
					if (e.message && e.message.includes('Сессия'))
						this.$router.push({ name: 'login' })
				}
			} finally {
				this.refreshInFlight = false
				if (!silent)
					this.loading = false
			}
		},
		openMap(device) {
			this.$router.push({ name: 'map', params: { deviceId: device.id } })
		},
		logout() {
			clearToken()
			this.$router.push({ name: 'login' })
		},
		formatCount(value) {
			if (value == null) return '—'
			return Number(value).toLocaleString('ru-RU')
		},
		formatKm(value) {
			if (value == null) return '—'
			return `${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} км`
		},
		deviceValue(device, ...keys) {
			for (const key of keys) {
				if (device[key] != null)
					return device[key]
			}
			return null
		},
		devicePeriods(device) {
			return [
				{
					key: 'today',
					label: 'Сегодня',
					trackKm: this.deviceValue(device, 'todayKmOptimized', 'todayKmRaw'),
					trackPoints: this.deviceValue(device, 'todayPointsOptimized'),
					heartbeatPoints: device.todayHeartbeatPoints || 0,
					rawKm: device.todayKmRaw,
					rawPoints: device.todayPointsRaw,
				},
				{
					key: 'month',
					label: 'Месяц',
					trackKm: this.deviceValue(device, 'monthKmOptimized', 'monthKmRaw', 'monthKm'),
					trackPoints: this.deviceValue(device, 'monthPointsOptimized'),
					heartbeatPoints: device.monthHeartbeatPoints || 0,
					rawKm: this.deviceValue(device, 'monthKmRaw', 'monthKm'),
					rawPoints: this.deviceValue(device, 'monthPointsRaw', 'pointsCount'),
				},
			]
		},
		formatTrackPoints(trackPoints, heartbeatPoints) {
			if (trackPoints == null)
				return '—'

			const keyPoints = this.formatCount(trackPoints)
			if (!heartbeatPoints)
				return `${keyPoints} точек`

			return `${keyPoints} + ${this.formatCount(heartbeatPoints)} почас.`
		},
		formatTelemetryAgo(seconds) {
			if (seconds == null) return 'нет связи'
			if (seconds < 60) return `${seconds} сек назад`
			if (seconds < 3600) {
				const min = Math.floor(seconds / 60)
				return `${min} мин назад`
			}
			if (seconds < 86400) {
				const h = Math.floor(seconds / 3600)
				return `${h} ч назад`
			}
			const d = Math.floor(seconds / 86400)
			return `${d} д назад`
		},
		telemetryClass(seconds) {
			if (seconds == null) return 'device-stats-offline'
			if (seconds <= 120) return 'device-stats-online'
			if (seconds <= 3600) return 'device-stats-idle'
			return 'device-stats-offline'
		},
		formatUptime(seconds) {
			if (seconds == null || seconds < 0) return '—'
			if (seconds < 60) return `${seconds} сек`
			if (seconds < 3600) {
				const m = Math.floor(seconds / 60)
				const s = seconds % 60
				return s ? `${m} мин ${s} сек` : `${m} мин`
			}
			const h = Math.floor(seconds / 3600)
			const m = Math.floor((seconds % 3600) / 60)
			return m ? `${h} ч ${m} мин` : `${h} ч`
		},
		formatBytes(bytes) {
			if (bytes == null) return '—'
			if (bytes < 1024) return `${bytes} B`
			if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
			return `${(bytes / 1048576).toFixed(2)} MB`
		},
	},
}
</script>
