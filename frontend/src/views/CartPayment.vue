<script setup lang="ts">
import { mediaUrl } from '@/utils/media'
import { effectivePrice } from '@/utils/pricing'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Cart } from '../service/cart.ts'
import { Profile } from '@/service/profile.ts'
import { OrderService } from '@/service/order.ts'
import api from '@/service/api.ts'
import { notify } from '@/utils/notifier.ts'

const router = useRouter()
const cartItems = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)
const paymentMethods = ref<any[]>([])
const selectedIds = ref<number[]>([])
const accountId = ref<number | null>(null)
const shippingInfo = ref({
  fullName: '',
  phone: '',
  address: '',
  note: '',
})
// Mặc định là cod, có thể chuyển sang 'momo' hoặc 'paypal'
const paymentMethod = ref('cod')

// --- HELPER ---
const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value) + 'đ'
}

const getImageUrl = (item: any) => {
  if (!item) return mediaUrl()
  const path =
    item.variant?.image ||
    item.variant?.mainImage ||
    item.variant?.product?.mainImage ||
    item.product?.mainImage ||
    item.image
  return mediaUrl(path)
}

const syncHeaderCart = () => {
  window.dispatchEvent(new CustomEvent('cart-updated'))
}

// --- COMPUTED ---
const selectedItems = computed(() =>
  cartItems.value.filter((item) => selectedIds.value.includes(item.id)),
)

const subtotal = computed(() => {
  return selectedItems.value.reduce((sum, item) => {
    const price = effectivePrice(item.variant)
    return sum + Number(price) * item.quantity
  }, 0)
})

const shippingFee = computed(() => (subtotal.value >= 500000 || subtotal.value === 0 ? 0 : 30000))

const total = computed(() => subtotal.value + shippingFee.value)

const isAllSelected = computed({
  get: () => cartItems.value.length > 0 && selectedIds.value.length === cartItems.value.length,
  set: (val) => {
    selectedIds.value = val ? cartItems.value.map((item) => item.id) : []
  },
})

// --- METHODS ---
const loadUserProfile = async (user: any) => {
  shippingInfo.value.fullName = user.fullName || user.username || ''
  shippingInfo.value.phone = user.phone || ''
  shippingInfo.value.address = user.address || ''

  try {
    const profileData = await Profile.getCustomerProfile(Number(user.id))
    if (profileData) {
      shippingInfo.value.fullName = profileData.fullName || user.fullName || user.username || ''
      shippingInfo.value.phone = profileData.phone || ''
      shippingInfo.value.address = profileData.address || ''
    }
  } catch (error) {
    console.error('Không tải được profile, dùng dữ liệu cũ.', error)
  }
}

const loadCartData = async (userId: number) => {
  try {
    const cartRes = await Cart.getByUser(userId)
    let rawItems = Array.isArray(cartRes) ? cartRes : cartRes.data || []

    cartItems.value = rawItems
    selectedIds.value = cartItems.value.map((item: any) => item.id)
    syncHeaderCart()
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      cartItems.value = []
      selectedIds.value = []
      syncHeaderCart()
    } else {
      console.error('Lỗi tải giỏ hàng:', error)
    }
  }
}

const fetchData = async () => {
  const userJson = localStorage.getItem('user')
  if (!userJson) return

  const user = JSON.parse(userJson)
  accountId.value = Number(user.id)
  loading.value = true

  await Promise.all([loadUserProfile(user), loadCartData(Number(user.id))])

  loading.value = false
}

const handleSubmit = async () => {
  if (selectedItems.value.length === 0) return notify.error('Vui lòng chọn sản phẩm!')

  if (submitting.value) return
  if (
    !shippingInfo.value.fullName.trim() ||
    !/^[0-9+() .-]{9,20}$/.test(shippingInfo.value.phone) ||
    !shippingInfo.value.address.trim()
  ) {
    return notify.error('Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ hợp lệ.')
  }
  submitting.value = true
  try {
    const methods = await api.get('/payment-method')
    paymentMethods.value = methods.data
    const code = { cod: 'COD', momo: 'MOMO_DEMO', paypal: 'PAYPAL_DEMO' }[paymentMethod.value]
    const method = paymentMethods.value.find((m: any) => m.code === code && m.isActive)
    if (!method) throw new Error('Phương thức thanh toán chưa được cấu hình. Hãy chạy dữ liệu mẫu.')
    const orderPayload = {
      accountId: Number(accountId.value),
      shippingAddress: `${shippingInfo.value.fullName} - ${shippingInfo.value.phone} - ${shippingInfo.value.address}`,
      paymentMethodId: method.id,
      items: selectedItems.value.map((item) => ({
        variantId: Number(item.variantId || item.variant?.id),
        quantity: Number(item.quantity),
      })),
    }

    // Backend tự động tạo đơn và trừ kho an toàn
    const response = await OrderService.createOrder(orderPayload)

    if (response) {
      const orderId = response.id || response.data?.id

      if (paymentMethod.value === 'cod') {
        // Chỉ cần xóa giỏ hàng trên máy khách sau khi hoàn tất
        await Cart.deleteList(selectedIds.value)
        syncHeaderCart()
        notify.success('Đặt hàng thành công!')
        router.push('/orders')
      } else {
        const ids = selectedIds.value.join(',')
        const name = paymentMethod.value === 'momo' ? 'demo-payment-momo' : 'demo-payment-paypal'

        router.push({
          name: name,
          query: { orderId, amount: Number(response.totalAmount), cartItemIds: ids },
        })
      }
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message || 'Đặt hàng thất bại!'
    notify.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg)
  } finally {
    submitting.value = false
  }
}

