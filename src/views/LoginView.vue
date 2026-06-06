<template>
	<div class="page">
		<div class="card">
			<h1 class="card-title">GPS Tracker</h1>
			<p class="card-subtitle">Войдите для просмотра треков</p>

			<form @submit.prevent="handleLogin">
				<div class="form-group">
					<label for="username">Логин</label>
					<input
						id="username"
						v-model="username"
						type="text"
						autocomplete="username"
						required
						:disabled="loading"
					/>
				</div>

				<div class="form-group">
					<label for="password">Пароль</label>
					<input
						id="password"
						v-model="password"
						type="password"
						autocomplete="current-password"
						required
						:disabled="loading"
					/>
				</div>

				<button class="btn btn-primary" type="submit" :disabled="loading">
					{{ loading ? 'Вход…' : 'Войти' }}
				</button>
			</form>

			<p v-if="error" class="error-msg">{{ error }}</p>
		</div>
	</div>
</template>

<script>
import { login, setToken } from '@/api/client'

export default {
	name: 'LoginView',
	data() {
		return {
			username: '',
			password: '',
			loading: false,
			error: '',
		}
	},
	methods: {
		async handleLogin() {
			this.error = ''
			this.loading = true

			try {
				const data = await login(this.username, this.password)
				setToken(data.token, data.expiresAtUtc)

				const redirect = this.$route.query.redirect
				if (redirect && redirect !== '/login')
					this.$router.push(redirect)
				else
					this.$router.push({ name: 'devices' })
			} catch (e) {
				this.error = e.message || 'Не удалось войти'
			} finally {
				this.loading = false
			}
		},
	},
}
</script>
