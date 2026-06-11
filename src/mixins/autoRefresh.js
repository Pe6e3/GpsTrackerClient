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
			const intervalMs = this.autoRefreshMs ?? AUTO_REFRESH_MS
			this.autoRefreshTimer = setInterval(() => {
				if (typeof this.onAutoRefresh === 'function')
					this.onAutoRefresh()
			}, intervalMs)
		},
		stopAutoRefresh() {
			if (this.autoRefreshTimer) {
				clearInterval(this.autoRefreshTimer)
				this.autoRefreshTimer = null
			}
		},
	},
}
