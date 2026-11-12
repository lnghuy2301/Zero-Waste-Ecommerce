<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import Order from '@/service/order.ts'
import { notify } from '@/utils/notifier.ts'

const orders = ref<any[]>([])
const loading = ref(false)
const selectedOrderIds = ref<number[]>([])
// === LỌC & PHÂN TRANG ===

const showDetailModal = ref(false)
const showInvoiceModal = ref(false)
const currentOrder = ref<any>(null)

// --- TÌM KIẾM & LỌC ---
const searchAccountId = ref('')
const filterStatus = ref('ALL')

// --- PHÂN TRANG ---
const currentPage = ref(1)
const pageSize = ref(10)

const filteredOrders = computed(() => {
  let result = orders.value

  // Lọc theo trạng thái trước
  if (filterStatus.value !== 'ALL') {
    result = result.filter((order) => order.status === filterStatus.value)
  }

  // Lọc theo ID khách hàng
  if (searchAccountId.value.trim()) {
    result = result.filter((order) =>
      String(order.accountId).toLowerCase().includes(searchAccountId.value.trim().toLowerCase()),
    )
  }

  return result
})

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / pageSize.value))

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredOrders.value.slice(start, start + pageSize.value)
})

const pageNumbers = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (cur > 3) pages.push('...')
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
    if (cur < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

// Xử lý in hóa đơn từ màn Chi tiết (Không đóng modal chi tiết nữa)
const handlePrintInvoice = () => {
  if (currentOrder.value) {
    showInvoiceModal.value = true
  }
}

// Reset trang khi tìm kiếm
const onSearch = () => {
  currentPage.value = 1
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await Order.getAllOrders()
    orders.value = Array.isArray(res) ? res : res.data || []
  } catch (e: any) {
    console.error(e)
    notify.error('Không tải được danh sách đơn hàng')
    orders.value = []
  } finally {
    loading.value = false
  }
}

const toggleSelect = (id: number) => {
  const index = selectedOrderIds.value.indexOf(id)
  if (index > -1) selectedOrderIds.value.splice(index, 1)
  else selectedOrderIds.value.push(id)
}

const viewDetail = (order: any) => {
  currentOrder.value = order
  showDetailModal.value = true
}

// --- LOGIC TÁCH CHUỖI ĐỊA CHỈ GIAO HÀNG ---
const parseShippingAddress = (addressStr?: string) => {
  if (!addressStr) return { name: 'Khách hàng', phone: '---', detail: '---' }

  // Tách chuỗi dựa trên ký tự " - "
  const parts = addressStr.split(' - ')
  if (parts.length >= 3) {
    return {
      name: (parts[0] || '').trim(),
      phone: (parts[1] || '').trim(),
      detail: parts.slice(2).join(' - ').trim(),
    }
  }

  // Nếu chuỗi không có dấu " - ", trả về toàn bộ chuỗi vào ô Địa chỉ
  return { name: 'Khách hàng', phone: '---', detail: addressStr }
}

const printInvoice = () => {
  const content = document.getElementById('invoice-content')
  if (!content) return

  let printRoot = document.getElementById('invoice-print-root')
  if (!printRoot) {
    printRoot = document.createElement('div')
    printRoot.id = 'invoice-print-root'
    document.body.appendChild(printRoot)
  }

  // Clone nguyên bản nội dung để giữ form hóa đơn đẹp nhất
  const clone = content.cloneNode(true) as HTMLElement

  printRoot.innerHTML = ''
  printRoot.appendChild(clone)

  window.print()

  // Dọn dẹp DOM ngay sau khi mở hộp thoại in
  setTimeout(() => {
    printRoot.remove()
  }, 500)
}

const updateStatus = async (id: number, status: string) => {
  if (!confirm(`Đổi trạng thái đơn hàng thành "${status}"?`)) return
  try {
    await Order.updateOrderStatus(id, status)
    notify.success(`Đã cập nhật thành ${status}`)
    loadOrders()
  } catch (e) {
    notify.error('Cập nhật trạng thái thất bại')
  }
}

