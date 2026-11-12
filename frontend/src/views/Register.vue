<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { reactive, ref } from 'vue'
import auth from '../service/auth.ts'
import { notify } from '@/utils/notifier.ts'

const router = useRouter()
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const data = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
}

const form = reactive({ data })
const error = ref()

const handleSubmit = async () => {
  error.value = ''

  if (form.data.confirmPassword.length >= 8) {
    if (form.data.password !== form.data.confirmPassword) {
      notify.error('Mật khẩu xác nhận không trùng khớp!')
      return
    }
  } else {
    notify.error('Mật khẩu xác nhận tối thiểu 8 ký tự trở lên')
    return
  }

  try {
    const response = await auth.Register(form.data.email, form.data.password, form.data.fullName)
    if (response) {
      notify.success('Đăng ký thành công!')
      setTimeout(() => {
        router.push('/login')
      }, 1000)
    }
  } catch (err: any) {
    let message = err.response?.data?.message || 'Lỗi hệ thống'
    if (Array.isArray(message)) {
      message = message.join(', ') // Nối các lỗi lại thành 1 chuỗi để hiện lên Toast
    }
    notify.error(message)
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-white via-white to-[#eef4e6] relative overflow-hidden"
  >
    <!-- Abstract nature-inspired background elements -->
    <div class="absolute inset-0 nature-pattern opacity-30 pointer-events-none"></div>
    <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
    <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>

    <div
      class="w-full max-w-[480px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden border border-slate-100 z-10"
    >
      <!-- Header / Hero Image -->
      <div class="relative h-32 bg-[#eef4e6] overflow-hidden">
        <div
          class="absolute inset-0 bg-cover bg-center opacity-40"
          style="
            background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBSrJUTWpk_aPbmO0pbIhZC4unyGMw2v5uM7WUy7Xd2yNgrR0uFyd30_UlBHpOoPtsPQ1hUtGmznwgBme3JB9p539N2a52brp9J9VNM2A2knR0VD790y5WUe3sdiX9RaFII14BVm4TFS32sLIWEPmKWa-bNkxS1aeCZzIM1qHKUD7sQ0p32NAZArNqMmMCLaSSr8b9MkKwuiTiT3NnzZaDIyz-KGTkHlGsCW-HQHW4sceXe9ZdbajBFoHyxRqp2VzmH1tVRojPt3V0');
          "
        ></div>
        <div class="absolute inset-0 bg-gradient-to-t from-white to-transparent"></div>
        <div class="absolute bottom-4 left-0 right-0 flex justify-center">
          <RouterLink
            to="/"
            class="flex items-center gap-2 px-5 py-2 bg-white rounded-full shadow-sm"
          >
            <span class="material-symbols-outlined text-primary">eco</span>
            <span class="font-bold tracking-tight text-primary">Zero-Waste Store</span>
          </RouterLink>
        </div>
      </div>

      <div class="px-8 pt-6 pb-10">
        <!-- Heading -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 mb-2">Tạo Tài Khoản</h1>
          <p class="text-slate-500 text-sm">Tham gia cộng đồng vì một tương lai bền vững</p>
        </div>

        <!-- Form -->
        <form class="space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium mb-1.5 text-slate-700">Họ và Tên</label>
            <input
              v-model="form.data.fullName"
              type="text"
              required
              class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8f9fa] focus:bg-white focus:ring-2 focus:ring-[#658a22]/20 focus:border-[#658a22] outline-none transition-all sm:text-sm"
              placeholder="Nguyễn Văn A"
            />
          </div>

          <!-- Email Field -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-slate-700">Địa chỉ Email</label>
            <input
              v-model="form.data.email"
              type="email"
              required
              class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8f9fa] focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all sm:text-sm"
              placeholder="hello@example.com"
            />
          </div>

          <!-- Password Field -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-slate-700">Mật khẩu</label>
            <div class="relative flex items-center">
              <input
                v-model="form.data.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8f9fa] focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-12 sm:text-sm"
                placeholder="Tạo mật khẩu"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 text-slate-400 hover:text-[#658a22] transition-colors flex items-center"
              >
                <span class="material-symbols-outlined text-[20px]">
                  {{ showPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5 text-slate-700">Xác nhận Mật khẩu</label>
            <div class="relative flex items-center">
              <input
                v-model="form.data.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8f9fa] focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-12 sm:text-sm"
                placeholder="Nhập lại mật khẩu"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 text-slate-400 hover:text-[#658a22] transition-colors flex items-center"
              >
                <span class="material-symbols-outlined text-[20px]">
                  {{ showConfirmPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Primary Button -->
          <button
            type="submit"
            class="w-full bg-[#658a22] hover:bg-[#58791d] text-white font-semibold py-3.5 rounded-xl shadow-sm transition-all transform active:scale-[0.98] mt-2"
          >
            Tạo Tài Khoản
          </button>

          <!-- Divider -->
          <div class="relative py-4">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
          </div>
        </form>

        <!-- Login Link -->
        <div class="mt-8 text-center">
          <p class="text-sm text-slate-500">
            Đã có tài khoản?
            <RouterLink to="/login" class="text-[#658a22] font-semibold hover:underline ml-1"
              >Đăng Nhập</RouterLink
            >
          </p>
        </div>
      </div>

      <!-- Footer Info -->
      <div
        class="bg-slate-50 px-8 py-5 flex justify-between items-center text-[10px] uppercase tracking-widest text-slate-400 border-t border-slate-100 font-semibold"
      >
        <span>Sống Bền Vững</span>
        <div class="flex gap-4">
          <a href="#" class="hover:text-slate-600 transition-colors">Bảo mật</a>
          <a href="#" class="hover:text-slate-600 transition-colors">Điều khoản</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nature-pattern {
  background-image: radial-gradient(circle at 2px 2px, #e5ebd8 1px, transparent 0);
  background-size: 32px 32px;
}

input::-ms-reveal,
input::-ms-clear {
  display: none;
}

input::-webkit-contacts-auto-fill-button,
input::-webkit-credentials-auto-fill-button {
  visibility: hidden;
  display: none !important;
  pointer-events: none;
}
</style>
