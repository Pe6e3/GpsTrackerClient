<template>
	<div class="page" style="flex-direction: column; align-items: stretch">
		<div class="page-header" style="margin: 0 auto">
			<h1>Устройства</h1>
			<button class="btn btn-ghost" type="button" @click="logout">Выйти</button>
		</div>

		<div v-if="loading" class="loading">Загрузка…</div>

		<div v-else-if="error" class="device-list" style="margin: 0 auto">
			<p class="error-msg">{{ error }}</p>
			<button class="btn btn-secondary" type="button" @click="loadDevices">Повторить</button>
		</div>

		<div v-else-if="devices.length === 0" class="loading">Устройства не найдены</div>

		<div v-else class="device-list" style="margin: 0 auto">
			<div
				v-for="device in devices"
				:key="device.id"
				class="device-item"
				@click="openMap(device)"
			>
				<div>
					<div class="device-name">{{ device.name || 'Без имени' }}</div>
					<div class="device-id">ID: {{ device.id }}</div>
				</div>
				<span aria-hidden="true">→</span>
			</div>
		</div>
	</div>
</template>

<script>
import { getDevices, clearToken } from '@/api/client'

export default {
	name: 'DevicesView',
	data() {
		return {
			devices: [],
			loading: true,
			error: '',
		}
	},
	mounted() {
		this.loadDevices()
	},
	methods: {
		async loadDevices() {
			this.loading = true
			this.error = ''

			try {
				this.devices = await getDevices()
			} catch (e) {
				this.error = e.message || 'Не удалось загрузить устройства'
				if (e.message && e.message.includes('Сессия'))
					this.$router.push({ name: 'login' })
			} finally {
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
	},
}
</script>