const cancelOrder = async (id: number) => {
  if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return
  try {
    await Order.updateOrderStatus(id, 'CANCELLED')
    notify.success('Đã hủy đơn hàng thành công')
    loadOrders()
  } catch (e) {
    notify.error('Hủy đơn hàng thất bại')
  }
}

const deleteSelected = async () => {
  if (selectedOrderIds.value.length === 0) return
  if (!confirm(`Xóa ${selectedOrderIds.value.length} đơn hàng?`)) return
  try {
    await Order.deleteListOrders(selectedOrderIds.value)
    notify.success('Xóa thành công')
    selectedOrderIds.value = []
    loadOrders()
  } catch (e) {
    notify.error('Xóa thất bại')
  }
}

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  PAID: 'Đã thanh toán',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
}

onMounted(loadOrders)
</script>

<template>
  <div class="max-w-[1400px] mx-auto p-8 min-h-screen">
    <div
      class="flex flex-wrap justify-between items-center mb-8 sticky top-0 z-40 bg-white/60 backdrop-blur-xl py-5 -mx-8 px-8 border-b border-slate-100 shadow-sm"
    >
      <div>
        <h1 class="text-4xl font-black text-slate-900 tracking-tight leading-tight">
          Quản lý Đơn hàng
        </h1>
        <p class="text-slate-500 text-base font-medium mt-1">
          {{ filteredOrders.length }} đơn hàng •
          <span class="text-[#658a22] font-bold">Chỉ Admin</span>
        </p>
      </div>

      <div class="flex items-center gap-4 mt-3 sm:mt-0 flex-wrap justify-end">
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            v-model="searchAccountId"
            @input="onSearch"
            type="text"
            placeholder="Tìm ID khách hàng..."
            class="pl-11 pr-5 py-3.5 bg-white border-2 border-slate-100 focus:border-[#658a22] rounded-2xl outline-none transition-all w-60 xl:w-72 font-semibold text-slate-700 text-base shadow-sm"
          />
        </div>

        <select
          v-model="filterStatus"
          @change="onSearch"
          class="py-3.5 px-4 bg-white border-2 border-slate-100 rounded-2xl outline-none font-semibold text-slate-600 text-base cursor-pointer focus:border-[#658a22] transition-all shadow-sm"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="SHIPPING">Đang giao</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>

        <select
          v-model="pageSize"
          @change="currentPage = 1"
          class="py-3.5 px-4 bg-white border-2 border-slate-100 rounded-2xl outline-none font-semibold text-slate-600 text-base cursor-pointer focus:border-[#658a22] transition-all shadow-sm"
        >
          <option :value="5">5 / trang</option>
          <option :value="10">10 / trang</option>
          <option :value="20">20 / trang</option>
          <option :value="50">50 / trang</option>
        </select>

        <button
          v-if="selectedOrderIds.length > 0"
          @click="deleteSelected"
          class="bg-red-500 hover:bg-red-600 active:scale-95 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-red-100 transition-all text-base"
        >
          🗑 Xóa {{ selectedOrderIds.length }} đơn
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-32">
      <div
        class="inline-block w-12 h-12 border-4 border-[#658a22]/30 border-t-[#658a22] rounded-full animate-spin mb-4"
      ></div>
      <p class="font-bold text-slate-400 uppercase tracking-widest text-sm">Đang tải đơn hàng...</p>
    </div>

    <div v-else class="bg-white rounded-[28px] shadow-lg overflow-hidden border border-slate-100">
      <div class="overflow-x-auto">
        <table class="w-full text-base min-w-[1100px]">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="px-6 py-5 w-12"></th>
              <th
                class="px-6 py-5 text-left font-bold text-slate-400 uppercase text-xs tracking-widest"
              >
                Mã đơn
              </th>
              <th
                class="px-6 py-5 text-left font-bold text-slate-400 uppercase text-xs tracking-widest"
              >
                KH ID
              </th>
              <th
                class="px-6 py-5 text-left font-bold text-slate-400 uppercase text-xs tracking-widest"
              >
                Tổng tiền
              </th>
              <th
                class="px-6 py-5 text-left font-bold text-slate-400 uppercase text-xs tracking-widest"
              >
                Trạng thái
              </th>
              <th
                class="px-6 py-5 text-left font-bold text-slate-400 uppercase text-xs tracking-widest"
              >
                Địa chỉ giao
              </th>
              <th
                class="px-6 py-5 text-left font-bold text-slate-400 uppercase text-xs tracking-widest"
              >
                Ngày tạo
              </th>
              <th
                class="px-6 py-5 text-center font-bold text-slate-400 uppercase text-xs tracking-widest"
              >
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr
              v-for="order in paginatedOrders"
              :key="order.id"
              @click="toggleSelect(order.id)"
              class="hover:bg-slate-50/80 cursor-pointer transition-all group"
              :class="
                selectedOrderIds.includes(order.id)
                  ? 'bg-[#f5fae8] border-l-4 border-[#658a22]'
                  : ''
              "
            >
              <td class="px-6 py-5 text-center">
                <div
                  v-if="selectedOrderIds.includes(order.id)"
                  class="w-6 h-6 mx-auto bg-[#658a22] text-white rounded-full flex items-center justify-center text-sm font-black shadow"
                >
                  ✓
                </div>
                <div
                  v-else
                  class="w-6 h-6 mx-auto border-2 border-slate-200 rounded-full group-hover:border-[#658a22]/40 transition-all"
                ></div>
              </td>

              <td class="px-6 py-5">
                <span class="font-black text-slate-800 text-base">{{ order.code || 'N/A' }}</span>
              </td>

              <td class="px-6 py-5">
                <span class="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-sm"
                  >#{{ order.accountId }}</span
                >
              </td>

              <td class="px-6 py-5">
                <span class="font-black text-emerald-600 text-base">
                  {{ Number(order.totalAmount || 0).toLocaleString('vi-VN') }}₫
                </span>
              </td>

              <td class="px-6 py-5">
                <span
                  class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-tight rounded-xl"
                  :class="{
                    'bg-amber-50 text-amber-700 border border-amber-200':
                      order.status === 'PENDING',
                    'bg-blue-50 text-blue-700 border border-blue-200': order.status === 'PAID',
                    'bg-violet-50 text-violet-700 border border-violet-200':
                      order.status === 'SHIPPING',
                    'bg-emerald-50 text-emerald-700 border border-emerald-200':
                      order.status === 'COMPLETED',
                    'bg-red-50 text-red-600 border border-red-200': order.status === 'CANCELLED',
                  }"
                >
                  <span>{{
                    order.status === 'PENDING'
                      ? '⏳'
                      : order.status === 'PAID'
                        ? '💳'
                        : order.status === 'SHIPPING'
                          ? '🚚'
                          : order.status === 'COMPLETED'
                            ? '✅'
                            : '❌'
                  }}</span>
                  {{ statusLabel[order.status] || order.status }}
                </span>
              </td>

              <td class="px-6 py-5 text-slate-500 text-sm font-medium max-w-[200px] truncate">
                {{ order.shippingAddress }}
              </td>

              <td class="px-6 py-5 text-slate-400 text-sm font-semibold whitespace-nowrap">
                {{ new Date(order.createdAt).toLocaleString('vi-VN') }}
              </td>

              <td class="px-6 py-5" @click.stop>
                <div class="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    @click="viewDetail(order)"
                    class="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all whitespace-nowrap"
                  >
                    Chi tiết
                  </button>

                  <button
                    v-if="order.status === 'PENDING'"
                    @click="updateStatus(order.id, 'PAID')"
                    class="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all whitespace-nowrap"
                  >
                    Thanh toán
                  </button>
                  <button
                    v-if="order.status === 'PAID'"
                    @click="updateStatus(order.id, 'SHIPPING')"
                    class="px-4 py-2 bg-violet-50 text-violet-600 rounded-xl text-sm font-bold hover:bg-violet-100 transition-all whitespace-nowrap"
                  >
                    Giao hàng
                  </button>
                  <button
                    v-if="order.status === 'SHIPPING'"
                    @click="updateStatus(order.id, 'COMPLETED')"
                    class="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all whitespace-nowrap"
                  >
                    Hoàn thành
                  </button>
                  <button
                    v-if="order.status === 'PENDING'"
                    @click="cancelOrder(order.id)"
                    class="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-bold hover:bg-red-100 transition-all whitespace-nowrap"
                  >
                    Hủy đơn
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="paginatedOrders.length === 0">
              <td colspan="8" class="py-24 text-center">
                <div class="text-5xl mb-4">📦</div>
                <p class="text-slate-400 font-bold text-lg">Không có đơn hàng nào</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/50"
      >
        <p class="text-sm text-slate-400 font-semibold">
          Hiển thị {{ (currentPage - 1) * pageSize + 1 }}–{{
            Math.min(currentPage * pageSize, filteredOrders.length)
          }}
          trong tổng số
          <span class="text-slate-700 font-black">{{ filteredOrders.length }}</span> đơn hàng
        </p>

        <div class="flex items-center gap-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="w-10 h-10 rounded-xl border-2 border-slate-200 font-bold text-slate-400 hover:border-[#658a22] hover:text-[#658a22] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ‹
          </button>

          <template v-for="p in pageNumbers" :key="p">
            <span
              v-if="p === '...'"
              class="w-10 h-10 flex items-center justify-center text-slate-300 font-bold"
              >…</span
            >
            <button
              v-else
              @click="currentPage = Number(p)"
              class="w-10 h-10 rounded-xl font-bold text-sm transition-all border-2"
              :class="
                currentPage === p
                  ? 'bg-[#658a22] text-white border-[#658a22] shadow-md shadow-[#658a22]/20'
                  : 'border-slate-200 text-slate-500 hover:border-[#658a22] hover:text-[#658a22]'
              "
            >
              {{ p }}
            </button>
          </template>

          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="w-10 h-10 rounded-xl border-2 border-slate-200 font-bold text-slate-400 hover:border-[#658a22] hover:text-[#658a22] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ›
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDetailModal"
          class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          @click.self="showDetailModal = false"
        >
          <div
            class="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-auto"
            @click.stop
          >
            <div
              class="sticky top-0 bg-white rounded-t-[32px] px-10 pt-10 pb-6 border-b border-slate-100 z-10"
            >
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="text-2xl font-black text-slate-900">Chi tiết đơn hàng</h2>
                  <p class="text-[#658a22] font-bold text-lg mt-0.5">{{ currentOrder?.code }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <button
                    @click="handlePrintInvoice"
                    class="flex items-center gap-2 px-5 py-3 bg-[#658a22] text-white rounded-2xl font-bold hover:bg-[#547320] active:scale-95 transition-all shadow-lg shadow-[#658a22]/20"
                  >
                    🖨 Xem hóa đơn
                  </button>
                  <button
                    @click="showDetailModal = false"
                    class="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-500 font-black text-lg transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div class="px-10 py-8">
              <div class="grid grid-cols-2 gap-6 mb-8">
                <div class="bg-emerald-50 rounded-2xl p-5">
                  <p class="text-emerald-600 text-xs font-black uppercase tracking-widest mb-1">
                    Tổng tiền
                  </p>
                  <p class="text-3xl font-black text-emerald-700">
                    {{ Number(currentOrder?.totalAmount || 0).toLocaleString('vi-VN') }}₫
                  </p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-5">
                  <p class="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">
                    Trạng thái
                  </p>
                  <span
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-tight"
                    :class="{
                      'bg-amber-100 text-amber-700': currentOrder?.status === 'PENDING',
                      'bg-blue-100 text-blue-700': currentOrder?.status === 'PAID',
                      'bg-violet-100 text-violet-700': currentOrder?.status === 'SHIPPING',
                      'bg-emerald-100 text-emerald-700': currentOrder?.status === 'COMPLETED',
                      'bg-red-100 text-red-600': currentOrder?.status === 'CANCELLED',
                    }"
                    >{{ statusLabel[currentOrder?.status] || currentOrder?.status }}</span
                  >
                </div>
                <div class="bg-slate-50 rounded-2xl p-5">
                  <p class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">
                    Địa chỉ giao hàng
                  </p>
                  <p class="font-bold text-slate-800 text-base">
                    {{ currentOrder?.shippingAddress }}
                  </p>
                </div>
                <div class="bg-slate-50 rounded-2xl p-5">
                  <p class="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">
                    Ngày tạo
                  </p>
                  <p class="font-bold text-slate-800 text-base">
                    {{ new Date(currentOrder?.createdAt).toLocaleString('vi-VN') }}
                  </p>
                </div>
              </div>

              <h3 class="font-black text-lg mb-4 text-slate-900">Danh sách sản phẩm</h3>
              <div class="space-y-3">
                <div
                  v-for="item in currentOrder?.orderItems || []"
                  :key="item.id"
                  class="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-100"
                >
                  <div>
                    <p class="font-bold text-slate-800 text-base">
                      {{ item.variant?.name || 'Sản phẩm' }}
                    </p>
                    <p class="text-sm text-slate-500 font-medium mt-0.5">
                      Số lượng: <span class="text-[#658a22] font-black">{{ item.quantity }}</span>
                    </p>
                  </div>
                  <p class="font-black text-emerald-600 text-lg">
                    {{ Number(item.price).toLocaleString('vi-VN') }}₫
                  </p>
                </div>
                <div
                  v-if="!currentOrder?.orderItems?.length"
                  class="text-center py-8 text-slate-400 font-semibold"
                >
                  Không có sản phẩm
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showInvoiceModal"
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
          @click.self="showInvoiceModal = false"
        >
          <div
            class="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl max-h-[95vh] overflow-auto"
            @click.stop
          >
            <div
              class="flex items-center justify-between px-8 py-5 border-b border-slate-100 print:hidden"
            >
              <p class="font-black text-slate-600 uppercase text-xs tracking-widest">
                Xem trước hóa đơn
              </p>
              <div class="flex gap-3">
                <button
                  @click="printInvoice"
                  class="flex items-center gap-2 px-6 py-3 bg-[#658a22] text-white rounded-2xl font-bold hover:bg-[#547320] active:scale-95 transition-all shadow-lg shadow-[#658a22]/20"
                >
                  🖨 In hóa đơn
                </button>
                <button
                  @click="showInvoiceModal = false"
                  class="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-500 font-black transition-all"
                >
                  ×
                </button>
              </div>
            </div>

            <div id="invoice-content" class="px-12 py-10">
              <div class="text-center mb-8">
                <div
                  class="inline-block bg-[#658a22] text-white px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest mb-3"
                >
                  EcoStore
                </div>
                <h1 class="text-3xl font-black text-slate-900 tracking-tight">HÓA ĐƠN BÁN HÀNG</h1>
                <p class="text-slate-400 font-medium mt-1">Cảm ơn bạn đã mua hàng!</p>
              </div>

              <div
                class="flex justify-between items-start mb-8 pb-6 border-b-2 border-dashed border-slate-200"
              >
                <div>
                  <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Mã đơn hàng
                  </p>
                  <p class="font-black text-xl text-slate-900 mt-1">
                    {{ currentOrder?.code || 'N/A' }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Ngày xuất
                  </p>
                  <p class="font-bold text-slate-700 mt-1">
                    {{ new Date().toLocaleDateString('vi-VN') }}
                  </p>
                </div>
              </div>

              <div class="bg-slate-50/80 rounded-2xl p-6 mb-8 border border-slate-100">
                <div class="flex items-center gap-2 mb-5">
                  <span class="text-slate-800 text-lg">🚚</span>
                  <p class="text-slate-800 text-sm font-black uppercase tracking-widest">
                    Thông tin giao hàng
                  </p>
                </div>

                <div class="space-y-4">
                  <div class="flex gap-4">
                    <div
                      class="bg-white rounded-xl p-4 flex-1 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100"
                    >
                      <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">
                        Người nhận
                      </p>
                      <p class="font-black text-slate-800 text-base">
                        {{ parseShippingAddress(currentOrder?.shippingAddress).name }}
                      </p>
                    </div>

                    <div
                      class="bg-white rounded-xl p-4 flex-1 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100"
                    >
                      <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">
                        Số điện thoại
                      </p>
                      <p class="font-black text-slate-800 text-base">
                        {{ parseShippingAddress(currentOrder?.shippingAddress).phone }}
                      </p>
                    </div>
                  </div>

                  <div
                    class="bg-white rounded-xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100"
                  >
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">
                      Địa chỉ chi tiết
                    </p>
                    <p class="font-bold text-slate-800 text-base">
                      {{ parseShippingAddress(currentOrder?.shippingAddress).detail }}
                    </p>
                  </div>
                </div>
              </div>
              <table class="w-full mb-8">
                <thead>
                  <tr class="bg-slate-800 text-white">
                    <th
                      class="px-5 py-3 text-left text-xs font-black uppercase tracking-wider rounded-l-xl"
                    >
                      Sản phẩm
                    </th>
                    <th class="px-7 py-3 text-center text-xs font-black uppercase tracking-wider">
                      SL
                    </th>
                    <th class="px-5 py-3 text-center text-xs font-black uppercase tracking-wider">
                      Đơn giá
                    </th>
                    <th
                      class="px-5 py-3 text-right text-xs font-black uppercase tracking-wider rounded-r-xl"
                    >
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="item in currentOrder?.orderItems || []" :key="item.id">
                    <td class="px-5 py-4 font-semibold text-slate-700">
                      {{ item.variant?.name || 'Sản phẩm' }}
                    </td>
                    <td class="px-5 py-4 text-center font-bold text-slate-600">
                      {{ item.quantity }}
                    </td>
                    <td class="px-5 py-4 text-center font-black text-slate-800">
                      {{ Number(item.price).toLocaleString('vi-VN') }}₫
                    </td>
                    <td class="px-5 py-4 text-right font-black text-slate-800">
                      {{ (Number(item.price) * Number(item.quantity)).toLocaleString('vi-VN') }}₫
                    </td>
                  </tr>
                  <tr v-if="!currentOrder?.orderItems?.length">
                    <td colspan="4" class="py-8 text-center text-slate-400">Không có sản phẩm</td>
                  </tr>
                </tbody>
              </table>

              <div class="border-t-2 border-slate-200 pt-5">
                <div class="flex justify-between items-center">
                  <span class="font-black text-slate-500 uppercase text-sm tracking-widest"
                    >Tổng cộng</span
                  >
                  <span class="font-black text-3xl text-[#658a22]">
                    {{ Number(currentOrder?.totalAmount || 0).toLocaleString('vi-VN') }}₫
                  </span>
                </div>
              </div>

              <div class="mt-10 pt-6 border-t border-dashed border-slate-200 text-center">
                <p class="text-slate-400 text-sm font-medium">
                  Hóa đơn này được tạo tự động bởi hệ thống.
                </p>
                <p class="text-slate-300 text-xs mt-1">{{ new Date().toLocaleString('vi-VN') }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(8px);
}
</style>

<style>
@media print {
  @page {
    margin: 15mm auto;
    size: A4 portrait;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html,
  body {
    background: #ffffff !important;
    background-image: none !important;
  }

  body > *:not(#invoice-print-root) {
    display: none !important;
  }

  #invoice-print-root {
    display: block !important;
    width: 100% !important;
    background-color: white !important;
    margin: 0 !important;
    padding: 0 !important;
    position: relative !important;
    z-index: 9999 !important;
  }
}
</style>
