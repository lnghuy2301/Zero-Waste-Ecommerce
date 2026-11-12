<script setup lang="ts">
import { mediaUrl } from '@/utils/media'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router' // Đã thêm useRouter để fix lỗi click ảnh
import { Category } from '@/service/category.ts'
import api from '@/service/api.ts'

const router = useRouter()
const categories = ref<any[]>([])
const allProducts = ref<any[]>([])
const promotions = ref<any[]>([])
const variantMap = ref<Map<number, any[]>>(new Map())
const isLoading = ref(true)
const loadError = ref('')

// --- STATE QUẢN LÝ SLIDER DANH MỤC ---
const currentPage = ref(0)
const itemsPerPage = ref(window.innerWidth < 768 ? 1 : 3)

const chunkedCategories = computed(() => {
  const chunks = []
  for (let i = 0; i < categories.value.length; i += itemsPerPage.value) {
    chunks.push(categories.value.slice(i, i + itemsPerPage.value))
  }
  return chunks
})

const totalPages = computed(() => chunkedCategories.value.length)
const nextPage = () => {
  if (totalPages.value > 0) currentPage.value = (currentPage.value + 1) % totalPages.value
}
const prevPage = () => {
  if (totalPages.value > 0)
    currentPage.value = (currentPage.value - 1 + totalPages.value) % totalPages.value
}

// --- LOGIC LỌC SẢN PHẨM ---
const latestProducts = computed(() => {
  return [...allProducts.value].sort((a, b) => b.id - a.id).slice(0, 10)
})

const promoProducts = computed(() => {
  return allProducts.value
    .filter((p) => {
      const variants = variantMap.value.get(p.id) || []
      return variants.some((v) => {
        const promo = promotions.value.find((p) => p.id === v.promotionId)
        return (
          promo?.isActive &&
          new Date(promo.startDate).getTime() <= Date.now() &&
          new Date(promo.endDate).getTime() >= Date.now()
        )
      })
    })
    .slice(0, 5)
})

const displayPromoProducts = computed(() => {
  return promoProducts.value
})

// --- HELPER & API ---
const getImageUrl = mediaUrl
const getOriginalPrice = (id: number) => Number(variantMap.value.get(id)?.[0]?.price || 0)

