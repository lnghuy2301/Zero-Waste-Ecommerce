# Frontend

Vue 3 + Vue Router + Vite + TypeScript + Tailwind CSS.

Chạy từ thư mục này: `npm ci`, `npm run dev`. Kiểm tra kiểu và build: `npm run build`.

Sao chép .env.example sang .env hoặc chạy `npm run setup:env` ở thư mục gốc. VITE*API_URL chỉ tới NestJS, VITE_CHATBOT_URL chỉ tới Flask. Các biến VITE*\* là cấu hình công khai, không chứa API key.

Ảnh demo ở public/images, ảnh người dùng ở NestJS /uploads. Cấu hình host ở src/utils/media.ts. Xem [README gốc](../README.md) để chạy đủ các dịch vụ.
