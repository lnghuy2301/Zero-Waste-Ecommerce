<script setup lang="ts">
import { mediaUrl } from '@/utils/media'
import { ref, onMounted, watch, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import api from '@/service/api.ts'

const products = ref<any[]>([])
const categories = ref<any[]>([])
const variantMap = ref<Map<number, any[]>>(new Map())
const promotions = ref<any[]>([])
const greenCerts = ref<any[]>([])
const loading = ref(true)
const loadError = ref('')
const route = useRoute()
const router = useRouter()
const searchQuery = ref(String(route.query.search || ''))

const selectedVariants = ref<Map<number, any>>(new Map())
const sortOption = ref('newest')
const showOnlyPromotion = ref(false)
// === BIẾN LỌC NÂNG CAO ===
const selectedMaterial = ref('') // lọc theo chất liệu
const selectedGreenCert = ref('') // lọc theo chứng nhận xanh
const minEco = ref('') // mức độ thân thiện từ ...
const minRating = ref('') // đánh giá từ ...
//sắp xếp trang
const currentPage = ref(1)
const itemsPerPage = 15

// === BỔ SUNG BIẾN LỌC GIÁ ===
const minPriceInput = ref<number | null>(null)
const maxPriceInput = ref<number | null>(null)

// --- STATE QUẢN LÝ MENU DANH MỤC ---
const isCategoryOpen = ref(false)

const getImageUrl = mediaUrl

const fetchCategories = async () => {
  try {
    const res = await api.get('/category')
    categories.value = res.data
  } catch (e) {
    console.error('Lỗi lấy danh mục:', e)
  }
}

const fetchProducts = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const categoryId = route.query.category
    let url = '/product'
    if (categoryId) url += `?categoryId=${categoryId}`

    const [prodRes, variantRes, soldVarRes, promoRes, greenRes] = await Promise.all([
      api.get(url),
      api.get('/product-variant'),
      api.get('/product/stats/sold-variants'), // ← thêm dòng này
      api.get('/promotion'),
      api.get('/green-certificate'),
    ])

    products.value = (prodRes.data || []).filter((p: any) => p.status === 'ACTIVE')
    const allVariants = variantRes.data || []
    const soldVariants = soldVarRes.data || []

    promotions.value = promoRes.data || []
    greenCerts.value = greenRes.data || []

    // Merge soldQuantity vào variant
    const variantWithSold = allVariants.map((v: any) => {
      const sold = soldVariants.find((s: any) => s.variantId === v.id)
      return {
        ...v,
        soldQuantity: sold ? sold.soldQuantity : 0,
      }
    })

    const map = new Map<number, any[]>()
    variantWithSold.forEach((v: any) => {
      if (!map.has(v.productId)) map.set(v.productId, [])
      map.get(v.productId)!.push(v)
    })

    products.value.forEach((p) => {
      const variants = map.get(p.id) || []
      if (variants.length > 0) {
        selectedVariants.value.set(p.id, variants[0])
      }
    })

    variantMap.value = map
    currentPage.value = 1
  } catch (e) {
    loadError.value = 'Không tải được sản phẩm. Vui lòng kiểm tra API hoặc thử lại.'
  } finally {
    loading.value = false
  }
}