// --- LOGIC CẬP NHẬT SỐ LƯỢNG ---
const updateQuantity = async (item: any, change: number) => {
  const maxStock =
    item.variant?.stock ?? item.variant?.stockQuantity ?? item.variant?.quantity ?? 999
  const MAX_LIMIT = 20

  const newQty = item.quantity + change
  if (newQty < 1) return

  if (newQty > maxStock) {
    alert(`Sản phẩm này chỉ còn ${maxStock} trong kho!`)
    return
  }

  if (newQty > MAX_LIMIT) {
    alert(`Bạn chỉ được đặt tối đa ${MAX_LIMIT} sản phẩm!`)
    return
  }

  const oldQty = item.quantity
  item.quantity = newQty

  try {
    const userJson = localStorage.getItem('user')
    const user = userJson ? JSON.parse(userJson) : null
    const vId = Number(item.variantId || item.variant?.id)
    const payload = {
      accountId: Number(user?.id),
      variantId: vId,
      quantity: Number(newQty),
    }
    await Cart.update(item.id, payload)
    syncHeaderCart()
  } catch (e: any) {
    item.quantity = oldQty
  }
}

const handleManualInput = async (item: any, event: Event) => {
  const target = event.target as HTMLInputElement
  let val = Math.floor(Number(target.value))

  const maxStock =
    item.variant?.stock ?? item.variant?.stockQuantity ?? item.variant?.quantity ?? 999
  const MAX_LIMIT = 20

  // Kiểm tra tính hợp lệ
  if (isNaN(val) || val < 1) {
    val = 1
  } else if (val > maxStock) {
    alert(`Sản phẩm này chỉ còn ${maxStock} trong kho!`)
    val = maxStock
  } else if (val > MAX_LIMIT) {
    alert(`Bạn chỉ được đặt tối đa ${MAX_LIMIT} sản phẩm!`)
    val = MAX_LIMIT
  }

  if (val === item.quantity) {
    target.value = String(val)
    return
  }

  const oldQty = item.quantity
  item.quantity = val
  target.value = String(val)

  try {
    const userJson = localStorage.getItem('user')
    const user = userJson ? JSON.parse(userJson) : null
    const vId = Number(item.variantId || item.variant?.id)
    const payload = {
      accountId: Number(user?.id),
      variantId: vId,
      quantity: Number(val),
    }
    await Cart.update(item.id, payload)
    syncHeaderCart()
  } catch (e: any) {
    item.quantity = oldQty
    target.value = String(oldQty)
    notify.error('Lỗi cập nhật số lượng')
  }
}

const removeItem = async (id: number) => {
  if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return
  try {
    await Cart.delete(id)
    cartItems.value = cartItems.value.filter((i) => i.id !== id)
    selectedIds.value = selectedIds.value.filter((sid) => sid !== id)
    notify.success('Xóa sản phẩm thành công')
    syncHeaderCart()
  } catch (error) {
    notify.error('Lỗi khi xóa sản phẩm.')
  }
}

const removeSelectedItems = async () => {
  if (selectedIds.value.length === 0) return alert('Vui lòng chọn sản phẩm!')
  if (!confirm(`Xóa ${selectedIds.value.length} sản phẩm đã chọn?`)) return
  try {
    await Cart.deleteList(selectedIds.value)
    cartItems.value = cartItems.value.filter((item) => !selectedIds.value.includes(item.id))
    selectedIds.value = []
    syncHeaderCart()
    notify.success('Xóa sản phẩm thành công')
  } catch (error) {
    notify.error('Lỗi khi xóa danh sách.')
  }
}

