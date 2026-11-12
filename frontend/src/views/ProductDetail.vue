<script setup lang="ts">
import { mediaUrl } from '@/utils/media'
import { notify } from '@/utils/notifier'
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '@/service/api.ts'
import CommentService from '@/service/comment.ts'
import { Cart } from '@/service/cart.ts'
import VueEasyLightbox from 'vue-easy-lightbox'

const route = useRoute()
const product = ref<any>(null)
const variants = ref<any[]>([])
const selectedVariant = ref<any>(null)
const displayImage = computed(() => {
  // Ưu tiên ảnh của biến thể nếu có
  if (selectedVariant.value?.image) {
    return selectedVariant.value.image
  }
  // Không có thì lấy ảnh chính của sản phẩm
  return product.value?.mainImage || null
})

// === TỔNG SỐ LƯỢNG ĐÃ BÁN CỦA TOÀN BỘ SẢN PHẨM ===
const totalSoldQuantity = computed(() => {
  return variants.value.reduce((sum, v) => sum + (v.soldQuantity || 0), 0)
})
const promotions = ref<any[]>([])
const giftProducts = ref<any[]>([])
const loading = ref(true)
const quantity = ref(1)

const isAdding = ref(false)

// --- STATE ĐÁnh giá ---
const allComments = ref<any[]>([]) // toàn bộ comments từ API (dùng để tính stats)
const commentTotal = ref(0)
const isCommentsLoading = ref(false)

// --- FILTERS ---
const visibilityFilter = ref('ALL') // Admin only
const starFilter = ref(0) // 0 = tất cả sao

// --- LIGHTBOX ---
const isLightboxOpen = ref(false)
const imgsRef = ref<string[]>([]) // Danh sách ảnh để phóng to
const onHide = () => (isLightboxOpen.value = false)

// Sửa lại hàm openLightbox cũ của bạn để dùng chung thư viện luôn cho đồng bộ
const openLightbox = (mediaUrl: string) => {
  imgsRef.value = [getImageUrl(mediaUrl)]
  isLightboxOpen.value = true
}
const openMainImageLightbox = () => {
  if (displayImage.value) {
    imgsRef.value = [getImageUrl(displayImage.value)]
    isLightboxOpen.value = true
  }
}
// Cập nhật lại Logic Lightbox để dùng cho cả sản phẩm và comment

// --- ADMIN ---
const isAdmin = ref(false)

const checkAdminRole = () => {
  const userJson = localStorage.getItem('user')
  if (userJson) {
    try {
      const user = JSON.parse(userJson)
      if (user.role === 'admin' || user.role === 'ADMIN' || user.roleId === 1) {
        isAdmin.value = true
      }
    } catch (e) {
      console.error('Lỗi kiểm tra quyền:', e)
    }
  }
}

// --- HELPERS ---
const getImageUrl = mediaUrl

const isVideo = (url: string | null) => {
  if (!url) return false
  return ['.mp4', '.mov', '.avi', '.webm'].some((ext) => url.toLowerCase().endsWith(ext))
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// --- RATING STATS (tính từ allComments, không bị ảnh hưởng bởi filter sao) ---
const ratingStats = computed(() => {
  const base = allComments.value
  const total = base.length
  const avg = total > 0 ? base.reduce((s, c) => s + (Number(c.rating) || 0), 0) / total : 0

  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: base.filter((c) => Number(c.rating) === star).length,
    pct:
      total > 0
        ? Math.round((base.filter((c) => Number(c.rating) === star).length / total) * 100)
        : 0,
  }))

  return { avg: avg.toFixed(1), total, counts }
})

// --- FILTERED COMMENTS (client-side lọc sao) ---
const filteredComments = computed(() => {
  if (starFilter.value === 0) return allComments.value
  return allComments.value.filter((c) => Number(c.rating) === starFilter.value)
})

// --- FETCH BÌNH LUẬN ---
const fetchComments = async (id: number) => {
  isCommentsLoading.value = true
  try {
    const response = await CommentService.getComments(
      { productId: id, visibility: visibilityFilter.value as any },
      isAdmin.value,
    )
    const responseData = response.data || response
    allComments.value = responseData.data || responseData.items || responseData || []
    commentTotal.value = responseData.meta?.total || allComments.value.length
  } catch (error) {
    console.error('Lỗi khi tải đánh giá:', error)
  } finally {
    isCommentsLoading.value = false
  }
}

