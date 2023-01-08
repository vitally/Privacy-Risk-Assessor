import { h, resolveComponent } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

import DefaultLayout from '@/layouts/DefaultLayout'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: DefaultLayout,
    redirect: '/sites',
    children: [
      {
        path: '/sites',
        name: 'Sites',
        component: () => import('@/views/sites/Sites.vue'),
      },
      {
        path: '/requests',
        name: 'Requests',
        component: () => import('@/views/requests/Requests.vue'),
      },
      {
        path: '/siteCheck',
        name: 'SiteCheck',
        component: () => import('@/views/siteCheck/SiteCheck.vue'),
      },
      {
        path: '/complaint',
        name: 'Complaint',
        component: () => import('@/views/complaint/Complaint.vue'),
      },
    ],
  },
  {
    path: '/pages',
    redirect: '/pages/404',
    name: 'Pages',
    component: {
      render() {
        return h(resolveComponent('router-view'))
      },
    },
    children: [
      {
        path: '404',
        name: 'Page404',
        component: () => import('@/views/pages/Page404'),
      },
      {
        path: '500',
        name: 'Page500',
        component: () => import('@/views/pages/Page500'),
      },
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/pages/Login'),
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/views/pages/Register'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes,
  scrollBehavior() {
    // always scroll to top
    return { top: 0 }
  },
})

export default router
