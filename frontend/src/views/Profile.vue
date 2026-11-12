<script setup lang="ts">
import { mediaUrl } from '@/utils/media'
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Account } from '@/service/account.ts'
import { Profile } from '@/service/profile.ts'
import { notify } from '@/utils/notifier.ts'

const router = useRouter()
const isEditing = ref(false)
const loading = ref(false)
const avatarLoading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const accountInfo = reactive({
  id: null as number | null,
  email: '',
  role: '',
  isActive: true,
  avatar: null as string | null,
})

const profile = reactive({
  id: null as number | null,
  fullName: '',
  phone: '',
  address: '',
  gender: 'Nam',
  dob: '',
  accountId: null as number | null,
})

// Hàm nối chuỗi URL ảnh từ Backend
const getAvatarUrl = mediaUrl

const fetchProfile = async () => {
  const userStorage = localStorage.getItem('user')
  if (!userStorage) {
    router.push('/login')
    return
  }

  try {
    const userData = JSON.parse(userStorage)
    const accountRes = await Account.getAccount(userData.id)

    if (accountRes) {
      accountInfo.id = accountRes.id
      accountInfo.email = accountRes.email
      accountInfo.role = accountRes.role
      accountInfo.isActive = accountRes.isActive
      accountInfo.avatar = accountRes.avatar

      if (accountRes.avatar) {
        userData.avatar = accountRes.avatar
        localStorage.setItem('user', JSON.stringify(userData))
        window.dispatchEvent(new CustomEvent('user-updated', { detail: userData }))
      }

      let p = await Profile.getCustomerProfile(accountRes.id)

      if (!p || !p.id) {
        const defaultPayload = {
          fullName: userData.fullName || 'Người dùng mới',
          phone: null,
          address: null,
          gender: 'Nam',
          dob: null,
        }
        p = await Profile.updateProfile(accountRes.id, 0, defaultPayload)
      }

      if (p) {
        profile.id = p.id
        profile.fullName = p.fullName || ''
        profile.phone = p.phone || ''
        profile.address = p.address || ''
        profile.gender = p.gender || 'Nam'
        profile.accountId = p.accountId || accountRes.id

        if (p.dob) {
          profile.dob = new Date(p.dob).toISOString().slice(0, 10)
        }
      }
    }
  } catch (error: any) {
    console.error('Lỗi lấy thông tin profile:', error)
    notify.error('Không thể tải thông tin hồ sơ')
  }
}

const clickFileInput = () => {
  fileInput.value?.click()
}

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]
  if (!file) return
  if (!accountInfo.id) {
    notify.error('Không tìm thấy tài khoản để upload!')
    return
  }
  avatarLoading.value = true
  try {
    const responseAccount = await Account.uploadAvatar(accountInfo.id, file)

    // 1. Cập nhật state hiện tại
    accountInfo.avatar = responseAccount.avatar
    if (responseAccount.profile && responseAccount.profile.fullName) {
      profile.fullName = responseAccount.profile.fullName
    }

    // 2. Cập nhật Local Storage để Header và các trang khác nhận dữ liệu mới
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      userData.avatar = responseAccount.avatar
      localStorage.setItem('user', JSON.stringify(userData))

      // 3. Phát sự kiện để Header cập nhật ảnh tức thì (không cần F5)
      window.dispatchEvent(new CustomEvent('user-updated', { detail: userData }))
    }

    notify.success('Cập nhật ảnh đại diện thành công!')
  } catch (error: any) {
    const msg = error.response?.data?.message || 'Cập nhật ảnh thất bại'
    notify.error(msg)
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } finally {
    avatarLoading.value = false
  }
}

const handleUpdate = async () => {
  if (!profile.accountId || !profile.id) {
    notify.error('Không tìm thấy profile!')
    return
  }

  loading.value = true
  try {
    const payload = {
      fullName: profile.fullName,
      phone: profile.phone || null,
      address: profile.address || null,
      gender: profile.gender,
      dob: profile.dob || null,
    }

    await Profile.updateProfile(profile.accountId, profile.id, payload)
    isEditing.value = false
    notify.success('Cập nhật thông tin thành công!')
  } catch (error: any) {
    const msg = error.response?.data?.message || 'Cập nhật thất bại'
    notify.error(msg)
  } finally {
    loading.value = false
  }
}

const goToUpdatePassword = () => {
  router.push('/change-password')
}

