<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <footer class="mt-auto bg-slate-900 px-5 py-14 text-slate-300">
    <div class="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
      <div>
        <RouterLink to="/" class="text-2xl font-bold text-white"
          >EcoStore<span class="text-lime-300">.</span></RouterLink
        >
        <p class="mt-4 max-w-sm text-sm leading-7">
          Những lựa chọn nhỏ cho một ngày ít rác thải hơn. Khám phá đồ dùng có thể tái sử dụng cùng
          EcoStore.
        </p>
        <p class="mt-4 text-xs text-slate-400">
          Dự án demo công khai · Dữ liệu và giao dịch mô phỏng.
        </p>
      </div>
      <nav aria-label="Khám phá" class="space-y-4 text-sm">
        <h2 class="font-bold text-white">Khám phá</h2>
        <RouterLink to="/products" class="block hover:text-lime-300">Tất cả sản phẩm</RouterLink>
        <RouterLink to="/about" class="block hover:text-lime-300">Về dự án</RouterLink>
        <RouterLink to="/orders" class="block hover:text-lime-300">Đơn hàng của bạn</RouterLink>
      </nav>
      <nav aria-label="Hỗ trợ" class="space-y-4 text-sm">
        <h2 class="font-bold text-white">Thông tin cửa hàng demo</h2>
        <RouterLink to="/about#shipping" class="block hover:text-lime-300"
          >Giao hàng và đổi trả</RouterLink
        >
        <RouterLink to="/about#privacy" class="block hover:text-lime-300"
          >Dữ liệu và quyền riêng tư</RouterLink
        >
        <p class="text-slate-400">Hỏi EcoBot về sản phẩm và chính sách mẫu.</p>
      </nav>
    </div>
    <div class="mx-auto mt-10 max-w-7xl border-t border-slate-700 pt-6 text-xs text-slate-400">
      © {{ new Date().getFullYear() }} EcoStore · Zero-Waste E-commerce Demo
    </div>
  </footer>
</template>
