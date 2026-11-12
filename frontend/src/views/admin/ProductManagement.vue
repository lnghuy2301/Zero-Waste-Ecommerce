<script setup lang="ts">
import { mediaUrl } from '@/utils/media'
import { ref, onMounted, watch } from 'vue'
import ProductService from '@/service/product.ts'
import ProductVariantService from '@/service/productVariant.ts'
import { notify } from '@/utils/notifier.ts'
import { Category } from '@/service/category.ts'
import Promotion from '@/service/promotion.ts'
import api from '@/service/api.ts'

// Các state của khuyến mãi
const promotions = ref<any[]>([])
const selectedVariantIdsForPromotion = ref<number[]>([])
const showPromotionModal = ref(false)
const currentPromotion = ref<any>(null)
const isEditPromotion = ref(false)
const newPromotion = ref({
  name: '',
  code: '',
  discountType: 'PERCENT',
  discountValue: 0,
  startDate: '',
  endDate: '',
  isActive: true,
})

const openCreatePromotion = () => {
  currentPromotion.value = null
  isEditPromotion.value = false
  newPromotion.value = {
    name: '',
    code: '',
    discountType: 'PERCENT',
    discountValue: 0,
    startDate: '',
    endDate: '',
    isActive: true,
  }
  showPromotionModal.value = true
}

const formatDateForInput = (dateString: string) => {
  if (!dateString) return ''
  // Cắt lấy 10 ký tự đầu (yyyy-MM-dd) từ chuỗi ISO hoặc chuỗi bất kỳ
  return new Date(dateString).toISOString().split('T')[0]
}
const editPromotion = (promo: any) => {
  currentPromotion.value = promo
  isEditPromotion.value = true
  // Format lại ngày trước khi gán vào form để input type="date" hiểu được
  newPromotion.value = {
    ...promo,
    startDate: formatDateForInput(promo.startDate),
    endDate: formatDateForInput(promo.endDate),
    discountValue: Number(promo.discountValue), // Đảm bảo là số để tính toán
  }
  showPromotionModal.value = true
}

const savePromotion = async () => {
  if (!newPromotion.value.name?.trim()) return notify.error('Tên khuyến mãi không được bỏ trống')
  if (!newPromotion.value.code?.trim()) return notify.error('Mã khuyến mãi không được bỏ trống')

  // Chuyển đổi dữ liệu trước khi gửi lên Server
  const payload = {
    ...newPromotion.value,
    discountValue: Number(newPromotion.value.discountValue),
    // Chuyển ngày về định dạng ISO để Backend không bị lỗi 500
    startDate: newPromotion.value.startDate
      ? new Date(newPromotion.value.startDate).toISOString()
      : null,
    endDate: newPromotion.value.endDate ? new Date(newPromotion.value.endDate).toISOString() : null,
  }

  try {
    if (isEditPromotion.value && currentPromotion.value) {
      await Promotion.updatePromotion(currentPromotion.value.id, payload)
      notify.success('Cập nhật khuyến mãi thành công')
    } else {
      await Promotion.createPromotion(payload)
      notify.success('Tạo khuyến mãi thành công')
    }
    showPromotionModal.value = false
    loadData()
  } catch (e: any) {
    // Log lỗi chi tiết ra console để kiểm tra nếu vẫn lỗi
    console.error('Lỗi API:', e.response?.data)
    const msg = e.response?.data?.message || 'Lưu khuyến mãi thất bại'
    notify.error(Array.isArray(msg) ? msg.join(' • ') : msg)
  }
}

const removePromotion = async (id: number) => {
  // 1. Hỏi xác nhận trước khi xóa
  if (!confirm('Bạn có chắc chắn muốn xóa khuyến mãi này không?')) return

  try {
    // 2. Gọi API xóa
    await Promotion.deletePromotion(id)

    // 3. Thông báo thành công (nếu bạn có dùng notifier)
    // notify.success('Đã xóa khuyến mãi')

    // 4. Cập nhật lại danh sách trên giao diện mà không cần load lại trang
    promotions.value = promotions.value.filter((p: any) => p.id !== id)
  } catch (e) {
    console.error('Lỗi khi xóa:', e)
    alert('Không thể xóa khuyến mãi này. Vui lòng thử lại!')
  }
}

// Áp dụng khuyến mãi cho tất cả biến thể của các sản phẩm đã chọn
// Mở modal chọn khuyến mãi cho các sản phẩm đã chọn
const openApplyPromotionModal = () => {
  if (selectedProductIds.value.length === 0) {
    return notify.error('Vui lòng chọn ít nhất 1 sản phẩm')
  }

  const variantIds = variants.value
    .filter((v) => selectedProductIds.value.includes(v.productId))
    .map((v) => v.id)

  if (variantIds.length === 0) {
    return notify.error('Không có biến thể nào để áp dụng')
  }

  selectedVariantIdsForPromotion.value = variantIds
  showApplyPromotionModal.value = true
}