// === COMPUTED: Lọc + Sắp xếp ===
const filteredAndSortedProducts = computed(() => {
  let list = [...products.value]

  // 1. Lọc theo từ khóa
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)),
    )
  }

  // 2. Lọc theo khoảng giá
  list = list.filter((p) => {
    const price = getLowestPrice(p.id)
    if (price === null) return false
    const minMatch = minPriceInput.value === null || price >= minPriceInput.value
    const maxMatch = maxPriceInput.value === null || price <= maxPriceInput.value
    return minMatch && maxMatch
  })

  // 3. Lọc theo chất liệu
  if (selectedMaterial.value) {
    list = list.filter((p) =>
      p.material?.toLowerCase().includes(selectedMaterial.value.toLowerCase()),
    )
  }

  // 4. Lọc theo chứng nhận xanh
  if (selectedGreenCert.value) {
    list = list.filter((p) =>
      p.greenCerts?.some((c: any) => String(c.id) === String(selectedGreenCert.value)),
    )
  }

  // 5. Lọc theo mức độ thân thiện
  if (minEco.value) {
    list = list.filter((p) => (p.ecoFriendliness || 0) >= Number(minEco.value))
  }

  // 6. Lọc theo đánh giá trung bình
  if (minRating.value) {
    list = list.filter((p) => (p.danhGiaTrungBinh || 0) >= Number(minRating.value))
  }

  // 7. Lọc chỉ sản phẩm có khuyến mãi (nếu có toggle)
  if (showOnlyPromotion.value) {
    list = list.filter((p) => {
      const variants = variantMap.value.get(p.id) || []
      return variants.some((v) => v.promotionId != null)
    })
  }

  // ==================== PHẦN SẮP XẾP ====================
  if (sortOption.value === 'price-asc') {
    list.sort((a, b) => (getLowestPrice(a.id) || Infinity) - (getLowestPrice(b.id) || Infinity))
  } else if (sortOption.value === 'price-desc') {
    list.sort((a, b) => (getLowestPrice(b.id) || -Infinity) - (getLowestPrice(a.id) || -Infinity))
  } else if (sortOption.value === 'sold-desc') {
    list.sort((a, b) => getRealSoldQuantity(b.id) - getRealSoldQuantity(a.id))
  } else if (sortOption.value === 'rating-desc') {
    list.sort((a, b) => (b.danhGiaTrungBinh || 0) - (a.danhGiaTrungBinh || 0))
  } else if (sortOption.value === 'promotion') {
    // === Sắp xếp theo khuyến mãi: sản phẩm có khuyến mãi sẽ lên đầu ===
    list.sort((a, b) => {
      const aHasPromo = (variantMap.value.get(a.id) || []).some((v: any) => v.promotionId != null)
      const bHasPromo = (variantMap.value.get(b.id) || []).some((v: any) => v.promotionId != null)

      if (aHasPromo && !bHasPromo) return -1 // a có KM → lên trước
      if (!aHasPromo && bHasPromo) return 1 // b có KM → lên trước
      return 0 // cùng có hoặc cùng không → giữ nguyên thứ tự
    })
  } else {
    // mặc định: newest
    list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
  }

  return list
})

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredAndSortedProducts.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredAndSortedProducts.value.length / itemsPerPage)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const handleVariantChange = (productId: number, variant: any) => {
  selectedVariants.value.set(productId, variant)
}

const getLowestPrice = (productId: number) => {
  const variants = variantMap.value.get(productId) || []
  if (variants.length === 0) return null

  let minPrice = Infinity
  for (const v of variants) {
    const discounted = getDiscountedPrice(v)
    if (discounted < minPrice) minPrice = discounted
  }
  return minPrice === Infinity ? null : minPrice
}

const getDiscountedPrice = (variant: any) => {
  if (!variant.promotionId) return Number(variant.price)

  const promo = promotions.value.find((p) => p.id === variant.promotionId)
  if (
    !promo ||
    !promo.isActive ||
    new Date(promo.startDate).getTime() > Date.now() ||
    new Date(promo.endDate).getTime() < Date.now()
  )
    return Number(variant.price)

  let finalPrice = Number(variant.price)
  if (promo.discountType === 'PERCENT') {
    finalPrice *= 1 - Number(promo.discountValue) / 100
  } else if (promo.discountType === 'FIXED_AMOUNT') {
    finalPrice -= Number(promo.discountValue)
  }

  return Math.max(0, finalPrice)
}

// === THÊM SAU getDiscountedPrice ===
const getRealSoldQuantity = (productId: number) => {
  const variants = variantMap.value.get(productId) || []
  return variants.reduce((sum, v) => sum + (Number(v.soldQuantity) || 0), 0)
}
watch([searchQuery, sortOption, selectedMaterial, selectedGreenCert, minEco, minRating], () => {
  currentPage.value = 1
})
watch([minPriceInput, maxPriceInput], () => {
  currentPage.value = 1
})

// Tự động đóng menu khi chọn xong danh mục
watch(
  () => route.query.category,
  () => {
    fetchProducts()
    isCategoryOpen.value = false
  },
)

onMounted(() => {
  fetchCategories()
  fetchProducts()
})
</script>

