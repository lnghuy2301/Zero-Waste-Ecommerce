<script setup lang="ts">
import { mediaUrl } from '@/utils/media'
import { RouterLink, useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import auth from '@/service/auth.ts'
import { notify } from '@/utils/notifier.ts'
import { Cart } from '@/service/cart.ts'

const router = useRouter()
const isMenuOpen = ref(false)
const user = ref<any>(null)
const cartCount = ref(0)

const getAvatarUrl = mediaUrl

// Hàm lấy dữ liệu giỏ hàng và cập nhật con số hiển thị
const updateCartCount = async () => {
  const savedUser = localStorage.getItem('user')
  if (!savedUser) {
    cartCount.value = 0
    return
  }

  try {
    const userData = JSON.parse(savedUser)
    const response = await Cart.getByUser(userData.id)

    // Đảm bảo lấy đúng mảng dữ liệu
    const items = Array.isArray(response) ? response : response.data || []

    // Cộng dồn tất cả quantity của các sản phẩm trong giỏ
    cartCount.value = items.reduce((total: number, item: any) => total + Number(item.quantity), 0)
  } catch (e: any) {
    // FIX LỖI TẠI ĐÂY: Nếu lỗi 404 (giỏ hàng trống) thì set về 0 và không báo lỗi đỏ
    if (e.response && e.response.status === 404) {
      cartCount.value = 0
    } else {
      // Các lỗi khác vẫn in ra để theo dõi nhưng không làm treo app
      console.warn('Giỏ hàng trống hoặc chưa khởi tạo')
      cartCount.value = 0
    }
  }
}

const checkAuth = () => {
  const savedUser = localStorage.getItem('user')
  if (savedUser) {
    try {
      user.value = JSON.parse(savedUser)
      updateCartCount()
    } catch (e) {
      user.value = null
    }
  } else {
    user.value = null
    cartCount.value = 0
  }
}

// Xử lý sự kiện đồng bộ khi user hoặc giỏ hàng thay đổi
const handleGlobalUpdate = () => {
  updateCartCount()
  checkAuth()
}

const handleOutsideClick = (event: MouseEvent) => {
  if (!(event.target as Element)?.closest('.user-menu-container')) isMenuOpen.value = false
}

onMounted(() => {
  checkAuth()

  // QUAN TRỌNG: Lắng nghe sự kiện từ trang Chi tiết sản phẩm bắn qua
  window.addEventListener('cart-updated', updateCartCount)
  window.addEventListener('user-updated', handleGlobalUpdate)

  window.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
  // Hủy lắng nghe để tránh rò rỉ bộ nhớ
  window.removeEventListener('cart-updated', updateCartCount)
  window.removeEventListener('user-updated', handleGlobalUpdate)
})

const handleLogout = () => {
  notify.success('Đăng xuất thành công')
  isMenuOpen.value = false
  auth.logout()
  user.value = null
  cartCount.value = 0
  router.push('/login')
}
</script>

<template>
  <header
    class="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm font-inter transition-all duration-300"
  >
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-20">
        <RouterLink to="/" class="flex items-center gap-2 sm:gap-4 group">
          <div
            class="w-10 h-10 sm:w-14 sm:h-14 bg-[#eef4e6] rounded-xl flex items-center justify-center group-hover:bg-[#658a22] transition-colors duration-300 shadow-sm"
          >
            <span
              class="material-symbols-outlined text-[#658a22] text-[38px] group-hover:text-white transition-colors duration-300"
              >eco</span
            >
          </div>
          <span
            class="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 group-hover:text-[#658a22] transition-colors duration-300"
            >EcoStore</span
          >
        </RouterLink>

        <nav class="hidden md:flex items-center space-x-10">
          <RouterLink
            to="/products"
            class="relative text-base font-bold text-slate-600 hover:text-[#658a22] transition-colors duration-200 group py-2"
          >
            Sản phẩm
            <span
              class="absolute bottom-0 left-0 w-0 h-0.5 bg-[#658a22] transition-all duration-300 group-hover:w-full rounded-full"
            ></span>
          </RouterLink>
          <RouterLink
            to="/about"
            class="relative text-base font-bold text-slate-600 hover:text-[#658a22] transition-colors duration-200 group py-2"
          >
            Về Chúng tôi
            <span
              class="absolute bottom-0 left-0 w-0 h-0.5 bg-[#658a22] transition-all duration-300 group-hover:w-full rounded-full"
            ></span>
          </RouterLink>
        </nav>

        <div class="flex items-center gap-3 sm:gap-6">
          <div v-if="user" class="relative user-menu-container z-[100]">
            <button
              @click.stop="isMenuOpen = !isMenuOpen"
              class="flex items-center gap-3 p-1.5 hover:bg-slate-100 rounded-full border border-transparent transition-all duration-300"
              :class="{ 'border-slate-200 bg-slate-100 shadow-inner': isMenuOpen }"
            >
              <div
                class="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-[#eef4e6]"
              >
                <img
                  v-if="user.avatar"
                  :src="getAvatarUrl(user.avatar)"
                  class="w-full h-full object-cover"
                  alt="Avatar"
                />
                <span v-else class="text-sm font-black text-[#658a22] uppercase">
                  {{ user.email ? user.email.substring(0, 2) : 'AD' }}
                </span>
              </div>

              <div class="hidden lg:flex flex-col items-start leading-none text-left mr-2">
                <span
                  class="text-[10px] text-[#658a22] font-black uppercase tracking-widest mb-0.5"
                >
                  {{ user.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng' }}
                </span>
                <span class="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                  {{ user.fullName || user.username || user.email.split('@')[0] }}
                </span>
              </div>

              <span
                class="material-symbols-outlined text-slate-400 text-xl transition-transform duration-300"
                :class="{ 'rotate-180 text-[#658a22]': isMenuOpen }"
              >
                expand_more
              </span>
            </button>

            <transition name="dropdown">
              <div
                v-if="isMenuOpen"
                class="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-slate-100 py-3 overflow-hidden origin-top-right"
              >
                <div class="px-5 py-3 border-b border-slate-100 mb-2 bg-slate-50/50">
                  <p class="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-1">
                    Tài khoản của bạn
                  </p>
                  <p class="text-sm font-bold text-slate-800 truncate">{{ user.email }}</p>
                </div>

                <RouterLink
                  v-if="user.role === 'ADMIN'"
                  to="/admin"
                  @click="isMenuOpen = false"
                  class="flex items-center gap-4 px-5 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <span class="material-symbols-outlined text-[22px]">dashboard</span> Quản trị hệ
                  thống
                </RouterLink>

                <RouterLink
                  to="/profile"
                  @click="isMenuOpen = false"
                  class="flex items-center gap-4 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-[#f4f7ee] hover:text-[#658a22] transition-colors"
                >
                  <span class="material-symbols-outlined text-[22px]">manage_accounts</span> Hồ sơ
                  cá nhân
                </RouterLink>

                <RouterLink
                  to="/orders"
                  @click="isMenuOpen = false"
                  class="flex items-center gap-4 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-[#f4f7ee] hover:text-[#658a22] transition-colors"
                >
                  <span class="material-symbols-outlined text-[22px]">local_shipping</span> Đơn hàng
                  của tôi
                </RouterLink>

                <div class="h-px bg-slate-100 my-2 mx-5"></div>

                <button
                  @click="handleLogout"
                  class="w-full flex items-center gap-4 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span class="material-symbols-outlined text-[22px]">logout</span> Đăng xuất
                </button>
              </div>
            </transition>
          </div>

          <RouterLink
            v-else
            to="/login"
            class="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-sm transition-colors"
          >
            <span class="material-symbols-outlined text-lg">login</span>
            <span class="hidden sm:inline">Đăng nhập</span>
          </RouterLink>

          <div class="h-8 w-px bg-slate-200 hidden sm:block mx-1"></div>

          <RouterLink
            to="/cartpayment"
            aria-label="Giỏ hàng"
            class="relative w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 hover:bg-[#eef4e6] transition-colors group"
          >
            <span
              class="material-symbols-outlined text-[26px] text-slate-600 group-hover:text-[#658a22] transition-colors"
              >shopping_bag</span
            >
            <transition name="pop">
              <span
                v-if="cartCount > 0"
                :key="cartCount"
                class="absolute -top-1 -right-1 bg-[#d00000] text-white text-[11px] font-black min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full border-2 border-white shadow-md"
              >
                {{ cartCount > 99 ? '99+' : cartCount }}
              </span>
            </transition>
          </RouterLink>
        </div>
      </div>
    </div>
    <nav
      aria-label="Điều hướng trên điện thoại"
      class="flex justify-center gap-8 border-t border-slate-100 py-3 text-sm font-semibold md:hidden"
    >
      <RouterLink to="/products">Sản phẩm</RouterLink><RouterLink to="/about">Về dự án</RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.font-inter {
  font-family: 'Inter', sans-serif;
}

/* Hiệu ứng nảy khi con số (key) thay đổi */
.pop-enter-active {
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop-in {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.4);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Hiệu ứng trượt xuống cho Dropdown */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