onMounted(fetchProfile)
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] py-12 px-4">
    <div class="max-w-5xl mx-auto">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Cài đặt tài khoản</h1>
          <p class="text-slate-600 text-sm mt-1 font-medium">
            Quản lý thông tin định danh và bảo mật của bạn.
          </p>
        </div>

        <button
          @click="isEditing = !isEditing"
          class="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-md active:scale-95"
          :class="
            isEditing
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              : 'bg-[#658a22] text-white hover:bg-[#58791d]'
          "
        >
          <span class="material-symbols-outlined text-[20px]">{{
            isEditing ? 'close' : 'edit'
          }}</span>
          {{ isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa hồ sơ' }}
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="space-y-6">
          <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div class="flex flex-col items-center text-center">
              <div class="relative inline-block mb-5">
                <div
                  class="size-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-50 shadow-inner overflow-hidden group relative transition-all"
                  :class="{ 'cursor-pointer hover:border-[#658a22]/30': isEditing }"
                  @click="isEditing && clickFileInput()"
                >
                  <div
                    v-if="avatarLoading"
                    class="absolute inset-0 bg-black/40 flex items-center justify-center z-20"
                  >
                    <span
                      class="animate-spin border-2 border-white border-t-transparent rounded-full w-6 h-6"
                    ></span>
                  </div>

                  <img
                    v-if="accountInfo.avatar"
                    :src="getAvatarUrl(accountInfo.avatar)"
                    class="w-full h-full object-cover"
                    alt="Avatar"
                  />
                  <div
                    v-else
                    class="w-full h-full bg-[#eef4e6] flex items-center justify-center text-[#658a22] text-3xl font-bold uppercase"
                  >
                    {{ accountInfo.email ? accountInfo.email.substring(0, 2) : 'TP' }}
                  </div>

                  <div
                    v-if="isEditing"
                    class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                  >
                    <span class="material-symbols-outlined text-white text-3xl">add_a_photo</span>
                  </div>
                </div>

                <button
                  v-if="isEditing"
                  @click="clickFileInput"
                  class="bg-white border border-slate-200 shadow-md rounded-full size-8 flex items-center justify-center absolute bottom-0 right-0 text-slate-600 hover:bg-slate-50 active:scale-95 z-10"
                >
                  <span class="material-symbols-outlined text-sm">edit</span>
                </button>
              </div>

              <h2 class="font-bold text-xl text-slate-900">
                {{ profile.fullName || 'Chưa có tên' }}
              </h2>
              <p class="text-slate-500 font-medium text-sm mt-1">{{ accountInfo.email }}</p>

              <div class="mt-5 flex flex-wrap justify-center gap-2">
                <span
                  class="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200"
                  >ID: #{{ accountInfo.id }}</span
                >
                <span
                  class="px-3 py-1 bg-[#658a22]/10 text-[#658a22] rounded-lg text-xs font-bold border border-[#658a22]/20"
                  >{{ accountInfo.role }}</span
                >
              </div>
            </div>

            <hr class="my-6 border-slate-100" />

            <button
              @click="goToUpdatePassword"
              class="w-full py-3.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span class="material-symbols-outlined text-[20px]">lock</span>
              Đổi mật khẩu bảo mật
            </button>
          </div>
        </div>

        <div class="lg:col-span-2">
          <form
            @submit.prevent="handleUpdate"
            class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div class="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 class="font-bold text-lg text-slate-800">Thông tin cá nhân</h3>
            </div>

            <div class="p-8 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-1.5">
                  <label
                    class="block text-xs font-bold text-slate-600 uppercase tracking-wider ml-1"
                    >Họ và tên</label
                  >
                  <input
                    v-model="profile.fullName"
                    :disabled="!isEditing"
                    class="w-full px-4 py-3 text-slate-900 font-medium bg-white border border-slate-300 rounded-xl focus:border-[#658a22] focus:ring-4 focus:ring-[#658a22]/10 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div class="space-y-1.5">
                  <label
                    class="block text-xs font-bold text-slate-600 uppercase tracking-wider ml-1"
                    >Giới tính</label
                  >
                  <select
                    v-model="profile.gender"
                    :disabled="!isEditing"
                    class="w-full px-4 py-3 text-slate-900 font-medium bg-white border border-slate-300 rounded-xl focus:border-[#658a22] focus:ring-4 focus:ring-[#658a22]/10 outline-none transition-all disabled:bg-slate-50"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label
                    class="block text-xs font-bold text-slate-600 uppercase tracking-wider ml-1"
                    >Số điện thoại</label
                  >
                  <input
                    v-model="profile.phone"
                    :disabled="!isEditing"
                    class="w-full px-4 py-3 text-slate-900 font-medium bg-white border border-slate-300 rounded-xl focus:border-[#658a22] focus:ring-4 focus:ring-[#658a22]/10 outline-none transition-all disabled:bg-slate-50"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div class="space-y-1.5">
                  <label
                    class="block text-xs font-bold text-slate-600 uppercase tracking-wider ml-1"
                    >Ngày sinh</label
                  >
                  <input
                    v-model="profile.dob"
                    type="date"
                    :disabled="!isEditing"
                    class="w-full px-4 py-3 text-slate-900 font-medium bg-white border border-slate-300 rounded-xl focus:border-[#658a22] focus:ring-4 focus:ring-[#658a22]/10 outline-none transition-all disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider ml-1"
                  >Địa chỉ</label
                >
                <textarea
                  v-model="profile.address"
                  :disabled="!isEditing"
                  rows="3"
                  class="w-full px-4 py-3 text-slate-900 font-medium bg-white border border-slate-300 rounded-xl focus:border-[#658a22] focus:ring-4 focus:ring-[#658a22]/10 outline-none transition-all resize-none disabled:bg-slate-50"
                  placeholder="Nhập địa chỉ thường trú"
                ></textarea>
              </div>

              <div v-if="isEditing" class="pt-4 flex justify-end">
                <button
                  type="submit"
                  :disabled="loading"
                  class="px-8 py-3.5 bg-[#658a22] hover:bg-[#58791d] text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-70 shadow-lg shadow-[#658a22]/20 active:scale-95"
                >
                  <span
                    v-if="loading"
                    class="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"
                  ></span>
                  {{ loading ? 'Đang lưu...' : 'Lưu thay đổi' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="onFileChange" />
  </div>
</template>