<template>
  <div>
    <!-- Backdrop cho mobile menu -->
    <transition name="fade">
      <div
        v-if="isCategoryOpen"
        @click="isCategoryOpen = false"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
      ></div>
    </transition>

    <!-- Sidebar Danh mục (slide-in mobile + desktop) -->
    <aside
      class="fixed top-0 left-0 h-screen w-80 max-w-full bg-white z-50 shadow-[20px_0_40px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out overflow-y-auto"
      :class="isCategoryOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="p-6 md:p-8">
        <div class="flex items-center justify-between mb-8">
          <h3
            class="font-black text-2xl text-slate-800 flex items-center gap-3 uppercase tracking-tight italic"
          >
            <span
              class="w-10 h-10 bg-[#eef4e6] text-[#658a22] rounded-full flex items-center justify-center"
            >
              <span class="material-symbols-outlined text-xl">category</span>
            </span>
            Danh mục
          </h3>
          <button
            @click="isCategoryOpen = false"
            class="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors text-slate-500"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <ul class="space-y-2 relative">
          <div class="absolute left-4 top-2 bottom-2 w-px bg-slate-100 -z-10"></div>

          <li>
            <RouterLink
              to="/products"
              class="group flex items-center justify-between py-4 px-5 rounded-2xl transition-all font-bold text-sm uppercase tracking-wide relative overflow-hidden"
              :class="[
                !route.query.category
                  ? 'bg-[#658a22] text-white shadow-lg transform -translate-y-0.5'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#658a22]',
              ]"
            >
              <div
                v-if="route.query.category"
                class="absolute inset-0 bg-[#eef4e6] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out -z-10"
              ></div>
              <span class="relative z-10">Tất cả sản phẩm</span>
              <span
                v-if="!route.query.category"
                class="material-symbols-outlined text-[18px] relative z-10"
                >check_circle</span
              >
            </RouterLink>
          </li>

          <li v-for="cat in categories" :key="cat.id">
            <RouterLink
              :to="`/products?category=${cat.id}`"
              class="group flex items-center justify-between py-4 px-5 rounded-2xl transition-all font-bold text-sm uppercase tracking-wide relative overflow-hidden"
              :class="[
                route.query.category == cat.id
                  ? 'bg-[#658a22] text-white shadow-lg transform -translate-y-0.5'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#658a22]',
              ]"
            >
              <div
                v-if="route.query.category != cat.id"
                class="absolute inset-0 bg-[#eef4e6] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out -z-10"
              ></div>
              <span class="relative z-10">{{ cat.name }}</span>
              <span
                v-if="route.query.category == cat.id"
                class="material-symbols-outlined text-[18px] relative z-10"
                >check_circle</span
              >
            </RouterLink>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Nội dung chính -->
    <main
      class="max-w-[1400px] mx-auto px-4 md:px-8 py-12 font-sans selection:bg-[#eef4e6] selection:text-[#658a22]"
    >
      <div class="w-full">
        <div
          class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 border-b border-slate-100 pb-6"
        >
          <div>
            <h1 class="text-4xl font-black text-slate-900 uppercase italic tracking-tight">
              Sản Phẩm <span class="text-[#658a22]">Xanh</span>
            </h1>
            <p class="text-slate-500 mt-2 font-medium text-sm tracking-wide">
              Hiển thị
              <strong class="text-slate-800">{{ filteredAndSortedProducts.length }}</strong> sản
              phẩm thân thiện
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full">
            <button
              @click="isCategoryOpen = true"
              class="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-black text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-md active:scale-95 h-[46px]"
            >
              <span class="material-symbols-outlined">filter_list</span>
              DANH MỤC
            </button>

            <div class="relative flex-1 min-w-[200px] sm:w-64 lg:w-72">
              <span
                class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]"
                >search</span
              >
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Tìm sản phẩm..."
                class="w-full h-[46px] bg-white border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-4 py-3 focus:bg-white focus:border-[#658a22] focus:ring-4 focus:ring-[#658a22]/10 outline-none transition-all font-bold text-sm placeholder:text-slate-400 shadow-sm"
              />
            </div>

            <div class="flex flex-wrap gap-3 w-full lg:w-auto items-center text-slate-700">
              <input
                v-model="selectedMaterial"
                type="text"
                placeholder="Chất liệu (ví dụ: tre)"
                class="flex-1 lg:w-40 h-[46px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#658a22] transition-all"
              />

              <select
                v-model="selectedGreenCert"
                class="flex-1 lg:w-48 h-[46px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#658a22] transition-all cursor-pointer"
              >
                <option value="">Chứng nhận xanh</option>
                <option v-for="cert in greenCerts" :key="cert.id" :value="cert.id">
                  {{ cert.name }}
                </option>
              </select>

              <input
                v-model="minEco"
                type="number"
                min="1"
                max="10"
                placeholder="Thân thiện ≥"
                class="w-28 h-[46px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#658a22] transition-all"
              />

              <input
                v-model="minRating"
                type="number"
                min="1"
                max="5"
                placeholder="Đánh giá ≥"
                class="w-28 h-[46px] bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#658a22] transition-all"
              />

              <div
                class="flex items-center gap-2 w-full sm:w-auto bg-white border border-slate-200 rounded-2xl px-4 h-[46px] shadow-sm"
              >
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-black text-slate-400 uppercase tracking-wider"
                    >Từ</span
                  >
                  <input
                    v-model.number="minPriceInput"
                    type="number"
                    placeholder="0"
                    class="w-16 bg-transparent outline-none text-sm font-bold text-[#a00000] placeholder:text-slate-300"
                  />
                </div>
                <div class="w-[1px] h-4 bg-slate-200 mx-1"></div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-black text-slate-400 uppercase tracking-wider"
                    >Đến</span
                  >
                  <input
                    v-model.number="maxPriceInput"
                    type="number"
                    placeholder="1M"
                    class="w-16 bg-transparent outline-none text-sm font-bold text-[#a00000] placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div class="relative w-full sm:w-48 lg:w-56">
                <span
                  class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#658a22] text-[18px] pointer-events-none"
                  >sort</span
                >
                <select
                  v-model="sortOption"
                  class="w-full h-[46px] bg-white border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-4 py-3 focus:bg-white focus:border-[#658a22] focus:ring-4 focus:ring-[#658a22]/10 outline-none transition-all font-bold text-sm appearance-none cursor-pointer shadow-sm"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price-asc">Giá: Thấp → Cao</option>
                  <option value="price-desc">Giá: Cao → Thấp</option>
                  <option value="sold-desc">Bán chạy nhất</option>
                  <option value="rating-desc">Đánh giá cao nhất</option>
                  <option value="promotion">Đang khuyến mãi</option>
                </select>
                <span
                  class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"
                  >expand_more</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div
          v-if="loading"
          class="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200"
        >
          <span class="material-symbols-outlined text-4xl text-[#658a22] animate-bounce mb-3"
            >eco</span
          >
          <p class="font-bold text-sm uppercase tracking-widest">Đang tải...</p>
        </div>

        <div v-else-if="loadError" role="alert" class="rounded-xl bg-amber-50 p-6 text-amber-900">
          {{ loadError }} <button @click="fetchProducts" class="ml-2 underline">Thử lại</button>
        </div>
        <!-- Không có sản phẩm -->
        <div
          v-else-if="paginatedProducts.length === 0"
          class="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500"
        >
          <span class="material-symbols-outlined text-5xl text-slate-300 mb-3">search_off</span>
          <p class="font-bold text-lg">Chưa tìm thấy sản phẩm</p>
        </div>

        <!-- Grid sản phẩm -->
        <div
          v-else
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 lg:gap-7"
        >
          <div
            v-for="product in paginatedProducts"
            :key="product.id"
            class="group bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:border-[#658a22]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col p-3"
          >
            <div
              class="aspect-square relative overflow-hidden rounded-2xl bg-slate-50 mb-4 cursor-pointer"
              @click="router.push(`/product/${product.id}`)"
            >
              <img
                :src="getImageUrl(product.mainImage)"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt="product image"
              />

              <!-- Overlay tối nhẹ khi hover -->
              <div
                class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"
              ></div>

              <!-- Đánh giá trung bình - Góc trên bên TRÁI -->
              <div
                v-if="product.danhGiaTrungBinh && product.danhGiaTrungBinh > 0"
                class="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 text-sm font-bold z-10"
              >
                <span class="text-[#658a22]">{{ product.danhGiaTrungBinh.toFixed(1) }}</span>
                <span class="text-amber-400 text-base leading-none">★</span>
              </div>

              <!-- Số lượng đánh giá - Góc trên bên PHẢI -->
              <div
                v-if="product.soLuongDanhGia && product.soLuongDanhGia > 0"
                class="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl shadow-sm text-xs font-medium text-slate-600 z-10"
              >
                {{ product.soLuongDanhGia.toLocaleString('vi-VN') }} đánh giá
              </div>

              <!-- Badge "Eco" nếu ecoFriendliness cao (giữ nguyên) -->
              <div
                v-if="product.ecoFriendliness > 80"
                class="absolute bottom-3 left-3 bg-emerald-100 text-emerald-700 text-[13px] font-bold px-3 py-1 rounded-2xl flex items-center gap-1 shadow-sm z-10"
              >
                <span class="material-symbols-outlined text-sm">eco</span>
                Eco
              </div>
            </div>

            <div class="flex flex-col flex-grow px-1">
              <div class="flex items-center gap-2 mb-1">
                <span
                  v-if="getRealSoldQuantity(product.id) > 0"
                  class="text-[13px] font-bold text-slate-400"
                >
                  Đã bán {{ getRealSoldQuantity(product.id) }}
                </span>
                <span
                  v-if="product.ecoFriendliness > 80"
                  class="flex items-center text-[13px] font-bold text-[#658a22]"
                >
                  <span class="material-symbols-outlined text-[12px]">leafy_fresh</span>
                  Eco
                </span>
              </div>
              <RouterLink
                :to="`/product/${product.id}`"
                class="font-black text-slate-800 text-sm mb-2 line-clamp-2 leading-snug group-hover:text-[#658a22] transition-colors"
                :title="product.name"
              >
                {{ product.name }}
              </RouterLink>
              <!-- Thông tin chi tiết sản phẩm -->
              <div class="text-xm text-slate-500 my-4 space-y-1">
                <div
                  v-if="getRealSoldQuantity(product.id) > 0"
                  class="flex items-center mt-2 gap-1 text-rose-600"
                >
                  <span class="font-medium">Đã bán:</span>
                  {{ getRealSoldQuantity(product.id).toLocaleString('vi-VN') }} cái
                </div>
                <div
                  v-if="product.greenCerts && product.greenCerts.length > 0"
                  class="flex flex-wrap gap-1 mt-2"
                >
                  <span
                    v-for="cert in product.greenCerts"
                    :key="cert.id"
                    class="bg-emerald-100 text-emerald-700 text-[13px] my-2 font-bold px-2 py-0.5 rounded-full"
                  >
                    {{ cert.name }}
                  </span>
                </div>
              </div>

              <div v-if="variantMap.get(product.id)?.length" class="mb-4">
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="variant in variantMap.get(product.id)?.slice(0, 3)"
                    :key="variant.id"
                    @click="handleVariantChange(product.id, variant)"
                    :class="[
                      'px-2.5 py-1 text-[13px] font-black rounded-lg border transition-all uppercase tracking-tight truncate max-w-[85px]',
                      selectedVariants.get(product.id)?.id === variant.id
                        ? 'bg-[#eef4e6] border-[#658a22] text-[#658a22]'
                        : 'border-slate-200 text-slate-400 bg-white hover:border-[#658a22] hover:text-[#658a22]',
                    ]"
                    :title="variant.name"
                  >
                    {{ variant.name }}
                  </button>
                </div>
              </div>

              <div
                class="mt-auto pt-3 flex flex-wrap items-center justify-between border-t border-slate-100/80 gap-y-2"
              >
                <div class="flex flex-col">
                  <span
                    class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5"
                    >Giá từ</span
                  >
                  <div class="flex flex-wrap items-baseline gap-1.5">
                    <span
                      v-if="
                        selectedVariants.has(product.id) &&
                        selectedVariants.get(product.id).promotionId
                      "
                      class="text-[11px] text-slate-300 line-through font-bold hidden sm:inline-block"
                    >
                      {{ Number(selectedVariants.get(product.id).price).toLocaleString('vi-VN') }}đ
                    </span>
                    <span class="text-[16px] font-black text-[#d00000]">
                      <template v-if="selectedVariants.has(product.id)">
                        {{
                          Number(
                            getDiscountedPrice(selectedVariants.get(product.id)),
                          ).toLocaleString('vi-VN')
                        }}đ
                      </template>
                      <template v-else>Liên hệ</template>
                    </span>
                  </div>
                </div>

                <RouterLink
                  :to="`/product/${product.id}`"
                  class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-[#658a22] hover:text-white hover:border-transparent transition-all hover:scale-105 active:scale-95 shadow-sm"
                  title="Xem chi tiết"
                >
                  <span class="material-symbols-outlined text-[18px]">add</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Phân trang -->
        <div v-if="totalPages > 1" class="mt-14 flex justify-center items-center gap-2">
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-30 border border-slate-200 hover:border-[#658a22] hover:text-[#658a22] hover:bg-[#eef4e6] text-slate-600 bg-white shadow-sm"
          >
            <span class="material-symbols-outlined text-sm">arrow_back_ios_new</span>
          </button>

          <div class="flex gap-2">
            <button
              v-for="page in totalPages"
              :key="page"
              @click="goToPage(page)"
              :class="[
                'w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm transition-all border shadow-sm',
                currentPage === page
                  ? 'bg-[#658a22] border-[#658a22] text-white transform -translate-y-1'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-[#658a22] hover:text-[#658a22] hover:-translate-y-0.5',
              ]"
            >
              {{ page }}
            </button>
          </div>

          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-30 border border-slate-200 hover:border-[#658a22] hover:text-[#658a22] hover:bg-[#eef4e6] text-slate-600 bg-white shadow-sm"
          >
            <span class="material-symbols-outlined text-sm">arrow_forward_ios</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Hiệu ứng mờ cho Backdrop */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
