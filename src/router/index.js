import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '@/api/client'
import LoginView from '@/views/LoginView.vue'
import DevicesView from '@/views/DevicesView.vue'
import MapView from '@/views/MapView.vue'

const router = createRouter({
	history: createWebHistory('/map/'),
	routes: [
		{ path: '/', redirect: '/login' },
		{ path: '/login', name: 'login', component: LoginView, meta: { guest: true } },
		{ path: '/devices', name: 'devices', component: DevicesView, meta: { auth: true } },
		{ path: '/map/:deviceId', name: 'map', component: MapView, meta: { auth: true } },
	],
})

router.beforeEach((to) => {
	if (to.meta.auth && !isAuthenticated())
		return { name: 'login', query: { redirect: to.fullPath } }

	if (to.meta.guest && isAuthenticated())
		return { name: 'devices' }
})

export default router
