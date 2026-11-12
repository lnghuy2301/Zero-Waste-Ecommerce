<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <article class="mx-auto max-w-6xl px-4 py-12 sm:py-20">
    <div class="grid items-center gap-10 md:grid-cols-2">
      <div>
        <p class="text-sm font-bold uppercase tracking-widest text-primary">
          Một ngày ít rác thải hơn
        </p>
        <h1 class="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
          Thói quen nhỏ.<br />Thay đổi dài lâu.
        </h1>
        <p class="mt-6 text-lg leading-8 text-slate-600">
          EcoStore là dự án minh họa thương mại điện tử với chủ đề sống xanh. Bạn có thể khám phá
          sản phẩm, trải nghiệm giỏ hàng, đặt đơn và trò chuyện với EcoBot.
        </p>
        <RouterLink
          to="/products"
          class="mt-7 inline-block rounded-full bg-primary px-7 py-3 font-bold text-white"
          >Khám phá cửa hàng</RouterLink
        >
      </div>
      <img
        src="/images/hero.svg"
        alt="Minh họa túi vải, bình nước và cây xanh"
        class="aspect-square w-full rounded-3xl object-cover"
      />
    </div>
    <div
      class="mt-16 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-950"
    >
      <h2 class="font-bold">Bản demo, không có giao dịch thật</h2>
      <p>
        Tất cả giá, tồn kho, đánh giá, tài khoản và thông tin môi trường là dữ liệu mô phỏng. Không
        có đơn vị bán hàng, giao hàng hoặc hoạt động quyên góp thật. Không nhập dữ liệu cá nhân hay
        thông tin thanh toán thật khi thử ứng dụng.
      </p>
    </div>
    <section id="shipping" class="scroll-mt-28 mt-16 grid gap-8 md:grid-cols-2">
      <div class="rounded-2xl bg-slate-50 p-7">
        <h2 class="text-xl font-bold">Giao hàng và thanh toán</h2>
        <p class="mt-4 leading-7 text-slate-600">
          Phí mô phỏng 30.000đ cho đơn dưới 500.000đ, miễn phí từ 500.000đ. Thời gian giao hàng minh
          họa 2–5 ngày làm việc. COD, MoMo và PayPal đều là trải nghiệm thử; không chuyển tiền.
        </p>
      </div>
      <div class="rounded-2xl bg-slate-50 p-7">
        <h2 class="text-xl font-bold">Hủy đơn và đổi trả</h2>
        <p class="mt-4 leading-7 text-slate-600">
          Có thể hủy đơn đang chờ trong trang Đơn hàng. Chính sách đổi trả minh họa: 7 ngày nếu hàng
          lỗi hoặc sai mô tả. Đây là thông tin mô phỏng, không tạo yêu cầu giao nhận thật.
        </p>
      </div>
    </section>
    <section id="privacy" class="scroll-mt-28 mt-12 max-w-3xl">
      <h2 class="text-2xl font-bold">Dữ liệu và quyền riêng tư</h2>
      <p class="mt-4 leading-8 text-slate-600">
        Dữ liệu được lưu trong PostgreSQL của người chạy dự án. Phiên đăng nhập được lưu trong trình
        duyệt và xóa khi đăng xuất. EcoBot trả lời từ danh mục mẫu; nếu người vận hành bật Groq, câu
        hỏi và dữ liệu sản phẩm liên quan sẽ được gửi tới dịch vụ AI đó. Chatbot không truy cập đơn
        hàng hoặc thông tin tài khoản của bạn.
      </p>
    </section>
  </article>
</template>
