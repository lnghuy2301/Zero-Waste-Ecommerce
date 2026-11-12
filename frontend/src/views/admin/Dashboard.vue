<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AdminService from '@/service/admin.ts'
import { notify } from '@/utils/notifier.ts'
import Chart from 'chart.js/auto'

// 1. Khai báo State
const stats = ref({
  totalUsers: 0,
  totalOrders: 0,
  totalProducts: 0,
  totalRevenue: 0,
  totalInventory: 0,
  totalSold: 0,
  monthlyRevenue: Array(12).fill(0),
  statusCount: {} as Record<string, number>,
})

let revenueChart: Chart | null = null
let statusChart: Chart | null = null

const revenueCanvas = ref<HTMLCanvasElement | null>(null)
const statusCanvas = ref<HTMLCanvasElement | null>(null)

// Format số rút gọn (Ví dụ: 1.2Tr thay vì 1.200.000)
const formatCompactNumber = (number: number) => {
  return Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number)
}

// 2. Fetch dữ liệu từ Service
onMounted(async () => {
  try {
    const data = await AdminService.getStats()
    stats.value = {
      ...stats.value,
      ...data,
    }
    // Gọi hàm vẽ biểu đồ sau khi đã có dữ liệu
    initCharts()
  } catch (e) {
    notify.error('Không tải được dữ liệu thống kê')
  }
})

const initCharts = () => {
  // --- BIỂU ĐỒ DOANH THU (LINE CHART) ---
  if (revenueCanvas.value) {
    const ctx = revenueCanvas.value.getContext('2d')
    const gradient = ctx?.createLinearGradient(0, 0, 0, 400)
    gradient?.addColorStop(0, 'rgba(101, 138, 34, 0.4)')
    gradient?.addColorStop(1, 'rgba(101, 138, 34, 0)')

    revenueChart = new Chart(revenueCanvas.value, {
      type: 'line',
      data: {
        labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
        datasets: [
          {
            label: 'Doanh thu',
            data: stats.value.monthlyRevenue,
            borderColor: '#658a22',
            backgroundColor: gradient || '#658a22',
            fill: true,
            tension: 0.4,
            borderWidth: 4,
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#658a22',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (value: any) => formatCompactNumber(value) },
            grid: { color: '#f1f5f9' },
          },
          x: { grid: { display: false } },
        },
      },
    })
  }

  // --- BIỂU ĐỒ TRẠNG THÁI (DOUGHNUT CHART) ---
  if (statusCanvas.value) {
    // Cấu hình màu sắc và nhãn hiển thị cố định cho từng Key từ Backend
    const statusConfig: Record<string, { label: string; color: string }> = {
      COMPLETED: { label: 'Hoàn thành', color: '#10b981' }, // Xanh lá
      SHIPPING: { label: 'Đang giao', color: '#3b82f6' }, // Xanh dương
      PENDING: { label: 'Chờ xử lý', color: '#f59e0b' }, // Vàng
      CANCELLED: { label: 'Đã hủy', color: '#ef4444' }, // Đỏ
    }

    const rawKeys = Object.keys(stats.value.statusCount)
    const labels = rawKeys.map((key) => statusConfig[key]?.label || key)
    const colors = rawKeys.map((key) => statusConfig[key]?.color || '#94a3b8')
    const dataValues = Object.values(stats.value.statusCount)

    statusChart = new Chart(statusCanvas.value, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            onClick: () => null, // Chống gạch tên khi click
            labels: {
              usePointStyle: true,
              padding: 25,
              font: { weight: 'bold', size: 12 },
            },
          },
        },
      },
    })
  }
}

// Cleanup biểu đồ khi rời trang để tránh lỗi bộ nhớ
onBeforeUnmount(() => {
  revenueChart?.destroy()
  statusChart?.destroy()
})
</script>