// Áp dụng khuyến mãi từ modal
const confirmApplyPromotion = async (promotionId: number) => {
  try {
    await ProductVariantService.applyPromotion({
      variantIds: selectedVariantIdsForPromotion.value,
      promotionId: promotionId,
    })
    notify.success(
      `Đã áp dụng khuyến mãi cho ${selectedVariantIdsForPromotion.value.length} biến thể`,
    )
    showApplyPromotionModal.value = false
    loadData()
  } catch (e: any) {
    notify.error('Áp dụng khuyến mãi thất bại')
  }
}
const products = ref<any[]>([])
// Các biến cho Phân trang và Lọc
// === PHÂN TRANG & LỌC ===
const searchQuery = ref('') // ← thêm dòng này

const variants = ref<any[]>([])
const loading = ref(false)
const categories = ref<any[]>([])
const greenCerts = ref<any[]>([])

const selectedProductIds = ref<number[]>([])
const showApplyPromotionModal = ref(false)
// const selectedPromotionForApply = ref<number | null>(null)
const selectedVariantIds = ref<number[]>([])

const showProductModal = ref(false)
const showImageModal = ref(false)
const showVariantModal = ref(false)
const showCategoryImageModal = ref(false)
const showCategoryModal = ref(false) // ← modal tạo danh mục

const currentProductId = ref<number | null>(null)
const currentProductIdForImage = ref<number | null>(null)

const showCategoryListModal = ref(false) // modal hiển thị danh sách danh mục
const categoriesToEdit = ref<any[]>([]) // danh sách danh mục để chỉnh sửa/xóa
const editingCategory = ref<any>(null) // danh mục đang chỉnh sửa
const showEditProductModal = ref(false)
const showEditVariantModal = ref(false)

const editingProduct = ref<any>(null)
const editingVariant = ref<any>(null)

const editProductForm = ref({
  name: '',
  slug: '',
  categoryId: 1,
  description: '',
  material: '',
  status: 'ACTIVE',
  ecoFriendliness: 0,
  reusability: '',
  greenCertId: null as number | null,
})

const editVariantForm = ref({
  name: '',
  price: 0,
  stock: 100,
  sku: '',
  color: '',
  size: '',
  weight: 0,
  volume: 0,
})
// Mở form chỉnh sửa sản phẩm
const openEditProductModal = (product: any) => {
  editingProduct.value = product
  editProductForm.value = {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    description: product.description || '',
    material: product.material || '',
    status: product.status,
    ecoFriendliness: product.ecoFriendliness || 0,
    reusability: product.reusability || '',
    greenCertId:
      product.greenCerts && product.greenCerts.length > 0 ? product.greenCerts[0].id : null,
  }
  showEditProductModal.value = true
}

// Mở form chỉnh sửa biến thể
const openEditVariantModal = (variant: any) => {
  editingVariant.value = variant
  editVariantForm.value = {
    name: variant.name,
    price: Number(variant.price),
    stock: variant.stock,
    sku: variant.sku,
    color: variant.color || '',
    size: variant.size || '',
    weight: variant.weight || 0,
    volume: variant.volume || 0,
  }
  showEditVariantModal.value = true
}

// Lưu chỉnh sửa sản phẩm
const updateProduct = async () => {
  if (!editingProduct.value) return

  const payload = {
    name: editProductForm.value.name.trim(),
    slug: editProductForm.value.slug.trim().toLowerCase(),
    categoryId: Number(editProductForm.value.categoryId),
    description: editProductForm.value.description?.trim() || undefined,
    material: editProductForm.value.material?.trim() || undefined,
    status: editProductForm.value.status,
    ecoFriendliness: Number(editProductForm.value.ecoFriendliness) || 0,
    reusability: editProductForm.value.reusability?.trim() || undefined,
    greenCertId: editProductForm.value.greenCertId
      ? Number(editProductForm.value.greenCertId)
      : undefined,
  }

  try {
    await ProductService.updateProduct(editingProduct.value.id, payload)
    notify.success('Cập nhật sản phẩm thành công')
    showEditProductModal.value = false
    loadData()
  } catch (e: any) {
    console.error('Lỗi cập nhật sản phẩm:', e.response?.data || e)
    const msg = e.response?.data?.message || 'Cập nhật sản phẩm thất bại'
    notify.error(Array.isArray(msg) ? msg.join(' • ') : msg)
  }
}

// Lưu chỉnh sửa biến thể
const updateVariant = async () => {
  if (!editingVariant.value) return

  const payload = {
    name: editVariantForm.value.name.trim(),
    price: Number(editVariantForm.value.price),
    stock: Number(editVariantForm.value.stock),
    sku: editVariantForm.value.sku.trim() || `SKU-${Date.now()}`,
    color: editVariantForm.value.color.trim() || null,
    size: editVariantForm.value.size.trim() || null,
    weight: Number(editVariantForm.value.weight) || null,
    volume: Number(editVariantForm.value.volume) || null,
    // KHÔNG gửi productId vì backend không cần khi update
  }

  try {
    await ProductVariantService.updateVariant(editingVariant.value.id, payload)
    notify.success('Cập nhật biến thể thành công')
    showEditVariantModal.value = false
    loadData()
  } catch (e: any) {
    console.error('Lỗi cập nhật biến thể:', e.response?.data || e)
    const msg = e.response?.data?.message || 'Cập nhật biến thể thất bại'
    notify.error(Array.isArray(msg) ? msg.join(' • ') : msg)
  }
}