// Reset starFilter khi đổi visibilityFilter
watch(visibilityFilter, () => {
  starFilter.value = 0
  const id = Number(route.params.id)
  if (id) fetchComments(id)
})

// --- TOGGLE ẨN/HIỆN BÌNH LUẬN ---
const handleToggleVisibility = async (comment: any) => {
  const actionText = comment.isHidden ? 'hiển thị lại' : 'ẩn'
  if (!confirm(`Bạn có chắc chắn muốn ${actionText} bình luận này?`)) return
  try {
    if (comment.isHidden) {
      await CommentService.showComment(comment.id)
    } else {
      await CommentService.hideComment(comment.id)
    }
    await fetchComments(Number(route.params.id))
  } catch {
    alert('Không thể thực hiện thao tác này.')
  }
}

// --- GIỎ HÀNG ---
const handleAddToCart = async () => {
  if (!selectedVariant.value) {
    notify.error('Vui lòng chọn phân loại sản phẩm!')
    return
  }
  const userJson = localStorage.getItem('user')
  const user = userJson ? JSON.parse(userJson) : null
  const currentUserId = user ? Number(user.id) : null
  if (!currentUserId) {
    notify.info('Vui lòng đăng nhập để mua hàng!')
    return
  }
  isAdding.value = true
  try {
    await Cart.create({
      accountId: currentUserId,
      variantId: Number(selectedVariant.value.id),
      quantity: Number(quantity.value),
    })
    window.dispatchEvent(new CustomEvent('cart-updated'))
    notify.success('Đã thêm vào giỏ hàng.')
  } catch (error: any) {
    const message = error.response?.data?.message || 'Lỗi không xác định'
    notify.error(Array.isArray(message) ? message.join(' • ') : message)
  } finally {
    isAdding.value = false
  }
}

// --- FETCH ALL DATA ---
const fetchData = async () => {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    const [prodRes, variantRes, soldVarRes, promoRes, bundleRes] = await Promise.all([
      api.get(`/product/${id}`),
      api.get('/product-variant'),
      api.get('/product/stats/sold-variants'), // ← thêm dòng này
      api.get('/promotion'),
      api.get(`/bundle-item?bundleProductId=${id}`).catch(() => ({ data: [] })),
    ])

    product.value = prodRes.data
    promotions.value = promoRes.data

    // Merge soldQuantity vào variants
    let allVariants = variantRes.data || []
    const soldVariants = soldVarRes.data || []

    variants.value = allVariants
      .filter((v: any) => v.productId === id)
      .map((v: any) => {
        const sold = soldVariants.find((s: any) => s.variantId === v.id)
        return {
          ...v,
          soldQuantity: sold ? Number(sold.soldQuantity) : 0,
        }
      })

    if (variants.value.length > 0) {
      selectedVariant.value = variants.value[0]
    }

    // Bundle giữ nguyên
    giftProducts.value = []
    if (bundleRes.data && Array.isArray(bundleRes.data)) {
      for (const b of bundleRes.data) {
        const vRes = await api.get(`/product-variant/${b.componentVariantId}`)
        const variant = vRes.data
        const giftProdRes = await api.get(`/product/${variant.productId}`)
        const giftProduct = giftProdRes.data
        giftProducts.value.push({
          ...giftProduct,
          variantName: variant.name,
          variantPrice: Number(variant.price),
          quantity: b.quantity,
          bundleImage: b.image || giftProduct.mainImage,
        })
      }
    }

    await fetchComments(id)
  } catch (e) {
    console.error('Lỗi tải dữ liệu:', e)
  } finally {
    loading.value = false
  }
}

const getDiscountedPrice = (variant: any) => {
  if (!variant.promotionId) return variant.price
  const promo = promotions.value.find((p) => p.id === variant.promotionId)
  if (
    !promo ||
    !promo.isActive ||
    new Date(promo.startDate).getTime() > Date.now() ||
    new Date(promo.endDate).getTime() < Date.now()
  )
    return variant.price
  let finalPrice = Number(variant.price)
  if (promo.discountType === 'PERCENT') finalPrice *= 1 - Number(promo.discountValue) / 100
  else if (promo.discountType === 'FIXED_AMOUNT') finalPrice -= Number(promo.discountValue)
  return Math.max(0, finalPrice)
}

watch(selectedVariant, () => {
  quantity.value = 1
})

const updateQuantity = (val: number) => {
  const maxStock = selectedVariant.value?.stock ?? 999
  if (quantity.value + val < 1 || quantity.value + val > maxStock || quantity.value + val > 20)
    return
  quantity.value += val
}

