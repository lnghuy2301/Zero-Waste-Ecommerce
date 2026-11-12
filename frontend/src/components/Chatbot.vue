<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import axios from 'axios'
import { mediaUrl } from '@/utils/media'

// --- CẤU HÌNH API ---
// Tạo một instance axios riêng cho chatbot để không bị lẫn với API của NestJS sau này
const chatbotApi = axios.create({
  baseURL: import.meta.env.VITE_CHATBOT_URL || 'http://localhost:5000/api',
  timeout: 20000,
})

// --- CÁC BIẾN TRẠNG THÁI ---
const isOpen = ref(false)
const isLoading = ref(false)
const userInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

// --- DỮ LIỆU CHAT ---
const messages = ref([
  {
    id: 1,
    isUser: false,
    text: 'Xin chào! EcoBot có thể giúp gì cho bạn hôm nay?',
    imageUrl: '',
  },
])

// --- HÀM GỌI API THẬT ---
const handleSendMessage = async () => {
  const userQuestion = userInput.value.trim()
  if (!userQuestion || isLoading.value) return

  // 1. Thêm tin nhắn của người dùng vào giao diện ngay lập tức
  messages.value.push({
    id: Date.now(),
    isUser: true,
    text: userQuestion,
    imageUrl: '',
  })

  // 2. Xóa ô input và bật trạng thái "loading"
  userInput.value = ''
  isLoading.value = true

  // 3. GỌI API FLASK THẬT
  try {
    const response = await chatbotApi.post('/chat', {
      question: userQuestion,
    })

    // Lấy dữ liệu trả về từ Python
    const botResponse = response.data

    // Thêm tin nhắn của bot vào giao diện
    messages.value.push({
      id: Date.now() + 1,
      isUser: false,
      text: botResponse.response, // Văn bản đã được làm sạch
      imageUrl: botResponse.image_url, // URL hình ảnh (có thể rỗng)
    })
  } catch (error) {
    // Xử lý lỗi nếu API không gọi được
    console.error('Lỗi khi gọi API chatbot:', error)
    messages.value.push({
      id: Date.now() + 1,
      isUser: false,
      text: 'Xin lỗi, EcoBot đang gặp sự cố nhỏ. Vui lòng thử lại sau giây lát.',
      imageUrl: '',
    })
  } finally {
    // Luôn tắt trạng thái loading sau khi API hoàn thành (dù thành công hay thất bại)
    isLoading.value = false
  }
}

// Hàm tự động cuộn (giữ nguyên)
watch(
  messages,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
  { deep: true },
)
</script>

<template>
  <div class="fixed bottom-5 right-5 z-[999]">
    <!-- Nút Tròn (Khi chatbot đóng) -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 scale-75"
      enter-to-class="opacity-100 scale-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-75"
    >
      <button
        v-if="!isOpen"
        @click="isOpen = true"
        class="size-16 bg-[#658a22] rounded-full shadow-xl flex items-center justify-center text-white hover:bg-[#58791d] transition-all transform hover:scale-110 active:scale-100 focus:outline-none focus:ring-4 focus:ring-[#658a22]/30"
        aria-label="Mở chatbot"
      >
        <span class="material-symbols-outlined text-3xl">smart_toy</span>
      </button>
    </transition>

    <!-- Khung Chat (Khi chatbot mở) -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 translate-y-5"
      enter-to-class="opacity-100 translate-y-0"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-5"
    >
      <div
        v-if="isOpen"
        class="w-[min(360px,calc(100vw-2.5rem))] h-[min(520px,calc(100dvh-3rem))] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-100"
        role="dialog"
        aria-label="EcoBot"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 bg-[#f8f9fa] border-b border-slate-100 rounded-t-2xl"
        >
          <div class="flex items-center gap-3">
            <div class="size-10 bg-[#eef4e6] rounded-full flex items-center justify-center">
              <span class="material-symbols-outlined text-primary">smart_toy</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base">EcoBot</h3>
              <p class="text-xs text-slate-500 flex items-center gap-1.5">
                <span class="size-2 bg-green-500 rounded-full"></span>
                Đang hoạt động
              </p>
            </div>
          </div>
          <button
            @click="isOpen = false"
            class="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            aria-label="Đóng chatbot"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <!-- Vùng Hiển thị tin nhắn -->
        <div
          ref="messagesContainer"
          class="flex-1 p-4 overflow-y-auto space-y-4"
          role="log"
          aria-live="polite"
        >
          <div
            v-for="message in messages"
            :key="message.id"
            class="flex"
            :class="message.isUser ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] p-3 rounded-2xl"
              :class="{
                'bg-[#658a22] text-white rounded-br-lg': message.isUser,
                'bg-slate-100 text-slate-800 rounded-bl-lg': !message.isUser,
              }"
            >
              <!-- Tin nhắn của người dùng: Hiển thị text bình thường -->
              <p v-if="message.isUser" class="text-sm leading-relaxed">{{ message.text }}</p>

              <!-- Tin nhắn của bot: Hiển thị HTML được render từ Markdown -->
              <div v-else class="text-sm leading-relaxed whitespace-pre-line break-words">
                {{ message.text }}
              </div>

              <!-- Hiển thị ảnh nếu API trả về link -->
              <img
                v-if="message.imageUrl"
                :src="mediaUrl(message.imageUrl)"
                alt="Hình ảnh sản phẩm"
                class="mt-2 rounded-lg max-w-full"
              />
            </div>
          </div>

          <!-- Dấu "..." khi bot đang gõ -->
          <div v-if="isLoading" class="flex justify-start">
            <div class="p-3 rounded-2xl bg-slate-100 rounded-bl-lg">
              <div class="flex items-center gap-1.5">
                <span class="size-2 bg-slate-300 rounded-full animate-pulse delay-0"></span>
                <span class="size-2 bg-slate-300 rounded-full animate-pulse delay-200"></span>
                <span class="size-2 bg-slate-300 rounded-full animate-pulse delay-400"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ô Nhập liệu -->
        <div class="p-4 border-t border-slate-100">
          <form @submit.prevent="handleSendMessage" class="flex items-center gap-2">
            <input
              v-model="userInput"
              type="text"
              placeholder="Hỏi EcoBot về sản phẩm..."
              class="min-w-0 flex-1 px-4 py-2.5 bg-slate-100 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm text-slate-900"
              autocomplete="off"
              maxlength="1000"
              aria-label="Câu hỏi cho EcoBot"
            />
            <button
              type="submit"
              class="size-11 bg-[#658a22] text-white rounded-xl flex items-center justify-center shadow-sm hover:bg-[#58791d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!userInput.trim() || isLoading"
              aria-label="Gửi câu hỏi"
            >
              <span class="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