// Mở modal quản lý danh mục
const openCategoryListModal = async () => {
  try {
    const res = await Category.getAllCategories()
    categoriesToEdit.value = res || []
    showCategoryListModal.value = true
  } catch (e) {
    notify.error('Không tải được danh sách danh mục')
  }
}

// Xóa danh mục
const deleteCategory = async (id: number) => {
  if (!confirm('Bạn có chắc muốn xóa danh mục này không?')) return
  try {
    await Category.deleteCategory(id)
    notify.success('Xóa danh mục thành công')
    // Cập nhật lại danh sách
    categoriesToEdit.value = categoriesToEdit.value.filter((c) => c.id !== id)
    loadData() // load lại sản phẩm
  } catch (e) {
    notify.error('Không thể xóa danh mục này (có thể đang có sản phẩm)')
  }
}

// Chỉnh sửa danh mục (mở form sửa)
const editCategory = (cat: any) => {
  editingCategory.value = cat
  newCategory.value = {
    name: cat.name,
    description: cat.description || '',
  }
  showCategoryModal.value = true // dùng chung modal tạo
}

// Lưu danh mục (tạo hoặc sửa)
const saveCategory = async () => {
  if (!newCategory.value.name?.trim()) {
    return notify.error('Tên danh mục không được bỏ trống')
  }

  try {
    if (editingCategory.value) {
      // Sửa
      await Category.updateCategory(editingCategory.value.id, newCategory.value)
      notify.success('Cập nhật danh mục thành công')
    } else {
      // Tạo mới
      await Category.createCategory(newCategory.value)
      notify.success('Tạo danh mục thành công')
    }
    showCategoryModal.value = false
    editingCategory.value = null
    newCategory.value = { name: '', description: '' }
    loadData()
  } catch (e: any) {
    notify.error('Lưu danh mục thất bại')
  }
}
const newCategory = ref({
  // ← form tạo danh mục
  name: '',
  description: '',
})

const newProduct = ref({
  name: '',
  slug: '',
  categoryId: 1,
  description: '',
  material: '',
  greenCertId: null as number | null,
})

const newVariant = ref({
  name: '',
  price: 0,
  stock: 100,
  sku: '',
  color: '',
  size: '',
})

// Load tất cả dữ liệu
// Load tất cả dữ liệu
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      search: searchQuery.value.trim() || undefined,
    }

    const [prodRes, varRes, soldProdRes, soldVarRes, catRes, promoRes, greenRes] =
      await Promise.all([
        api.get('/product', { params }),
        ProductVariantService.getAll(),
        api.get('/product/stats/sold-products'),
        api.get('/product/stats/sold-variants'),
        Category.getAllCategories(),
        Promotion.getAllPromotions(),
        api.get('/green-certificate'),
      ])

    // Xử lý danh sách sản phẩm
    const productData = prodRes.data || prodRes
    products.value = Array.isArray(productData) ? productData : productData.items || []

    // Gán dữ liệu đã bán + doanh thu cho sản phẩm
    const soldProducts = soldProdRes.data || soldProdRes
    products.value.forEach((p: any) => {
      const stat = soldProducts.find((s: any) => s.productId === p.id)
      p.totalSoldQuantity = stat ? stat.totalSoldQuantity : 0
      p.totalRevenue = stat ? stat.totalRevenue : 0
    })

    // Gán dữ liệu đã bán + doanh thu cho biến thể
    const soldVariants = soldVarRes.data || soldVarRes
    variants.value = (varRes.data || varRes).map((v: any) => {
      const stat = soldVariants.find((s: any) => s.variantId === v.id)
      return {
        ...v,
        soldQuantity: stat ? stat.soldQuantity : 0,
        revenue: stat ? stat.revenue : 0,
      }
    })

    // Gán các dữ liệu còn lại
    categories.value = catRes || []
    promotions.value = promoRes || []
    greenCerts.value = greenRes.data || greenRes
  } catch (e) {
    console.error(e)
    notify.error('Không tải được dữ liệu')
    products.value = []
    variants.value = []
  } finally {
    loading.value = false
  }
}

const toggleProductSelect = (id: number) => {
  const index = selectedProductIds.value.indexOf(id)
  if (index > -1) selectedProductIds.value.splice(index, 1)
  else selectedProductIds.value.push(id)
}

const toggleVariantSelect = (id: number) => {
  const index = selectedVariantIds.value.indexOf(id)
  if (index > -1) selectedVariantIds.value.splice(index, 1)
  else selectedVariantIds.value.push(id)
}

// Tạo sản phẩm
const createProduct = async () => {
  if (!newProduct.value.name?.trim()) return notify.error('Tên sản phẩm không được bỏ trống')
  if (!newProduct.value.slug?.trim()) return notify.error('Slug không được bỏ trống')
  if (!newProduct.value.categoryId || newProduct.value.categoryId < 1) {
    return notify.error('Vui lòng chọn danh mục')
  }

  try {
    const created = await ProductService.createProduct({
      name: newProduct.value.name.trim(),
      slug: newProduct.value.slug.trim().toLowerCase(),
      categoryId: Number(newProduct.value.categoryId),
      description: newProduct.value.description?.trim() || undefined,
      material: newProduct.value.material?.trim() || undefined,
    })

    notify.success('Tạo sản phẩm thành công!')
    showProductModal.value = false
    resetProductForm()

    currentProductIdForImage.value = created.id
    showImageModal.value = true
    loadData()
  } catch (e: any) {
    const msg = e.response?.data?.message || 'Tạo sản phẩm thất bại'
    notify.error(Array.isArray(msg) ? msg.join(' • ') : msg)
  }
}

