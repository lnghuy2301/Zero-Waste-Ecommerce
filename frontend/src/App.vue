<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import Chatbot from './components/Chatbot.vue'

const route = useRoute()

// Ẩn Navbar & Footer nếu là trang login/register hoặc trang admin
const isAuthPage = computed(() => {
  return ['login', 'register'].includes(route.name as string) || route.path.startsWith('/admin')
})
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-white text-slate-900 antialiased">
    <Navbar v-if="!isAuthPage" />

    <main
      class="flex-grow relative bg-cover bg-center bg-no-repeat transition-all duration-500"
      :class="{ 'px-0 sm:px-4': !isAuthPage }"
    >
      <div v-if="!isAuthPage" class="absolute inset-0 bg-white/80 z-0"></div>

      <div :class="{ 'relative z-10 container mx-auto px-4': !isAuthPage }">
        <RouterView />
      </div>
    </main>

    <Chatbot v-if="!isAuthPage" />
    <Footer v-if="!isAuthPage" />
  </div>
</template>

<style scoped>
/* Bạn có thể thêm hiệu ứng mượt ở đây */
</style>
