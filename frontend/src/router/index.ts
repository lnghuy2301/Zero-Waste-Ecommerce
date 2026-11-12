import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { notify } from '@/utils/notifier.ts'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    return to.hash ? { el: to.hash, top: 110 } : { top: 0 }
  },
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/login', name: 'login', component: () => import('../views/Login.vue') },
    { path: '/register', name: 'register', component: () => import('../views/Register.vue') },
    {
      path: '/product/:id',
      name: 'productdetail',
      component: () => import('../views/ProductDetail.vue'),
    },
    {
      path: '/cartpayment',
      name: 'cartpayment',
      component: () => import('../views/CartPayment.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/payment-momo',
      name: 'demo-payment-momo',
      props: { provider: 'MoMo', code: 'MOMO_DEMO' },
      component: () => import('../views/DemoPayment.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/payment-paypal',
      name: 'demo-payment-paypal',
      props: { provider: 'PayPal', code: 'PAYPAL_DEMO' },
      component: () => import('../views/DemoPayment.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/change_password',
      name: 'change_password',
      component: () => import('../views/Change_password.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/products', name: 'products', component: () => import('../views/Products.vue') },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/Order.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/detail-orders/:id',
      name: 'detailorders',
      component: () => import('../views/OrderDetail.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import('../views/Change_password.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/reset-password',
      name: 'ResetPassword',
      component: () => import('@/views/ResetPassword.vue'),
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('@/views/About.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFound.vue'),
    },
    // === ADMIN ROUTE (có bảo vệ) ===
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('../views/admin/Dashboard.vue'),
        },
        {
          path: 'products',
          name: 'admin-products',
          component: () => import('../views/admin/ProductManagement.vue'),
          meta: { requiresAuth: true, requiresAdmin: true }, // bảo vệ thêm
        },
        {
          path: 'orders',
          name: 'admin-orders',
          component: () => import('../views/admin/OrderManagement.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'accounts',
          name: 'admin-accounts',
          component: () => import('../views/admin/AccountManagement.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'comments',
          name: 'admin-comments',
          component: () => import('../views/admin/CommentManagement.vue'),
        },
      ],
    },
  ],
})

// === GUARD ROUTER (đặt sau khi tạo router) ===
router.beforeEach((to, from, next) => {
  const userStr = localStorage.getItem('user')
  let user: any = null
  if (userStr) {
    try {
      user = JSON.parse(userStr)
    } catch {
      localStorage.removeItem('user')
    }
  }

  // Yêu cầu đăng nhập
  if (to.meta.requiresAuth && (!user || !localStorage.getItem('token'))) {
    next('/login')
    return
  }

  // Yêu cầu quyền ADMIN
  if (to.meta.requiresAdmin && user?.role !== 'ADMIN') {
    notify.error('Bạn không có quyền truy cập trang quản trị')
    next('/')
    return
  }

  next()
})

export default router