const getDiscountedPrice = (productId: number) => {
  const variants = variantMap.value.get(productId) || []
  if (variants.length === 0) return 0
  const variant = variants[0]

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

const fetchData = async () => {
  try {
    isLoading.value = true
    loadError.value = ''
    const [catData, prodRes, varRes, promoRes] = await Promise.all([
      Category.getAllCategories(),
      api.get('/product'),
      api.get('/product-variant'),
      api.get('/promotion'),
    ])

    categories.value = catData
    allProducts.value = prodRes.data.filter((p: any) => p.status === 'ACTIVE')
    promotions.value = promoRes.data

    const map = new Map<number, any[]>()
    varRes.data.forEach((v: any) => {
      if (!map.has(v.productId)) map.set(v.productId, [])
      map.get(v.productId)!.push(v)
    })
    variantMap.value = map
  } catch (error) {
    loadError.value = 'Không tải được cửa hàng. Vui lòng kiểm tra API hoặc thử lại.'
  } finally {
    isLoading.value = false
  }
}

// --- AUTO-PLAY SLIDER ---
let autoPlayInterval: any = null
const startAutoPlay = () => {
  autoPlayInterval = setInterval(nextPage, 4000)
}
const stopAutoPlay = () => {
  clearInterval(autoPlayInterval)
}

const handleResize = () => {
  itemsPerPage.value = window.innerWidth < 768 ? 1 : 3
}

onMounted(() => {
  fetchData()
  startAutoPlay()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  stopAutoPlay()
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <main class="bg-white min-h-screen font-sans selection:bg-[#eef4e6] selection:text-[#658a22]">
    <div v-if="loadError" role="alert" class="m-4 rounded-xl bg-amber-50 p-4 text-amber-900">
      {{ loadError }} <button class="ml-2 underline" @click="fetchData">Thử lại</button>
    </div>
    <section
      class="relative h-[80vh] flex items-center overflow-hidden rounded-b-[3.5rem] shadow-2xl"
    >
      <div class="absolute inset-0 z-0">
        <img alt="Green living" class="w-full h-full object-cover" src="/images/hero.svg" />
        <div
          class="absolute inset-0 bg-gradient-to-r from-[#1e293b]/90 via-[#1e293b]/50 to-transparent"
        ></div>
      </div>
      <div class="relative z-10 max-w-[1400px] mx-auto px-4 md:px-10 w-full">
        <div class="max-w-2xl animate-fade-in-up">
          <div
            class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-full font-bold text-xs uppercase tracking-widest mb-6 border border-white/30"
          >
            <span class="material-symbols-outlined text-[16px]">eco</span>
            EcoStore · Cửa hàng demo
          </div>
          <h1
            class="text-5xl md:text-7xl font-black text-white leading-tight uppercase italic mb-6"
          >
            Mua Sắm <span class="text-[#a4d651]">Xanh</span><br />Sống Bền Vững
          </h1>
          <p class="text-lg text-slate-300 mb-10 font-medium max-w-lg leading-relaxed">
            Mỗi lựa chọn của bạn hôm nay đều góp phần tạo nên một Trái Đất xanh và sạch hơn cho ngày
            mai.
          </p>
          <RouterLink
            to="/products"
            class="inline-flex items-center gap-3 px-8 py-4 bg-[#658a22] text-white font-black rounded-full hover:bg-[#52701b] hover:scale-105 transition-all shadow-[0_10px_30px_rgba(101,138,34,0.4)]"
          >
            KHÁM PHÁ NGAY <span class="material-symbols-outlined">arrow_forward</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="py-24 max-w-[1400px] mx-auto px-4 md:px-10">
      <div
        class="flex flex-col md:flex-row justify-between items-center md:items-end mb-12 gap-6 text-center md:text-left"
      >
        <div>
          <h2 class="text-4xl font-black text-slate-900 uppercase italic mb-2">
            Danh mục <span class="text-[#658a22]">Nổi bật</span>
          </h2>
          <p class="text-slate-500 font-medium">Lựa chọn hàng đầu cho lối sống không rác thải</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="prevPage"
            class="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:bg-[#658a22] hover:text-white hover:border-[#658a22] transition-all"
          >
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <button
            @click="nextPage"
            class="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:bg-[#658a22] hover:text-white hover:border-[#658a22] transition-all"
          >
            <span class="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="flex flex-col items-center py-10">
        <div
          class="w-10 h-10 border-4 border-[#658a22] border-t-transparent rounded-full animate-spin"
        ></div>
      </div>

      <div
        v-else
        class="overflow-hidden rounded-[2rem]"
        @mouseenter="stopAutoPlay"
        @mouseleave="startAutoPlay"
      >
        <div
          class="flex transition-transform duration-700 ease-in-out"
          :style="{ transform: `translateX(-${currentPage * 100}%)` }"
        >
          <div
            v-for="(group, idx) in chunkedCategories"
            :key="idx"
            class="w-full shrink-0 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <RouterLink
              v-for="cat in group"
              :key="cat.id"
              :to="`/products?category=${cat.id}`"
              class="relative aspect-[4/5] rounded-[2rem] overflow-hidden group border-4 border-white shadow-lg"
            >
              <img
                :src="getImageUrl(cat.image)"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-[#1e293b]/90 via-[#1e293b]/20 to-transparent group-hover:from-[#658a22]/90 transition-colors duration-500"
              ></div>
              <div class="absolute bottom-8 left-8 right-8">
                <h3
                  class="text-3xl font-black text-white uppercase italic mb-2 transform group-hover:-translate-y-2 transition-transform duration-500"
                >
                  {{ cat.name }}
                </h3>
                <span
                  class="text-white/80 font-bold uppercase tracking-widest text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  Khám phá <span class="material-symbols-outlined text-[14px]">east</span>
                </span>
              </div>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="displayPromoProducts.length"
      class="py-24 bg-[#fff5f5] relative border-y-2 border-red-100 overflow-hidden"
    >
      <div
        class="absolute -top-20 -left-20 w-64 h-64 bg-red-200 rounded-full blur-3xl opacity-50"
      ></div>
      <div class="max-w-[1400px] mx-auto px-4 md:px-10 relative z-10">
        <div
          class="flex flex-col md:flex-row justify-between items-center md:items-end mb-12 gap-6"
        >
          <div class="flex items-center gap-5">
            <div
              class="w-20 h-20 bg-red-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-red-500/40 animate-bounce"
            >
              <span class="material-symbols-outlined text-4xl">local_fire_department</span>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="px-2 py-1 bg-red-100 text-red-600 font-black text-[10px] uppercase rounded-md tracking-widest"
                  >Sự kiện</span
                >
                <span class="font-bold text-red-500 text-sm">Đang diễn ra</span>
              </div>
              <h2
                class="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tight"
              >
                Ưu Đãi <span class="text-red-500">Giới Hạn</span>
              </h2>
            </div>
          </div>
          <RouterLink
            to="/products"
            class="font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-6 py-3 rounded-full flex items-center gap-2 transition-all border border-red-200"
          >
            Xem tất cả <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">
          <div
            v-for="p in displayPromoProducts"
            :key="p.id"
            class="group bg-white p-3 md:p-4 rounded-[2rem] border-2 border-red-50 hover:border-red-300 hover:shadow-2xl transition-all duration-300 flex flex-col relative transform hover:-translate-y-1"
          >
            <div
              class="absolute top-0 right-6 bg-red-500 text-white font-black text-[11px] px-3 py-3 rounded-b-xl z-10 shadow-md flex flex-col items-center leading-none"
            >
              <span class="material-symbols-outlined text-[16px] mb-0.5">sell</span>SALE
            </div>
            <div
              class="aspect-square rounded-[1.5rem] overflow-hidden mb-4 bg-slate-50 cursor-pointer"
              @click="router.push(`/product/${p.id}`)"
            >
              <img
                :src="getImageUrl(p.mainImage)"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div class="flex flex-col flex-grow px-1">
              <RouterLink
                :to="`/product/${p.id}`"
                class="font-bold text-slate-800 text-[15px] mb-2 line-clamp-2 leading-snug group-hover:text-red-500 transition-colors"
              >
                {{ p.name }}
              </RouterLink>
              <div
                class="mt-auto pt-3 flex flex-wrap items-center justify-between border-t border-slate-100 gap-y-2"
              >
                <div class="flex flex-col">
                  <span class="text-[11px] text-slate-300 line-through font-bold"
                    >{{ getOriginalPrice(p.id).toLocaleString('vi-VN') }}đ</span
                  >
                  <span class="text-[18px] font-black text-red-500"
                    >{{ getDiscountedPrice(p.id).toLocaleString('vi-VN') }}đ</span
                  >
                </div>
                <RouterLink
                  :to="`/product/${p.id}`"
                  class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  <span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-24 max-w-[1400px] mx-auto px-4 md:px-10">
      <div class="flex flex-col items-center mb-16 text-center">
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-[#eef4e6] text-[#658a22] rounded-md font-black text-[10px] uppercase tracking-widest mb-4"
        >
          Cập nhật mới
        </div>
        <h2 class="text-4xl font-black text-slate-900 uppercase italic mb-4">
          Sản phẩm <span class="text-[#658a22]">Mới nhất</span>
        </h2>
        <div class="w-16 h-1.5 bg-[#658a22] rounded-full"></div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">
        <div
          v-for="p in latestProducts"
          :key="p.id"
          class="group bg-white p-3 md:p-4 rounded-[2rem] border border-slate-100 hover:border-[#658a22]/30 hover:shadow-xl transition-all duration-300 flex flex-col transform hover:-translate-y-1"
        >
          <div
            class="aspect-square rounded-[1.5rem] overflow-hidden mb-4 bg-slate-50 cursor-pointer relative"
            @click="router.push(`/product/${p.id}`)"
          >
            <img
              :src="getImageUrl(p.mainImage)"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div
              class="absolute top-3 left-3 bg-[#1e293b] text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest"
            >
              MỚI
            </div>
          </div>
          <div class="flex flex-col flex-grow px-1">
            <RouterLink
              :to="`/product/${p.id}`"
              class="font-bold text-slate-800 text-[15px] mb-2 line-clamp-2 leading-snug group-hover:text-[#658a22] transition-colors"
            >
              {{ p.name }}
            </RouterLink>
            <div
              class="mt-auto pt-3 flex flex-wrap items-center justify-between border-t border-slate-100 gap-y-2"
            >
              <div class="flex flex-col">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5"
                  >Giá bán</span
                >
                <span class="text-[16px] font-black text-[#658a22]"
                  >{{ getDiscountedPrice(p.id).toLocaleString('vi-VN') }}đ</span
                >
              </div>
              <RouterLink
                :to="`/product/${p.id}`"
                class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-[#658a22] hover:text-white transition-all"
              >
                <span class="material-symbols-outlined text-[18px]">add</span>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-20 text-center">
        <RouterLink
          to="/products"
          class="inline-flex items-center gap-2 px-10 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-full font-black uppercase tracking-widest hover:bg-[#1e293b] hover:text-white hover:border-[#1e293b] transition-all shadow-sm"
        >
          Khám phá toàn bộ <span class="material-symbols-outlined text-[18px]">grid_view</span>
        </RouterLink>
      </div>
    </section>

    <section class="py-24 max-w-[1400px] mx-auto px-4 md:px-10">
      <div class="bg-[#1e293b] rounded-[3.5rem] p-10 md:p-20 relative overflow-hidden shadow-2xl">
        <div class="absolute -right-10 -bottom-10 opacity-[0.03] pointer-events-none">
          <span class="material-symbols-outlined text-[35rem] text-white">public</span>
        </div>
        <div class="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div
            v-for="(feature, idx) in [
              {
                icon: 'energy_savings_leaf',
                title: 'Nguồn Gốc Bền Vững',
                desc: 'Sản phẩm được làm từ nguyên liệu tự nhiên, thân thiện với hệ sinh thái.',
              },
              {
                icon: 'recycling',
                title: 'Tái Chế & Giảm Nhựa',
                desc: 'Giải pháp hoàn hảo thay thế đồ nhựa dùng một lần trong gia đình.',
              },
              {
                icon: 'science',
                title: 'Dùng Lâu Hơn',
                desc: 'Bảo quản đúng cách để đồ dùng bền hơn và giảm nhu cầu mua mới.',
              },
            ]"
            :key="idx"
            class="flex flex-col items-center text-center group"
          >
            <div
              class="w-20 h-20 bg-[#1e293b] border-2 border-[#a4d651]/30 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-[#a4d651] transition-all duration-300"
            >
              <span
                class="material-symbols-outlined text-4xl text-[#a4d651] group-hover:text-[#1e293b]"
                >{{ feature.icon }}</span
              >
            </div>
            <h3 class="text-white text-xl font-black uppercase mb-3 tracking-wide">
              {{ feature.title }}
            </h3>
            <p class="text-slate-400 text-sm leading-relaxed max-w-xs">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.font-sans {
  font-family: 'Inter', sans-serif;
}
.animate-fade-in-up {
  animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(30px);
}
@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