<template>
  <div class="max-w-7xl mx-auto p-6 space-y-8 animate-in">
    <div class="flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Tổng quan hệ thống</h1>
        <p class="text-slate-500 font-medium">Thống kê từ dữ liệu cửa hàng demo</p>
      </div>
      <div
        class="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-sm font-bold text-slate-600"
      >
        Năm {{ new Date().getFullYear() }}
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
      <div
        class="xl:col-span-2 bg-[#658a22] rounded-[32px] p-7 shadow-xl shadow-emerald-100 text-white relative overflow-hidden group"
      >
        <div
          class="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full transition-transform group-hover:scale-125"
        ></div>
        <div class="relative z-10 flex flex-col justify-between h-full">
          <div class="p-3 bg-white/20 w-fit rounded-2xl mb-4 backdrop-blur-md">
            <span class="material-symbols-outlined text-3xl">payments</span>
          </div>
          <div>
            <p class="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
              Tổng doanh thu
            </p>
            <p class="text-3xl font-black">{{ stats.totalRevenue.toLocaleString('vi-VN') }}đ</p>
          </div>
        </div>
      </div>

      <RouterLink
        to="/admin/accounts"
        class="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 group hover:border-emerald-200 transition-all cursor-pointer block"
      >
        <div
          class="p-3 bg-emerald-50 text-emerald-600 w-fit rounded-2xl mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors"
        >
          <span class="material-symbols-outlined text-2xl">group</span>
        </div>
        <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
          Khách hàng
        </p>
        <p class="text-2xl font-black text-slate-800">{{ stats.totalUsers }}</p>
      </RouterLink>

      <RouterLink
        to="/admin/orders"
        class="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 group hover:border-blue-200 transition-all cursor-pointer block"
      >
        <div
          class="p-3 bg-blue-50 text-blue-600 w-fit rounded-2xl mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors"
        >
          <span class="material-symbols-outlined text-2xl">shopping_cart</span>
        </div>
        <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Đơn hàng</p>
        <p class="text-2xl font-black text-slate-800">{{ stats.totalOrders }}</p>
      </RouterLink>

      <div
        class="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 group border-b-4 border-b-blue-400"
      >
        <div class="p-3 bg-blue-50 text-blue-500 w-fit rounded-2xl mb-4">
          <span class="material-symbols-outlined text-2xl">check_circle</span>
        </div>
        <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Đã bán</p>
        <p class="text-2xl font-black text-slate-800">{{ stats.totalSold }}</p>
      </div>

      <div
        class="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 group border-b-4 border-b-amber-400"
      >
        <div class="p-3 bg-amber-50 text-amber-500 w-fit rounded-2xl mb-4">
          <span class="material-symbols-outlined text-2xl">inventory</span>
        </div>
        <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Tồn kho</p>
        <p class="text-2xl font-black text-slate-800">{{ stats.totalInventory }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div
        class="lg:col-span-2 bg-white rounded-[40px] p-8 shadow-sm border border-slate-50 min-h-[480px]"
      >
        <div class="flex items-center justify-between mb-10">
          <h3 class="font-black text-slate-800 text-xl flex items-center gap-3">
            <span class="w-2.5 h-8 bg-[#658a22] rounded-full"></span>
            Phân tích doanh thu
          </h3>
          <div class="flex gap-2">
            <div class="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <span class="w-3 h-3 rounded-full bg-[#658a22]"></span> Doanh thu tháng
            </div>
          </div>
        </div>
        <div class="h-[340px]">
          <canvas ref="revenueCanvas"></canvas>
        </div>
      </div>

      <div class="bg-white rounded-[40px] p-8 shadow-sm border border-slate-50 min-h-[480px]">
        <h3 class="font-black text-slate-800 text-xl mb-10 flex items-center gap-3">
          <span class="w-2.5 h-8 bg-blue-500 rounded-full"></span>
          Trạng thái đơn
        </h3>
        <div class="h-[300px] relative">
          <canvas ref="statusCanvas"></canvas>
          <div
            class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -translate-y-6"
          >
            <span class="text-slate-400 text-[10px] font-bold uppercase tracking-tighter"
              >Tổng cộng</span
            >
            <span class="text-3xl font-black text-slate-800">{{ stats.totalOrders }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hiệu ứng load trang */
.animate-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hover mượt cho các Card */
.grid > div {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.grid > div:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.05);
}
</style>
