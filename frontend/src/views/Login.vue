<script setup lang="ts">
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { reactive, ref, onMounted } from 'vue'
import auth from '../service/auth.ts'
import Account from '../service/account.ts' // Import thêm service Account
import { notify } from '@/utils/notifier.ts'

const router = useRouter()
const route = useRoute()
const showPassword = ref(false)
const googleEnabled = import.meta.env.VITE_GOOGLE_LOGIN === 'true'

// State cho Đăng nhập
const form = reactive({
  data: {
    email: '',
    password: '',
  },
})
const loading = ref(false)

// State cho Quên mật khẩu
const isForgotPassword = ref(false)
const forgotEmail = ref('')
const forgotLoading = ref(false)

// --- 1. XỬ LÝ KHI GOOGLE REDIRECT VỀ ---
onMounted(() => {
  const params = new URLSearchParams(route.hash.slice(1))
  const token = params.get('token')
  const id = params.get('id')
  const email = params.get('email')
  const role = params.get('role')

  if (token) {
    auth.saveToken(token as string)
    const userData = { id, email, role }
    localStorage.setItem('user', JSON.stringify(userData))

    notify.success(`Chào mừng ${email}! Đăng nhập thành công.`)
    router.replace({ query: {}, hash: '' })
    setTimeout(() => router.push('/'), 500)
  }
})