// Upload ảnh
const uploadProductImage = async () => {
  if (!currentProductIdForImage.value) return
  const fileInput = document.getElementById('imageUpload') as HTMLInputElement
  const file = fileInput?.files?.[0]
  if (!file) return notify.error('Vui lòng chọn file ảnh')

  try {
    await ProductService.uploadMainImage(currentProductIdForImage.value, file)
    notify.success('Upload hình ảnh thành công!')
    showImageModal.value = false
    loadData()
  } catch (e) {
    notify.error('Upload hình ảnh thất bại')
  }
}

// Tạo biến thể
const createVariant = async () => {
  if (!currentProductId.value || !newVariant.value.name || newVariant.value.price <= 0) {
    return notify.error('Vui lòng nhập đầy đủ thông tin biến thể')
  }
  try {
    await ProductVariantService.createVariant({
      productId: currentProductId.value,
      name: newVariant.value.name,
      price: newVariant.value.price,
      stock: newVariant.value.stock,
      sku: newVariant.value.sku || `SKU-${Date.now()}`,
      color: newVariant.value.color,
      size: newVariant.value.size,
    })
    notify.success('Tạo biến thể thành công!')
    showVariantModal.value = false
    resetVariantForm()
    loadData()
  } catch (e) {
    notify.error('Tạo biến thể thất bại')
  }
}

const currentCategoryIdForImage = ref<number | null>(null) // ← thêm dòng này

// Tạo danh mục (chỉ name + description)
const createCategory = async () => {
  if (!newCategory.value.name?.trim()) {
    return notify.error('Tên danh mục không được bỏ trống')
  }

  try {
    const created = await Category.createCategory({
      name: newCategory.value.name.trim(),
      description: newCategory.value.description?.trim() || null,
    })

    notify.success('Tạo danh mục thành công!')
    showCategoryModal.value = false
    newCategory.value = { name: '', description: '' }

    // Mở modal upload ảnh ngay sau khi tạo
    currentCategoryIdForImage.value = created.id
    showCategoryImageModal.value = true // ← modal upload ảnh danh mục

    loadData()
  } catch (e: any) {
    const msg = e.response?.data?.message || 'Tạo danh mục thất bại'
    notify.error(Array.isArray(msg) ? msg.join(' • ') : msg)
  }
}

// Upload ảnh cho danh mục
const uploadCategoryImage = async () => {
  if (!currentCategoryIdForImage.value) return

  const fileInput = document.getElementById('categoryImageUpload') as HTMLInputElement
  const file = fileInput?.files?.[0]
  if (!file) return notify.error('Vui lòng chọn file ảnh')

  try {
    await Category.uploadImage(currentCategoryIdForImage.value, file) // cần thêm hàm này vào service
    notify.success('Upload ảnh danh mục thành công!')
    showCategoryImageModal.value = false
    loadData()
  } catch (e) {
    notify.error('Upload ảnh danh mục thất bại')
  }
}

const deleteSelectedProducts = async () => {
  if (selectedProductIds.value.length === 0) return
  if (!confirm(`Xóa ${selectedProductIds.value.length} sản phẩm?`)) return
  try {
    await ProductService.deleteListProducts({ Ids: selectedProductIds.value })
    notify.success('Xóa thành công')
    selectedProductIds.value = []
    loadData()
  } catch (e) {
    notify.error('Xóa thất bại')
  }
}

// HÀM MỚI: Xóa biến thể
const deleteSelectedVariants = async () => {
  if (selectedVariantIds.value.length === 0) return
  if (!confirm(`Xóa ${selectedVariantIds.value.length} biến thể đã chọn?`)) return
  try {
    await ProductVariantService.deleteListVariants({ Ids: selectedVariantIds.value })
    notify.success('Xóa biến thể thành công')
    selectedVariantIds.value = []
    loadData()
  } catch (e) {
    notify.error('Xóa thất bại')
  }
}

const resetProductForm = () => {
  newProduct.value = {
    name: '',
    slug: '',
    categoryId: categories.value[0]?.id || 1,
    description: '',
    material: '',
    greenCertId: null,
  }
}

const resetVariantForm = () => {
  newVariant.value = { name: '', price: 0, stock: 100, sku: '', color: '', size: '' }
}

const openVariantModal = (productId: number) => {
  currentProductId.value = productId
  showVariantModal.value = true
}

onMounted(loadData)
// Tự động tải lại khi gõ tìm kiếm
watch(searchQuery, () => {
  loadData()
})
</script>

