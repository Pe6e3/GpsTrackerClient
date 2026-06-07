export const AUTO_REFRESH_MS = 5000

export default {
	data() {
		return {
			autoRefreshTimer: null,
		}
	},
	mounted() {
		this.startAutoRefresh()
	},
	beforeUnmount() {
		this.stopAutoRefresh()
	},
	methods: {
		startAutoRefresh() {
			this.stopAutoRefresh()
			this.autoRefreshTimer = setInterval(() => {
				if (typeof this.onAutoRefresh === 'function')
					this.onAutoRefresh()
			}, AUTO_REFRESH_MS)
		},
		stopAutoRefresh() {
			if (this.autoRefreshTimer) {
				clearInterval(this.autoRefreshTimer)
				this.autoRefreshTimer = null
			}
		},
	},
}
