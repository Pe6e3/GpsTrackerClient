const TOKEN_KEY = 'gps_token'
const EXPIRES_KEY = 'gps_token_expires'

function getApiBase() {
	return '/api'
}

export function getToken() {
	return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token, expiresAtUtc) {
	localStorage.setItem(TOKEN_KEY, token)
	if (expiresAtUtc)
		localStorage.setItem(EXPIRES_KEY, expiresAtUtc)
}

export function clearToken() {
	localStorage.removeItem(TOKEN_KEY)
	localStorage.removeItem(EXPIRES_KEY)
}

export function isAuthenticated() {
	const token = getToken()
	if (!token) return false

	const expires = localStorage.getItem(EXPIRES_KEY)
	if (!expires) return true

	return new Date(expires) > new Date()
}

async function request(path, options = {}) {
	const headers = {
		'Content-Type': 'application/json',
		...options.headers,
	}

	const token = getToken()
	if (token)
		headers.Authorization = `Bearer ${token}`

	const response = await fetch(`${getApiBase()}${path}`, {
		...options,
		headers,
	})

	if (response.status === 401) {
		clearToken()
		throw new Error('Сессия истекла. Войдите снова.')
	}

	if (!response.ok) {
		let message = `Ошибка ${response.status}`
		try {
			const data = await response.json()
			if (data.message || data.error)
				message = data.message || data.error
		} catch (_) {}
		throw new Error(message)
	}

	if (response.status === 204)
		return null

	return response.json()
}

export function login(username, password) {
	return request('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ username, password }),
	})
}

export function getDevices() {
	return request('/devices')
}

export function getTrack(deviceId, params = {}) {
	const query = new URLSearchParams()
	if (params.from) query.set('from', params.from)
	if (params.to) query.set('to', params.to)

	const qs = query.toString()
	const path = `/tracks/${encodeURIComponent(deviceId)}${qs ? `?${qs}` : ''}`
	return request(path)
}

export function getGeofences() {
	return request('/geofences').then((data) => data.geofences || [])
}

export function createGeofence(payload) {
	return request('/geofences', {
		method: 'POST',
		body: JSON.stringify(payload),
	})
}

export function updateGeofence(id, payload) {
	return request(`/geofences/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	})
}

export function deleteGeofence(id) {
	return request(`/geofences/${id}`, {
		method: 'DELETE',
	})
}