// --- 2. XỬ LÝ ĐĂNG NHẬP ---
const handleSubmit = async () => {
  loading.value = true
  try {
    const response = await auth.Login(form.data.email, form.data.password)

    if (response && response.token) {
      auth.saveToken(response.token)
      const userData = response.user || response
      localStorage.setItem('user', JSON.stringify(userData))

      notify.success(`Chào mừng bạn quay trở lại, ${userData.email}!`)

      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  } catch (err: any) {
    let message = err.response?.data?.message || 'Email hoặc mật khẩu không chính xác'
    if (Array.isArray(message)) message = message.join(', ')
    notify.error(message)
  } finally {
    loading.value = false
  }
}

// --- 3. XỬ LÝ QUÊN MẬT KHẨU ---
const handleForgotPassword = async () => {
  if (!forgotEmail.value) {
    notify.error('Vui lòng nhập email của bạn!')
    return
  }

  forgotLoading.value = true
  try {
    const res = await Account.forgotPassword(forgotEmail.value)
    notify.success(res.message || 'Link khôi phục đã được gửi vào email của bạn!')
    // Xóa form và quay lại trang đăng nhập
    forgotEmail.value = ''
    isForgotPassword.value = false
  } catch (err: any) {
    const message = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.'
    notify.error(message)
  } finally {
    forgotLoading.value = false
  }
}

// --- 4. GOOGLE LOGIN ---
const handleGoogleLogin = () => {
  auth.LoginGoogle()
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white via-white to-[#eef4e6] relative overflow-hidden"
  >
    <div class="absolute inset-0 nature-pattern opacity-30 pointer-events-none"></div>

    <div
      class="relative w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 md:p-10 border border-slate-100 z-10"
    >
      <div v-if="!isForgotPassword">
        <div class="flex flex-col items-center mb-8">
          <div class="size-14 bg-[#eef4e6] rounded-full flex items-center justify-center mb-5">
            <svg
              class="text-primary w-8 h-8"
              fill="none"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
          <h1 class="text-[26px] font-bold text-slate-900 tracking-tight">Chào Mừng Trở Lại</h1>
          <p class="text-slate-500 text-sm mt-2">Tiếp tục hành trình sống xanh của bạn</p>
        </div>

        <form class="space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"
              >
                <span class="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <input
                v-model="form.data.email"
                required
                type="email"
                class="block w-full pl-11 pr-4 py-3 bg-[#f8f9fa] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium text-slate-700">Mật khẩu</label>
              <a
                href="#"
                @click.prevent="isForgotPassword = true"
                class="text-xs text-primary hover:underline font-medium"
                >Quên mật khẩu?</a
              >
            </div>

            <div class="relative flex items-center">
              <div
                class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"
              >
                <span class="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <input
                v-model="form.data.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="block w-full pl-11 pr-11 py-3 bg-[#f8f9fa] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all sm:text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-[#658a22] transition-colors z-10"
              >
                <span class="material-symbols-outlined text-[20px]">{{
                  showPassword ? 'visibility_off' : 'visibility'
                }}</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-[#658a22] hover:bg-[#58791d] text-white font-semibold py-3.5 rounded-xl shadow-sm transition-all transform active:scale-[0.98] mt-2 flex justify-center items-center gap-2 disabled:opacity-70"
          >
            <span
              v-if="loading"
              class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"
            ></span>
            Đăng Nhập
          </button>

          <div class="relative py-4">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-white px-4 text-slate-400 font-medium">HOẶC</span>
            </div>
          </div>

          <button
            v-if="googleEnabled"
            type="button"
            @click="handleGoogleLogin"
            class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg class="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M533.5 272.3c0-18.7-1.6-37.1-4.7-55H272.5v104.7h146.9c-6.1 33.7-25 61.9-52.5 81.3v68h87.9c51.5-47.5 81.1-117.4 81.1-200z"
                fill="#4285F4"
              />
              <path
                d="M272.5 544.3c73.4 0 135.2-24.1 180.3-65.7l-87.9-68c-24.2 16.3-55.7 25.8-92.4 25.8-70.3 0-129.9-47.5-151.8-111.4H28.4v68.8C73.8 506.7 167.3 544.3 272.5 544.3z"
                fill="#34A853"
              />
              <path
                d="M120.7 327.3c-5.8-16.3-9-33.8-9-55s3.2-38.7 9-55V148.6H28.4c-12.7 25.4-20 52.8-20 86.4s7.3 61 20 86.4l92.3-72.1z"
                fill="#FBBC05"
              />
              <path
                d="M272.5 108.9c39.8 0 75.3 13.7 103.5 40.5l77.4-74.8C407.7 25.4 344.9 0 272.5 0c-105.2 0-198.7 37.6-244.1 108.9l92.3 72.1c21.9-63.9 81.5-111.4 151.8-111.4z"
                fill="#EA4335"
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>
        </form>

        <div class="mt-8 text-center">
          <p class="text-sm text-slate-500">
            Chưa có tài khoản?
            <RouterLink to="/register" class="text-[#658a22] font-semibold hover:underline ml-1"
              >Đăng Ký</RouterLink
            >
          </p>
        </div>
      </div>

      <div v-else>
        <div class="flex flex-col items-center mb-8 text-center">
          <div class="size-14 bg-blue-50 rounded-full flex items-center justify-center mb-5">
            <span class="material-symbols-outlined text-blue-500 text-3xl">password</span>
          </div>
          <h1 class="text-[24px] font-bold text-slate-900 tracking-tight">Quên mật khẩu?</h1>
          <p class="text-slate-500 text-sm mt-2">
            Đừng lo, hãy nhập email của bạn và chúng tôi sẽ gửi liên kết khôi phục mật khẩu.
          </p>
        </div>

        <form class="space-y-5" @submit.prevent="handleForgotPassword">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Email đăng ký</label>
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"
              >
                <span class="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <input
                v-model="forgotEmail"
                required
                type="email"
                class="block w-full pl-11 pr-4 py-3 bg-[#f8f9fa] border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm"
                placeholder="Nhập email của bạn"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="forgotLoading"
            class="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 rounded-xl shadow-sm transition-all transform active:scale-[0.98] mt-2 flex justify-center items-center gap-2 disabled:opacity-70"
          >
            <span
              v-if="forgotLoading"
              class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"
            ></span>
            Gửi liên kết khôi phục
          </button>
        </form>

        <div class="mt-8 text-center">
          <a
            href="#"
            @click.prevent="isForgotPassword = false"
            class="text-sm flex items-center justify-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    </div>

    <div class="absolute bottom-6 w-full text-center flex flex-col gap-2">
      <p class="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
        EcoStore Zero Waste Initiative
      </p>
      <div class="flex justify-center gap-4 text-xs text-slate-400">
        <a href="#" class="hover:text-slate-600 transition-colors">Chính Sách Bảo Mật</a>
        <span class="opacity-40">•</span>
        <a href="#" class="hover:text-slate-600 transition-colors">Điều Khoản Dịch Vụ</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nature-pattern {
  background-image: radial-gradient(circle at 2px 2px, #e5ebd8 1px, transparent 0);
  background-size: 32px 32px;
}

/* Thêm đoạn CSS dưới đây để ẩn icon con mắt mặc định của trình duyệt (Edge, IE...) */
input[type='password']::-ms-reveal,
input[type='password']::-ms-clear {
  display: none;
}

/* Ẩn thêm nút auto-fill của trình duyệt nền tảng WebKit (Chrome/Safari) nếu cần thiết */
input::-webkit-credentials-auto-fill-button {
  visibility: hidden;
  display: none !important;
  pointer-events: none;
}
</style>
