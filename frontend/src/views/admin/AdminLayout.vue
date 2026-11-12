<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { notify } from '@/utils/notifier.ts'

const router = useRouter()
const isMenuOpen = ref(false) // Trạng thái đóng mở menu trên mobile
const user = ref<any>(null)

onMounted(() => {
  const u = localStorage.getItem('user')
  if (u) user.value = JSON.parse(u)
})

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  notify.success('Đăng xuất thành công')
  router.push('/login')
}

// Hàm đóng menu khi chuyển trang trên mobile
const closeMenu = () => {
  isMenuOpen.value = false
}
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden relative">
    <div
      v-if="isMenuOpen"
      @click="isMenuOpen = false"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
    ></div>

    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-72 bg-[#658a22] text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
        isMenuOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="px-6 py-8 flex items-center justify-between border-b border-white/20">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-4xl">eco</span>
          <span class="text-2xl font-black tracking-tighter text-white">EcoStore</span>
        </div>
        <button @click="isMenuOpen = false" class="lg:hidden text-white">
          <span class="material-symbols-outlined text-3xl">close</span>
        </button>
      </div>

      <nav class="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <RouterLink
          to="/admin"
          @click="closeMenu"
          class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors font-semibold text-white"
          active-class="bg-white/20 shadow-inner"
        >
          <span class="material-symbols-outlined">dashboard</span>
          <span>Tổng quan</span>
        </RouterLink>

        <RouterLink
          to="/admin/products"
          @click="closeMenu"
          class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors font-medium text-white/90"
          active-class="bg-white/20"
        >
          <span class="material-symbols-outlined">inventory_2</span>
          <span>Sản phẩm</span>
        </RouterLink>

        <RouterLink
          to="/admin/orders"
          @click="closeMenu"
          class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors font-medium text-white/90"
          active-class="bg-white/20"
        >
          <span class="material-symbols-outlined">shopping_cart</span>
          <span>Đơn hàng</span>
        </RouterLink>

        <RouterLink
          to="/admin/accounts"
          @click="closeMenu"
          class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors font-medium text-white/90"
          active-class="bg-white/20"
        >
          <span class="material-symbols-outlined">group</span>
          <span>Khách hàng</span>
        </RouterLink>
        <RouterLink
          to="/admin/comments"
          class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors font-medium"
          active-class="bg-white/20 font-bold"
        >
          <span class="material-symbols-outlined">reviews</span>
          <span>Bình luận</span>
        </RouterLink>
      </nav>

      <div class="p-4 border-t border-white/20">
        <button
          @click="logout"
          class="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-semibold transition-colors text-white"
        >
          <span class="material-symbols-outlined">logout</span>
          Đăng xuất
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header
        class="h-16 bg-white border-b flex items-center px-4 lg:px-8 justify-between sticky top-0 z-30"
      >
        <div class="flex items-center gap-4">
          <button
            @click="isMenuOpen = true"
            class="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <span class="material-symbols-outlined text-slate-700 text-3xl">menu</span>
          </button>

          <h1 class="text-lg lg:text-xl font-bold text-slate-900 truncate">Admin Panel</h1>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden sm:block text-right">
            <p class="text-sm font-semibold text-slate-700 leading-tight">{{ user?.email }}</p>
            <p class="text-[10px] uppercase font-bold text-emerald-600">Administrator</p>
          </div>
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-white"
            aria-label="Tài khoản quản trị"
            >{{ user?.email?.slice(0, 2) || 'AD' }}</span
          >
        </div>
      </header>

      <main class="flex-1 overflow-auto bg-slate-50 relative p-4 lg:p-0">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Đảm bảo smooth scrolling trên mobile */
main {
  -webkit-overflow-scrolling: touch;
}

/* Custom scrollbar cho Sidebar */
nav::-webkit-scrollbar {
  width: 4px;
}
nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}
</style>
