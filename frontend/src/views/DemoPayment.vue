<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { OrderService } from '@/service/order'
import { Cart } from '@/service/cart'
import { notify } from '@/utils/notifier'

const props = defineProps<{ provider: string; code: string }>()
const route = useRoute()
const router = useRouter()
const order = ref<any>(null)
const loading = ref(true)
const processing = ref(false)
const error = ref('')
const orderId = Number(route.query.orderId)
const amount = computed(() =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    Number(order.value?.totalAmount || 0),
  ),
)

onMounted(async () => {
  try {
    if (!Number.isSafeInteger(orderId) || orderId < 1) throw new Error('Mã đơn hàng không hợp lệ')
    order.value = await OrderService.getOrderById(orderId)
    if (order.value.paymentMethod?.code !== props.code)
      throw new Error('Phương thức thanh toán không khớp với đơn hàng')
    if (!['PENDING', 'PAID'].includes(order.value.status))
      throw new Error('Đơn hàng không còn chờ thanh toán')
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || 'Không thể tải đơn hàng'
    order.value = null
  } finally {
    loading.value = false
  }
})

const confirm = async () => {
  if (processing.value || !order.value) return
  processing.value = true
  try {
    await OrderService.confirmDemoPayment(orderId)
    const ids = String(route.query.cartItemIds || '')
      .split(',')
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && id > 0)
    if (ids.length) await Cart.deleteList(ids)
    window.dispatchEvent(new CustomEvent('cart-updated'))
    notify.success('Đã xác nhận thanh toán mô phỏng. Không có tiền thật được chuyển.')
    router.push('/orders')
  } catch (e: any) {
    notify.error(e.response?.data?.message || 'Không thể xác nhận thanh toán. Bạn có thể thử lại.')
  } finally {
    processing.value = false
  }
}

const cancel = async () => {
  if (processing.value || !order.value) return
  processing.value = true
  try {
    await OrderService.cancelOrder(orderId)
    notify.info('Đã hủy đơn và hoàn lại tồn kho.')
    router.push('/cartpayment')
  } catch (e: any) {
    notify.error(e.response?.data?.message || 'Không thể hủy đơn hàng.')
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <section class="min-h-[70vh] flex items-center justify-center px-4 py-16">
    <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
      <span class="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900"
        >CHẾ ĐỘ DEMO</span
      >
      <h1 class="mt-5 text-2xl font-bold">Thanh toán {{ provider }}</h1>
      <p class="mt-3 text-sm leading-relaxed text-slate-600">
        Đây là màn hình mô phỏng để trải nghiệm đặt hàng. Không chuyển tiền và không nhập thông tin
        thẻ thật.
      </p>
      <p v-if="loading" class="mt-6" role="status">Đang tải đơn hàng…</p>
      <p v-else-if="error" class="mt-6 text-red-700" role="alert">{{ error }}</p>
      <template v-else-if="order">
        <div class="my-8 rounded-2xl bg-slate-50 p-5">
          <p class="text-sm text-slate-500">Đơn hàng {{ order.code }}</p>
          <p class="mt-2 text-3xl font-bold text-primary">{{ amount }}</p>
          <p class="mt-2 text-xs text-slate-500">Đã bao gồm phí giao hàng mô phỏng.</p>
        </div>
        <button
          :disabled="processing"
          @click="confirm"
          class="w-full rounded-xl bg-primary px-5 py-4 font-bold text-white disabled:opacity-50"
        >
          {{ processing ? 'Đang xử lý…' : 'Xác nhận thanh toán mô phỏng' }}
        </button>
        <button
          v-if="order.status === 'PENDING'"
          :disabled="processing"
          @click="cancel"
          class="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3 text-slate-600 disabled:opacity-50"
        >
          Hủy đơn và quay lại giỏ hàng
        </button>
      </template>
      <RouterLink to="/orders" class="mt-6 block text-center text-sm text-primary underline"
        >Xem đơn hàng</RouterLink
      >
    </div>
  </section>
</template>