<template>
  <div class="max-w-7xl mx-auto p-6 bg-transparent min-h-screen">
    <div
      class="flex justify-between items-center mb-10 sticky top-0 z-40 bg-white/60 backdrop-blur-lg border-b border-white/20"
    >
      <div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Quản lý Sản phẩm</h1>
        <p class="text-slate-500 font-medium">Nhấn vào thẻ để chọn sản phẩm cần thao tác.</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="openCreatePromotion"
          class="bg-[#658a22] hover:bg-[#58791d] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all"
        >
          <span class="material-symbols-outlined">percent</span> Quản lý khuyến mãi
        </button>
        <button
          v-if="selectedProductIds.length > 0"
          @click="openApplyPromotionModal"
          class="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-amber-100 transition-all"
        >
          Áp dụng KM cho {{ selectedProductIds.length }} sản phẩm
        </button>
        <button
          v-if="selectedProductIds.length > 0"
          @click="deleteSelectedProducts"
          class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-red-100 transition-all"
        >
          Xóa {{ selectedProductIds.length }} sản phẩm
        </button>

        <button
          v-if="selectedVariantIds.length > 0"
          @click="deleteSelectedVariants"
          class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-orange-100 transition-all flex items-center gap-2"
        >
          <span class="material-symbols-outlined">delete_sweep</span>
          Xóa {{ selectedVariantIds.length }} biến thể
        </button>

        <button
          @click="showProductModal = true"
          class="bg-[#658a22] hover:bg-[#58791d] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all"
        >
          <span class="material-symbols-outlined">add_circle</span> Tạo sản phẩm mới
        </button>

        <!-- Nút Tạo danh mục - style giống hệt -->
        <button
          @click="showCategoryModal = true"
          class="bg-[#658a22] hover:bg-[#58791d] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all"
        >
          <span class="material-symbols-outlined">add_circle</span> Tạo danh mục
        </button>
        <button
          @click="openCategoryListModal"
          class="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all"
        >
          <span class="material-symbols-outlined">list</span> Quản lý danh mục
        </button>
      </div>
    </div>
    <!-- Thanh tìm kiếm -->
    <div class="mb-8">
      <div class="relative max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm theo tên sản phẩm..."
          class="w-full bg-white border-2 border-slate-200 focus:border-[#658a22] rounded-2xl px-5 py-3 pl-12 outline-none"
          @keyup.enter.prevent="loadData"
        />
        <span
          class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        >
          search
        </span>
      </div>
    </div>
    <div
      v-if="loading"
      class="text-center py-20 font-bold text-slate-400 uppercase tracking-widest animate-pulse"
    >
      Đang tải dữ liệu...
    </div>

    <div v-else class="space-y-8">
      <div
        v-for="product in products"
        :key="product.id"
        @click="toggleProductSelect(product.id)"
        class="bg-white/70 backdrop-blur-md rounded-[32px] p-8 border-2 transition-all cursor-pointer relative active:scale-[0.995] select-none"
        :class="
          selectedProductIds.includes(product.id)
            ? 'border-[#658a22] shadow-xl bg-[#fcfdf9]'
            : 'border-slate-100 shadow-sm hover:border-slate-200'
        "
      >
        <div
          v-if="selectedProductIds.includes(product.id)"
          class="absolute -top-3 -right-3 bg-[#658a22] text-white rounded-full p-1 shadow-lg border-4 border-white"
        >
          <span class="material-symbols-outlined text-xl">check</span>
        </div>

        <div class="flex items-center gap-6">
          <img
            v-if="product.mainImage"
            :src="mediaUrl(product.mainImage)"
            class="w-24 h-24 object-cover rounded-3xl border-2 border-slate-50 shadow-sm"
          />
          <div
            v-else
            class="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-300"
          >
            <span class="material-symbols-outlined text-4xl">inventory</span>
          </div>

          <div class="flex-1">
            <h3
              class="font-black text-2xl"
              :class="selectedProductIds.includes(product.id) ? 'text-[#658a22]' : 'text-slate-800'"
            >
              {{ product.name }}
            </h3>
            <div class="flex items-center gap-4 mt-1 flex-wrap">
              <p class="text-slate-400 font-bold text-sm uppercase tracking-tighter">
                Mã: {{ product.slug }}
              </p>

              <div v-if="product.greenCerts && product.greenCerts.length > 0" class="flex gap-1">
                <span
                  v-for="cert in product.greenCerts"
                  :key="cert.id"
                  class="text-[13px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium"
                >
                  {{ cert.name }}
                </span>
              </div>

              <div class="ml-auto text-rose-600 font-medium text-sm flex items-center gap-1">
                <span class="material-symbols-outlined">local_shipping</span>
                Đã bán
                <span class="font-black">{{
                  product.totalSoldQuantity?.toLocaleString('vi-VN') || 0
                }}</span>
                cái •
                <span class="font-black text-emerald-600">
                  Doanh thu: {{ Number(product.totalRevenue || 0).toLocaleString('vi-VN') }}đ
                </span>
              </div>
            </div>
          </div>

          <button
            @click.stop="openVariantModal(product.id)"
            class="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-lg text-emerald-400">add</span> Biến thể
          </button>
          <button
            @click.stop="openEditProductModal(product)"
            class="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-lg">edit</span> Sửa SP
          </button>
        </div>

        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-4">
          <div
            v-for="variant in variants.filter((v) => v.productId === product.id)"
            :key="variant.id"
            @click.stop="toggleVariantSelect(variant.id)"
            class="group relative border-2 rounded-2xl p-5 transition-all active:scale-95 shadow-sm"
            :class="
              selectedVariantIds.includes(variant.id)
                ? 'border-red-400 bg-red-50'
                : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'
            "
          >
            <div class="font-black text-slate-800">{{ variant.name }}</div>
            <div class="text-[#658a22] font-black text-lg mt-1">
              {{ Number(variant.price).toLocaleString('vi-VN') }}đ
            </div>

            <div class="text-[15px] font-bold text-slate-400 mt-3 uppercase">
              Kho: {{ variant.stock }} | SKU: {{ variant.sku }}
            </div>

            <!-- THÊM: Đã bán + doanh thu của biến thể -->
            <div class="mt-3 text-xs text-rose-600 font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-base">local_shipping</span>
              Đã bán:
              <span class="font-black">{{
                variant.soldQuantity?.toLocaleString('vi-VN') || 0
              }}</span>
            </div>
            <div class="text-xs text-emerald-600 font-medium">
              Doanh thu:
              <span class="font-black"
                >{{ Number(variant.revenue || 0).toLocaleString('vi-VN') }}đ</span
              >
            </div>

            <div
              v-if="selectedVariantIds.includes(variant.id)"
              class="absolute top-2 right-2 text-red-500"
            >
              <span class="material-symbols-outlined text-sm">remove_circle</span>
            </div>
            <button
              @click.stop="openEditVariantModal(variant)"
              class="mt-2 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1 rounded-xl font-medium"
            >
              Sửa biến thể
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- model tạo sản phẩm -->
    <div
      v-if="showProductModal"
      class="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4"
      @click.self="showProductModal = false"
    >
      <div class="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl" @click.stop>
        <h2 class="text-2xl font-black mb-8 text-slate-900 flex items-center gap-2">
          <span class="w-2 h-8 bg-[#658a22] rounded-full"></span> Tạo sản phẩm mới
        </h2>
        <div class="space-y-6">
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Tên sản phẩm *</label
            >
            <input
              v-model="newProduct.name"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              placeholder="Nhập tên sản phẩm..."
            />
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Slug *</label
            >
            <input
              v-model="newProduct.slug"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              placeholder="slug-san-pham"
            />
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
            >
              Danh mục *
            </label>
            <select
              v-model="newProduct.categoryId"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
            >
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Mô tả</label
            >
            <textarea
              v-model="newProduct.description"
              rows="3"
              class="w-full text-slate-800 bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all resize-y"
            ></textarea>
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Chất liệu</label
            >
            <input
              v-model="newProduct.material"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
            />
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
            >
              Chứng nhận xanh
            </label>
            <select
              v-model="newProduct.greenCertId"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
            >
              <option value="">Không chọn</option>
              <option v-for="cert in greenCerts" :key="cert.id" :value="cert.id">
                {{ cert.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="flex gap-4 mt-10">
          <button
            @click="showProductModal = false"
            class="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-all"
          >
            Đóng
          </button>
          <button
            @click="createProduct"
            class="flex-1 py-4 bg-[#658a22] text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:shadow-emerald-200 transition-all"
          >
            Tạo sản phẩm
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showImageModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      @click.self="showImageModal = false"
    >
      <div class="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl" @click.stop>
        <h2 class="text-2xl font-black mb-8 text-slate-900">Thêm hình ảnh cho sản phẩm</h2>
        <div class="space-y-6">
          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            class="block w-full text-sm text-slate-500"
          />
        </div>
        <div class="flex gap-4 mt-10">
          <button
            @click="showImageModal = false"
            class="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-all"
          >
            Hủy
          </button>
          <button
            @click="uploadProductImage"
            class="flex-1 py-4 bg-[#658a22] text-white rounded-2xl font-black"
          >
            Upload hình ảnh
          </button>
        </div>
      </div>
    </div>
    <!-- Tạo biến thể -->
    <div
      v-if="showVariantModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      @click.self="showVariantModal = false"
    >
      <div class="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl" @click.stop>
        <h2 class="text-2xl font-black mb-8 text-slate-900 flex items-center gap-2">
          <span class="w-2 h-8 bg-blue-500 rounded-full"></span> Thêm biến thể
        </h2>
        <div class="space-y-6">
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Tên biến thể *</label
            >
            <input
              v-model="newVariant.name"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              placeholder="Màu Đỏ - Size L"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Giá bán (VNĐ) *</label
              >
              <input
                v-model="newVariant.price"
                type="number"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Tồn kho</label
              >
              <input
                v-model="newVariant.stock"
                type="number"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Màu sắc</label
              >
              <input
                v-model="newVariant.color"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Kích thước</label
              >
              <input
                v-model="newVariant.size"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
          </div>
        </div>
        <div class="flex gap-4 mt-10">
          <button
            @click="showVariantModal = false"
            class="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-all"
          >
            Hủy
          </button>
          <button
            @click="createVariant"
            class="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            Lưu biến thể
          </button>
        </div>
      </div>
    </div>
    <!-- Tạo danh mục -->
    <!-- Modal Tạo Danh Mục Mới -->
    <div
      v-if="showCategoryModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      @click.self="showCategoryModal = false"
    >
      <div class="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl" @click.stop>
        <h2 class="text-2xl font-black mb-8 text-slate-900 flex items-center gap-2">
          <span class="w-2 h-8 bg-[#658a22] rounded-full"></span> Tạo danh mục mới
        </h2>
        <div class="space-y-6">
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Tên danh mục *</label
            >
            <input
              v-model="newCategory.name"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              placeholder="Ví dụ: Ống hút tre"
            />
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Mô tả (tùy chọn)</label
            >
            <textarea
              v-model="newCategory.description"
              rows="3"
              class="w-full text-slate-800 bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all resize-y"
              placeholder="Mô tả ngắn về danh mục..."
            ></textarea>
          </div>
        </div>
        <div class="flex gap-4 mt-10">
          <button
            @click="showCategoryModal = false"
            class="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-all"
          >
            Đóng
          </button>
          <button
            @click="createCategory"
            class="flex-1 py-4 bg-[#658a22] text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:shadow-emerald-200 transition-all"
          >
            Tạo danh mục
          </button>
        </div>
      </div>
    </div>
    <!-- Modal Upload Ảnh Cho Danh Mục -->
    <!-- Modal Upload Ảnh cho Danh Mục -->
    <div
      v-if="showCategoryImageModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      @click.self="showCategoryImageModal = false"
    >
      <div class="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl" @click.stop>
        <h2 class="text-2xl font-black mb-8 text-slate-900">Thêm hình ảnh cho danh mục</h2>
        <div class="space-y-6">
          <input
            id="categoryImageUpload"
            type="file"
            accept="image/*"
            class="block w-full text-sm text-slate-500"
          />
        </div>
        <div class="flex gap-4 mt-10">
          <button
            @click="showCategoryImageModal = false"
            class="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-all"
          >
            Hủy
          </button>
          <button
            @click="uploadCategoryImage"
            class="flex-1 py-4 bg-[#658a22] text-white rounded-2xl font-black"
          >
            Upload hình ảnh
          </button>
        </div>
      </div>
    </div>
    <!-- Modal Quản lý Khuyến mãi -->
    <div
      v-if="showPromotionModal"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      @click.self="showPromotionModal = false"
    >
      <div
        class="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl max-h-[90vh] overflow-auto"
        @click.stop
      >
        <h2 class="text-2xl font-black mb-8 text-slate-900 flex items-center gap-2">
          <span class="w-2 h-8 bg-[#658a22] rounded-full"></span> Quản lý Khuyến mãi
        </h2>

        <!-- Danh sách khuyến mãi -->
        <div class="mb-8">
          <h3 class="font-bold mb-4 text-slate-800">Danh sách khuyến mãi hiện có</h3>
          <div class="space-y-3">
            <div
              v-for="promo in promotions"
              :key="promo.id"
              class="flex justify-between items-center bg-slate-50 p-4 rounded-2xl mb-2 border-2 border-slate-100"
            >
              <div>
                <div class="font-bold text-slate-600 mb-2">{{ promo.name }}</div>
                <div class="text-sm text-slate-500">
                  {{ promo.code }} •
                  {{
                    promo.discountType === 'PERCENT'
                      ? promo.discountValue + '%'
                      : promo.discountValue + 'đ'
                  }}
                </div>
              </div>

              <div class="flex gap-4">
                <button
                  @click="editPromotion(promo)"
                  class="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sửa
                </button>

                <button
                  @click="removePromotion(promo.id)"
                  class="text-red-500 hover:text-red-700 font-medium"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Form tạo/sửa khuyến mãi -->
        <div class="text-slate-800">
          <h3 class="font-bold mb-4">Tạo / Sửa khuyến mãi</h3>
          <div class="grid grid-cols-2 gap-4">
            <input
              v-model="newPromotion.name"
              placeholder="Tên khuyến mãi"
              class="border-2 border-slate-100 rounded-2xl px-5 py-4"
            />
            <input
              v-model="newPromotion.code"
              placeholder="Mã khuyến mãi"
              class="border-2 border-slate-100 rounded-2xl px-5 py-4"
            />
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <select
              v-model="newPromotion.discountType"
              class="border-2 border-slate-100 rounded-2xl px-5 py-4"
            >
              <option value="PERCENT">Giảm theo %</option>
              <option value="FIXED_AMOUNT">Giảm số tiền cố định</option>
            </select>
            <input
              v-model="newPromotion.discountValue"
              type="number"
              placeholder="Giá trị giảm"
              class="border-2 border-slate-100 rounded-2xl px-5 py-4"
            />
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <input
              v-model="newPromotion.startDate"
              type="date"
              class="border-2 border-slate-100 rounded-2xl px-5 py-4"
            />
            <input
              v-model="newPromotion.endDate"
              type="date"
              class="border-2 border-slate-100 rounded-2xl px-5 py-4"
            />
          </div>
          <button
            @click="savePromotion"
            class="mt-6 w-full py-4 bg-[#658a22] text-white rounded-2xl font-bold"
          >
            Lưu khuyến mãi
          </button>
        </div>
      </div>
    </div>
    <!-- Modal Chọn Khuyến mãi để áp dụng -->
    <div
      v-if="showApplyPromotionModal"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4"
      @click.self="showApplyPromotionModal = false"
    >
      <div class="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl" @click.stop>
        <h2 class="text-xl font-bold mb-6 text-slate-900">Chọn khuyến mãi để áp dụng</h2>

        <div class="max-h-[400px] overflow-y-auto space-y-2">
          <button
            v-for="promo in promotions"
            :key="promo.id"
            @click="confirmApplyPromotion(promo.id)"
            class="w-full text-left p-4 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all"
          >
            <div class="font-medium">{{ promo.name }}</div>
            <div class="text-sm text-slate-500">
              {{ promo.code }} —
              {{
                promo.discountType === 'PERCENT'
                  ? promo.discountValue + '%'
                  : promo.discountValue.toLocaleString('vi-VN') + 'đ'
              }}
            </div>
          </button>
        </div>

        <div class="flex justify-end mt-6">
          <button
            @click="showApplyPromotionModal = false"
            class="px-8 py-3 text-slate-600 border border-slate-300 rounded-2xl"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
    <!-- Modal Danh sách + Quản lý Danh mục -->
    <div
      v-if="showCategoryListModal"
      class="text-slate-800 fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[110] p-4"
      @click.self="showCategoryListModal = false"
    >
      <div
        class="bg-white rounded-[32px] w-full max-w-2xl p-8 shadow-2xl max-h-[85vh] overflow-auto"
        @click.stop
      >
        <h2 class="text-2xl font-black mb-6">Quản lý Danh mục</h2>

        <div class="space-y-3">
          <div
            v-for="cat in categoriesToEdit"
            :key="cat.id"
            class="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border"
          >
            <div>
              <div class="font-bold">{{ cat.name }}</div>
              <div v-if="cat.description" class="text-sm text-slate-500 mt-1">
                {{ cat.description }}
              </div>
            </div>
            <div class="flex gap-3">
              <button
                @click="editCategory(cat)"
                class="text-blue-600 hover:text-blue-700 px-4 py-2 text-sm font-medium"
              >
                Sửa
              </button>
              <button
                @click="deleteCategory(cat.id)"
                class="text-red-600 hover:text-red-700 px-4 py-2 text-sm font-medium"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-8">
          <button
            @click="showCategoryListModal = false"
            class="px-8 py-3 border border-slate-300 rounded-2xl font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
    <!-- Modal Chỉnh Sửa Sản Phẩm -->
    <div
      v-if="showEditProductModal"
      class="text-slate-800 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
      @click.self="showEditProductModal = false"
    >
      <div class="bg-white rounded-[40px] w-full max-w-lg p-10 shadow-2xl" @click.stop>
        <h2 class="text-2xl font-black mb-8">Chỉnh sửa sản phẩm</h2>
        <!-- Các trường giống form tạo, nhưng bind với editProductForm -->
        <div class="space-y-6">
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Tên sản phẩm</label
            >
            <input
              v-model="editProductForm.name"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
            />
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Slug</label
            >
            <input
              v-model="editProductForm.slug"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
            />
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Danh mục</label
            >
            <select
              v-model="editProductForm.categoryId"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
            >
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
              >Trạng thái</label
            >
            <select
              v-model="editProductForm.status"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
            >
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
              <option value="OUT_OF_STOCK">Hết hàng</option>
            </select>
          </div>
          <div>
            <label
              class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
            >
              Chứng nhận xanh
            </label>
            <select
              v-model="editProductForm.greenCertId"
              class="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#658a22] focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
            >
              <option value="">Không chọn</option>
              <option v-for="cert in greenCerts" :key="cert.id" :value="cert.id">
                {{ cert.name }}
              </option>
            </select>
          </div>
          <!-- Thêm các trường khác nếu cần: description, material, ecoFriendliness, reusability -->
        </div>
        <div class="flex gap-4 mt-10">
          <button
            @click="showEditProductModal = false"
            class="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600"
          >
            Hủy
          </button>
          <button
            @click="updateProduct"
            class="flex-1 py-4 bg-[#658a22] text-white rounded-2xl font-black"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showEditVariantModal"
      class="text-slate-800 fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
      @click.self="showEditVariantModal = false"
    >
      <div
        class="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
        @click.stop
      >
        <h2 class="text-2xl font-black mb-8">Chỉnh sửa biến thể</h2>

        <div class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Mã SKU</label
              >
              <input
                v-model="editVariantForm.sku"
                placeholder="VD: SP001"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Tên biến thể</label
              >
              <input
                v-model="editVariantForm.name"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Giá bán</label
              >
              <input
                v-model="editVariantForm.price"
                type="number"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Tồn kho</label
              >
              <input
                v-model="editVariantForm.stock"
                type="number"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Màu sắc</label
              >
              <input
                v-model="editVariantForm.color"
                placeholder="VD: Đỏ, Xanh..."
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Kích thước</label
              >
              <input
                v-model="editVariantForm.size"
                placeholder="VD: L, XL, 42..."
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Cân nặng (g)</label
              >
              <input
                v-model="editVariantForm.weight"
                type="number"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
            <div>
              <label
                class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1"
                >Thể tích (ml)</label
              >
              <input
                v-model="editVariantForm.volume"
                type="number"
                class="w-full bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl px-5 py-4 outline-none transition-all text-slate-800 font-bold"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-4 mt-10">
          <button
            @click="showEditVariantModal = false"
            class="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600"
          >
            Hủy
          </button>
          <button
            @click="updateVariant"
            class="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-none {
  user-select: none;
}
</style>