const validateQuantity = () => {
  let val = Math.floor(Number(quantity.value))
  const maxStock = selectedVariant.value?.stock ?? 999
  if (isNaN(val) || val < 1) val = 1
  if (val > maxStock) val = maxStock
  if (val > 20) val = 20
  quantity.value = val
}

onMounted(async () => {
  checkAdminRole()
  await fetchData()
})

watch(
  () => route.params.id,
  (newId) => {
    if (newId) fetchData()
  },
)
</script>

<template>
  <main class="mx-auto max-w-[1200px] w-full px-4 py-8 font-sans relative">
    <div v-if="loading" class="flex flex-col items-center justify-center py-32 text-slate-400">
      <span class="material-symbols-outlined text-5xl text-[#658a22] animate-bounce mb-4">eco</span>
      <p class="font-bold uppercase tracking-widest text-sm text-[#658a22]">Đang tải sản phẩm...</p>
    </div>

    <div
      v-else-if="!product"
      class="text-center py-32 bg-white rounded-[2rem] border-2 border-slate-100 border-dashed text-slate-500"
    >
      <span class="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
      <p class="font-bold text-lg">Không tìm thấy sản phẩm.</p>
    </div>

    <div v-else>
      <!-- Breadcrumb -->
      <nav
        class="flex items-center gap-2 mb-8 text-[13px] font-bold text-slate-400 uppercase tracking-wide"
      >
        <RouterLink to="/" class="hover:text-[#658a22] transition-colors flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">home</span> Trang Chủ
        </RouterLink>
        <span class="material-symbols-outlined text-sm">chevron_right</span>
        <RouterLink to="/products" class="hover:text-[#658a22] transition-colors"
          >Cửa hàng</RouterLink
        >
        <span class="material-symbols-outlined text-sm">chevron_right</span>
        <span class="text-slate-800">{{ product.name }}</span>
      </nav>

      <!-- Product Info -->
      <div
        class="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100"
      >
        <div class="lg:col-span-5 space-y-4">
          <div
            class="aspect-square w-full bg-[#f4f7ee]/50 rounded-3xl overflow-hidden flex items-center justify-center border-2 border-[#658a22]/10 relative group cursor-zoom-in"
            @click="openMainImageLightbox()"
          >
            <img
              :src="getImageUrl(displayImage)"
              class="w-[85%] h-[85%] object-contain group-hover:scale-105 transition-transform duration-500"
            />
            <div
              class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center"
            >
              <span
                class="material-symbols-outlined opacity-0 group-hover:opacity-100 text-[#658a22] text-4xl transition-opacity"
                >zoom_in</span
              >
            </div>
          </div>
        </div>

        <div class="lg:col-span-7 flex flex-col gap-6">
          <div>
            <h1 class="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-2">
              {{ product.name }}
            </h1>
            <div class="flex items-center gap-4 text-sm font-bold text-slate-400">
              <span class="flex items-center gap-1">
                <span class="text-yellow-400 text-lg">★</span>
                {{ ratingStats.avg }} ({{ commentTotal }} đánh giá)
              </span>
            </div>
          </div>

          <div
            class="flex items-center gap-4 p-5 bg-[#f4f7ee]/50 rounded-2xl border border-[#658a22]/10"
          >
            <div class="flex items-baseline gap-3">
              <p
                v-if="selectedVariant?.promotionId"
                class="text-xl text-slate-400 line-through font-bold"
              >
                {{ Number(selectedVariant.price).toLocaleString('vi-VN') }}đ
              </p>
              <p class="text-4xl font-black text-[#d00000]">
                {{
                  selectedVariant
                    ? Number(getDiscountedPrice(selectedVariant)).toLocaleString('vi-VN')
                    : '---'
                }}đ
              </p>
            </div>
          </div>

          <div v-if="variants.length > 0" class="space-y-3">
            <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Chọn phân loại
            </p>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="v in variants"
                :key="v.id"
                @click="selectedVariant = v"
                :class="[
                  'px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center justify-center text-center leading-tight min-w-[100px]',
                  selectedVariant?.id === v.id
                    ? 'border-[#658a22] bg-[#eef4e6] text-[#658a22] shadow-sm'
                    : 'border-slate-100 text-slate-600 hover:border-slate-300 bg-slate-50 hover:bg-white',
                ]"
              >
                {{ v.name }}
                <span class="text-[13px] font-normal opacity-70 mt-1 uppercase tracking-wider">{{
                  v.color
                }}</span>
                <span v-if="v.soldQuantity > 0" class="text-[13px] text-rose-600 font-medium mt-2">
                  Đã bán: {{ v.soldQuantity }}
                </span>
              </button>
            </div>
            <div class="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p class="text-slate-600 text-sm leading-relaxed text-justify">
                {{ product.description || 'Sản phẩm thay thế hoàn hảo cho đồ nhựa dùng một lần.' }}
              </p>
            </div>
          </div>

          <!-- Thông tin bổ sung của sản phẩm -->
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm"
          >
            <div v-if="product.material" class="flex flex-col">
              <span class="text-slate-400 text-xs font-bold uppercase tracking-widest"
                >Chất liệu</span
              >
              <span class="font-medium text-slate-700">{{ product.material }}</span>
            </div>

            <div v-if="product.ecoFriendliness" class="flex flex-col">
              <span class="text-slate-400 text-xs font-bold uppercase tracking-widest"
                >Thân thiện môi trường</span
              >
              <span class="font-medium text-emerald-600">{{ product.ecoFriendliness }}/10</span>
            </div>

            <div v-if="product.reusability" class="flex flex-col">
              <span class="text-slate-400 text-xs font-bold uppercase tracking-widest"
                >Tái sử dụng</span
              >
              <span class="font-medium text-slate-700">{{ product.reusability }}</span>
            </div>

            <div v-if="totalSoldQuantity > 0" class="flex flex-col">
              <span class="text-slate-400 text-xs font-bold uppercase tracking-widest">Đã bán</span>
              <span class="font-medium text-rose-600">
                {{ totalSoldQuantity.toLocaleString('vi-VN') }} cái
              </span>
            </div>
          </div>

          <!-- Chứng nhận xanh -->
          <div
            v-if="product.greenCerts && product.greenCerts.length > 0"
            class="mt-4 flex flex-wrap gap-2"
          >
            <span
              class="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2 self-center"
              >Chứng nhận:</span
            >
            <span
              v-for="cert in product.greenCerts"
              :key="cert.id"
              class="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full"
            >
              {{ cert.name }}
            </span>
          </div>

          <div
            class="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t-2 border-dashed border-slate-100 mt-auto"
          >
            <div
              class="flex items-center border-2 border-slate-200 rounded-2xl bg-white h-14 overflow-hidden w-full sm:w-auto"
            >
              <button
                @click="updateQuantity(-1)"
                class="px-5 h-full hover:bg-slate-100 text-slate-700 font-black text-lg"
              >
                -
              </button>
              <input
                type="number"
                v-model.number="quantity"
                @change="validateQuantity"
                class="w-14 text-center bg-transparent border-none focus:ring-0 text-slate-900 font-black text-lg hide-arrows"
              />
              <button
                @click="updateQuantity(1)"
                class="px-5 h-full hover:bg-slate-100 text-slate-700 font-black text-lg"
              >
                +
              </button>
            </div>
            <button
              @click="handleAddToCart"
              :disabled="
                isAdding ||
                !selectedVariant ||
                selectedVariant.stock < 1 ||
                product.status !== 'ACTIVE'
              "
              class="w-full flex-1 bg-[#1e293b] hover:bg-black text-white font-black h-14 rounded-2xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-sm"
            >
              {{ isAdding ? 'ĐANG XỬ LÝ...' : 'THÊM VÀO GIỎ' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ====== REVIEW SECTION ====== -->
      <div class="mt-12 bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 class="text-2xl font-black text-slate-900 flex items-center gap-2">
            Đánh giá sản phẩm
            <span class="text-sm font-bold bg-[#eef4e6] text-[#658a22] px-3 py-1 rounded-full">
              {{ commentTotal }} Đánh giá
            </span>
          </h2>

          <!-- Admin: filter trạng thái -->
          <div
            v-if="isAdmin"
            class="flex items-center gap-3 bg-slate-50 p-2 border-2 border-slate-200 rounded-2xl"
          >
            <span class="material-symbols-outlined text-slate-400 pl-2">admin_panel_settings</span>
            <span class="text-sm font-bold text-slate-600 whitespace-nowrap">Trạng thái:</span>
            <select
              v-model="visibilityFilter"
              class="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#658a22] cursor-pointer w-44"
            >
              <option value="ALL">Tất cả</option>
              <option value="VISIBLE">Đang hiển thị</option>
              <option value="HIDDEN">Đang bị ẩn</option>
            </select>
          </div>
        </div>

        <div v-if="isCommentsLoading" class="py-10 text-center text-slate-400 font-bold">
          <span class="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
          <p>Đang tải đánh giá...</p>
        </div>

        <template v-else>
          <!-- Rating Overview + Star Filter -->
          <div
            v-if="allComments.length > 0"
            class="flex flex-col md:flex-row gap-6 mb-8 p-6 bg-gradient-to-br from-[#f4f7ee] to-[#eef4e6] rounded-3xl border border-[#658a22]/10"
          >
            <!-- Điểm trung bình -->
            <div class="flex flex-col items-center justify-center min-w-[140px] gap-1">
              <span class="text-6xl font-black text-slate-800 leading-none">{{
                ratingStats.avg
              }}</span>
              <div class="flex gap-0.5 text-yellow-400 text-xl my-1">
                <span v-for="s in 5" :key="s">{{
                  s <= Math.round(Number(ratingStats.avg)) ? '★' : '☆'
                }}</span>
              </div>
              <span class="text-xs text-slate-500 font-bold">{{ ratingStats.total }} đánh giá</span>
            </div>

            <!-- Thanh phân bố sao + nút lọc -->
            <div class="flex-1 flex flex-col gap-2 justify-center">
              <button
                v-for="item in ratingStats.counts"
                :key="item.star"
                @click="starFilter = starFilter === item.star ? 0 : item.star"
                :class="[
                  'flex items-center gap-3 group rounded-xl px-3 py-1.5 transition-all',
                  starFilter === item.star
                    ? 'bg-yellow-400/20 ring-2 ring-yellow-400'
                    : 'hover:bg-white/60',
                ]"
              >
                <span class="text-xs font-black text-slate-700 w-4 text-right">{{
                  item.star
                }}</span>
                <span class="text-yellow-400 text-sm">★</span>
                <div class="flex-1 h-2.5 bg-white/70 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    :style="{ width: item.pct + '%' }"
                  ></div>
                </div>
                <span class="text-xs font-bold text-slate-500 w-8 text-right">{{
                  item.count
                }}</span>
                <span
                  :class="[
                    'text-[10px] font-black w-8 text-right',
                    starFilter === item.star ? 'text-yellow-600' : 'text-slate-400',
                  ]"
                  >{{ item.pct }}%</span
                >
              </button>
            </div>

            <!-- Pill filter tắt nhanh -->
            <div class="flex flex-col justify-center gap-2 min-w-[110px]">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Lọc nhanh
              </p>
              <button
                @click="starFilter = 0"
                :class="
                  starFilter === 0
                    ? 'bg-[#658a22] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                "
                class="px-4 py-1.5 rounded-xl text-xs font-black border border-[#658a22]/20 transition-all"
              >
                ✦ Tất cả
              </button>
              <button
                v-for="s in [5, 4, 3, 2, 1]"
                :key="s"
                @click="starFilter = starFilter === s ? 0 : s"
                :class="
                  starFilter === s
                    ? 'bg-yellow-400 text-white border-yellow-400'
                    : 'bg-white text-slate-600 hover:bg-yellow-50 border-yellow-200'
                "
                class="px-4 py-1.5 rounded-xl text-xs font-black border transition-all"
              >
                {{ s }}★
                <span class="ml-1 opacity-70"
                  >({{ ratingStats.counts.find((c) => c.star === s)?.count ?? 0 }})</span
                >
              </button>
            </div>
          </div>

          <!-- Badge lọc đang hoạt động -->
          <div v-if="starFilter > 0" class="flex items-center gap-2 mb-5">
            <span class="text-sm font-bold text-slate-500">Đang lọc:</span>
            <span
              class="flex items-center gap-1.5 bg-yellow-400/15 text-yellow-700 border border-yellow-300 px-3 py-1 rounded-full text-xs font-black"
            >
              <span>{{ starFilter }} sao</span>
              <button @click="starFilter = 0" class="hover:text-red-500 transition-colors ml-1">
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            </span>
            <span class="text-xs text-slate-400">({{ filteredComments.length }} kết quả)</span>
          </div>

          <!-- Empty -->
          <div
            v-if="filteredComments.length === 0"
            class="py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200"
          >
            <span class="material-symbols-outlined text-5xl text-slate-300 mb-3"
              >chat_bubble_outline</span
            >
            <p class="text-slate-500 font-bold">
              {{
                starFilter > 0
                  ? `Không có đánh giá ${starFilter} sao nào.`
                  : 'Chưa có đánh giá nào phù hợp với bộ lọc.'
              }}
            </p>
            <button
              v-if="starFilter > 0"
              @click="starFilter = 0"
              class="mt-4 text-sm text-[#658a22] font-bold underline"
            >
              Xem tất cả đánh giá
            </button>
          </div>

          <!-- Comment list -->
          <div v-else class="space-y-8">
            <div
              v-for="comment in filteredComments"
              :key="comment.id"
              class="border-b border-slate-100 pb-8 last:border-0 last:pb-0 transition-all duration-300"
              :class="{ 'opacity-50 grayscale': comment.isHidden }"
            >
              <div class="flex items-start gap-4">
                <div
                  class="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-white shadow-sm"
                >
                  <img
                    v-if="comment.account?.avatar"
                    :src="getImageUrl(comment.account.avatar)"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="material-symbols-outlined text-slate-400">person</span>
                </div>

                <div class="flex-1">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div class="flex items-center gap-2">
                      <p class="font-bold text-slate-800">
                        {{
                          comment.account?.profile?.fullName ||
                          comment.account?.email ||
                          'Khách hàng ẩn danh'
                        }}
                      </p>
                      <span
                        v-if="comment.isHidden"
                        class="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                      >
                        Đã ẩn
                      </span>
                    </div>

                    <div class="flex items-center gap-3">
                      <p class="text-xs text-slate-400 font-medium">
                        {{ formatDate(comment.createdAt) }}
                      </p>

                      <!-- Admin toggle -->
                      <template v-if="isAdmin">
                        <div class="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
                          <button
                            @click="handleToggleVisibility(comment)"
                            type="button"
                            class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                            :class="comment.isHidden ? 'bg-red-200' : 'bg-[#658a22]'"
                          >
                            <span
                              aria-hidden="true"
                              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                              :class="comment.isHidden ? 'translate-x-0' : 'translate-x-4'"
                            >
                            </span>
                          </button>
                          <span
                            class="text-[11px] font-bold uppercase tracking-wider"
                            :class="comment.isHidden ? 'text-[#d00000]' : 'text-[#658a22]'"
                          >
                            {{ comment.isHidden ? 'Đang ẩn' : 'Đang hiện' }}
                          </span>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Stars -->
                  <div class="flex text-sm mb-3 gap-0.5 items-center">
                    <span
                      v-for="star in 5"
                      :key="star"
                      class="text-lg"
                      :class="
                        star <= Number(comment.rating || 5) ? 'text-yellow-400' : 'text-slate-200'
                      "
                      >★</span
                    >
                    <span class="ml-2 text-xs font-bold text-slate-400"
                      >{{ comment.rating }}/5</span
                    >
                  </div>

                  <p class="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                    {{ comment.content }}
                  </p>

                  <!-- Media -->
                  <div
                    v-if="comment.media && comment.media.length > 0"
                    class="flex flex-wrap gap-3"
                  >
                    <div
                      v-for="item in comment.media"
                      :key="item.id"
                      @click="openLightbox(item.url || item.path)"
                      class="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:border-[#658a22] transition-colors relative group"
                    >
                      <video
                        v-if="isVideo(item.url || item.path)"
                        :src="getImageUrl(item.url || item.path)"
                        class="w-full h-full object-cover"
                      ></video>
                      <img
                        v-else
                        :src="getImageUrl(item.url || item.path)"
                        class="w-full h-full object-cover"
                      />
                      <div
                        v-if="isVideo(item.url || item.path)"
                        class="absolute inset-0 bg-black/20 flex items-center justify-center"
                      >
                        <span class="material-symbols-outlined text-white text-2xl drop-shadow-md"
                          >play_circle</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Lightbox -->
    <vue-easy-lightbox
      :visible="isLightboxOpen"
      :imgs="imgsRef"
      @hide="onHide"
      :maskClosable="true"
    >
    </vue-easy-lightbox>
  </main>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
.font-sans {
  font-family: 'Inter', sans-serif;
}
.hide-arrows::-webkit-inner-spin-button,
.hide-arrows::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.hide-arrows {
  -moz-appearance: textfield;
}
.lightbox-content img {
  transition: transform 0.3s ease;
  cursor: grab;
}
.lightbox-content img:active {
  cursor: grabbing;
}
</style>