onMounted(fetchData)
</script>

<template>
  <main
    class="mx-auto max-w-[1200px] px-4 py-10 bg-white/60 backdrop-blur-md min-h-screen font-sans rounded-3xl my-6 shadow-2xl border border-white/50"
  >
    <div class="mb-10 text-center lg:text-left px-4">
      <h2 class="text-4xl font-black text-slate-900 uppercase italic">Thanh Toán</h2>
      <p class="text-[#658a22] font-black mt-2 tracking-tight uppercase text-xs italic">
        Cửa hàng Zero Waste - Sống Xanh Mỗi Ngày
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div class="lg:col-span-5">
        <div
          class="bg-white/80 rounded-[2rem] p-6 shadow-xl border-2 border-white/50 h-full flex flex-col"
        >
          <div
            class="flex items-center justify-between mb-6 pb-4 border-b-2 border-dashed border-slate-100 shrink-0"
          >
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                v-model="isAllSelected"
                class="w-5 h-5 accent-[#658a22] cursor-pointer"
              />
              <span class="font-black text-slate-800 uppercase text-xs"
                >Tất cả ({{ cartItems.length }})</span
              >
            </div>
            <button
              @click="removeSelectedItems"
              class="text-red-500 font-black text-[10px] uppercase hover:underline transition-all"
              :disabled="selectedIds.length === 0"
            >
              XÓA ĐÃ CHỌN
            </button>
          </div>

          <div
            class="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[300px] max-h-[450px]"
          >
            <div
              v-if="cartItems.length === 0"
              class="h-full flex items-center justify-center py-16 text-slate-400 font-black uppercase text-xs tracking-widest"
            >
              Giỏ hàng đang trống
            </div>
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="flex gap-4 items-center bg-white p-3 rounded-2xl border border-slate-50 shadow-sm transition-all hover:border-[#658a22]/30"
            >
              <input
                type="checkbox"
                :value="item.id"
                v-model="selectedIds"
                class="w-4 h-4 accent-[#658a22] cursor-pointer"
              />
              <div
                class="w-20 h-20 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0"
              >
                <img :src="getImageUrl(item)" class="w-full h-full object-cover" alt="product" />
              </div>
              <div class="flex-1 min-w-0">
                <h4
                  class="font-bold text-slate-900 text-[13px] line-clamp-2 uppercase italic leading-snug"
                >
                  {{ item.variant?.product?.name || item.product?.name || item.name }}
                </h4>
                <p
                  v-if="item.variant?.name"
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1"
                >
                  {{ item.variant.name }}
                </p>
                <div class="flex justify-between items-center mt-2">
                  <span class="font-black text-[#658a22] text-sm italic">{{
                    formatVND(effectivePrice(item.variant))
                  }}</span>

                  <div
                    class="flex items-center bg-slate-100 rounded-lg overflow-hidden border border-slate-200 h-8"
                  >
                    <button
                      @click="updateQuantity(item, -1)"
                      class="px-3 h-full text-slate-500 font-black hover:bg-slate-200 transition-colors"
                    >
                      -
                    </button>

                    <input
                      type="number"
                      :value="item.quantity"
                      @change="handleManualInput(item, $event)"
                      @blur="handleManualInput(item, $event)"
                      class="w-8 text-center bg-transparent border-none focus:ring-0 text-slate-900 font-black text-[12px] p-0 hide-arrows"
                    />

                    <button
                      @click="updateQuantity(item, 1)"
                      class="px-3 h-full text-slate-500 font-black hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      :disabled="
                        item.quantity >= 20 ||
                        item.quantity >=
                          (item.variant?.stock ??
                            item.variant?.stockQuantity ??
                            item.variant?.quantity ??
                            999)
                      "
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-6 pt-6 border-t-2 border-slate-100 space-y-3 font-bold text-[11px] uppercase text-slate-400 shrink-0"
          >
            <div class="flex justify-between">
              <span>Tạm tính</span
              ><span class="text-slate-600 font-black">{{ formatVND(subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Phí ship</span
              ><span class="text-slate-600 font-black">{{
                shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)
              }}</span>
            </div>
            <div
              class="flex justify-between items-end text-slate-900 text-xl pt-4 border-t-2 border-dashed italic uppercase"
            >
              <span>Tổng đơn</span
              ><span class="text-[#658a22] font-black text-2xl tracking-tighter">{{
                formatVND(total)
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-7 space-y-8 text-slate-800">
        <section
          class="bg-white/80 p-6 md:p-8 rounded-[2rem] shadow-xl border-2 border-white/50 relative overflow-hidden transition-all hover:shadow-2xl"
        >
          <h3
            class="text-xl font-black mb-6 uppercase italic flex items-center gap-3 relative z-10"
          >
            <span
              class="bg-[#658a22] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md"
              >01</span
            >
            THÔNG TIN GIAO HÀNG
          </h3>
          <div class="space-y-4 relative z-10">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                v-model="shippingInfo.fullName"
                placeholder="Họ tên người nhận"
                class="p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-[#658a22] outline-none font-bold text-sm shadow-sm transition-colors"
              />
              <input
                v-model="shippingInfo.phone"
                placeholder="Số điện thoại"
                class="p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-[#658a22] outline-none font-bold text-sm shadow-sm transition-colors"
              />
            </div>
            <input
              v-model="shippingInfo.address"
              placeholder="Địa chỉ chi tiết (Số nhà, đường...)"
              class="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-[#658a22] outline-none font-bold text-sm shadow-sm transition-colors"
            />
            <textarea
              v-model="shippingInfo.note"
              placeholder="Ghi chú thêm cho shipper..."
              class="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-[#658a22] outline-none font-bold text-sm h-28 resize-none shadow-sm transition-colors"
            ></textarea>
          </div>
        </section>

        <section
          class="bg-white/80 p-6 md:p-8 rounded-[2rem] shadow-xl border-2 border-white/50 transition-all hover:shadow-2xl"
        >
          <h3 class="text-xl font-black mb-6 uppercase italic flex items-center gap-3">
            <span
              class="bg-[#658a22] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md"
              >02</span
            >
            THANH TOÁN
          </h3>
          <div class="space-y-3">
            <label
              :class="[
                'flex items-center p-5 rounded-2xl cursor-pointer border-2 transition-all shadow-sm',
                paymentMethod === 'cod'
                  ? 'border-[#658a22] bg-[#f4f7ee]'
                  : 'border-slate-100 bg-white hover:border-slate-200',
              ]"
            >
              <input
                type="radio"
                v-model="paymentMethod"
                value="cod"
                class="w-4 h-4 accent-[#658a22]"
              />
              <div class="ml-3 flex items-center justify-between w-full">
                <span class="font-bold uppercase text-xs tracking-wider">Tiền mặt (COD)</span>
                <span class="material-symbols-outlined text-slate-400 text-lg">local_shipping</span>
              </div>
            </label>

            <div
              :class="[
                'rounded-2xl border-2 transition-all shadow-sm overflow-hidden',
                paymentMethod === 'momo' || paymentMethod === 'paypal'
                  ? 'border-[#658a22] bg-[#f4f7ee]'
                  : 'border-slate-100 bg-white',
              ]"
            >
              <label class="flex items-center p-5 cursor-pointer" @click="paymentMethod = 'momo'">
                <input
                  type="radio"
                  :checked="paymentMethod === 'momo' || paymentMethod === 'paypal'"
                  class="w-4 h-4 accent-[#658a22]"
                />
                <div class="ml-3 flex items-center justify-between w-full">
                  <span class="font-bold uppercase text-xs tracking-wider"
                    >Chuyển khoản / QR Pay</span
                  >
                  <span class="material-symbols-outlined text-slate-400 text-lg">qr_code_2</span>
                </div>
              </label>

              <div
                v-if="paymentMethod === 'momo' || paymentMethod === 'paypal'"
                class="px-5 pb-5 grid grid-cols-2 gap-4"
              >
                <button
                  @click="paymentMethod = 'momo'"
                  :class="[
                    'p-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all',
                    paymentMethod === 'momo'
                      ? 'border-[#A50064] bg-white text-[#A50064] shadow-md'
                      : 'border-slate-200 bg-white text-slate-400',
                  ]"
                >
                  MOMO
                </button>
                <button
                  @click="paymentMethod = 'paypal'"
                  :class="[
                    'p-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all',
                    paymentMethod === 'paypal'
                      ? 'border-[#003087] bg-white text-[#003087] shadow-md'
                      : 'border-slate-200 bg-white text-slate-400',
                  ]"
                >
                  PAYPAL
                </button>
              </div>
            </div>
          </div>

          <button
            @click="handleSubmit"
            :disabled="submitting || cartItems.length === 0 || selectedItems.length === 0"
            class="w-full mt-8 bg-[#1e293b] hover:bg-black text-white p-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            XÁC NHẬN ĐẶT HÀNG <span class="opacity-50">|</span> {{ formatVND(total) }}
          </button>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Ẩn mũi tên lên/xuống của input number */
.hide-arrows::-webkit-inner-spin-button,
.hide-arrows::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.hide-arrows {
  -moz-appearance: textfield;
}
</style>
