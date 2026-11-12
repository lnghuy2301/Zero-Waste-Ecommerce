# Backend

NestJS 11 + Prisma 5 + PostgreSQL. Làm theo [hướng dẫn tại thư mục gốc](../README.md) để tạo môi trường và database demo.

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

API: http://localhost:3000/api/v1. Swagger: http://localhost:3000/api/docs.

`npm run build` tạo `dist/src/main.js`; `npm run start:prod` chạy bản build. Thanh toán mô phỏng luôn bị tắt khi NODE_ENV=production. Bản demo chưa tích hợp cổng thanh toán thật.

`npm test -- --runInBand` kiểm tra các bất biến checkout, token, dữ liệu đầu vào và quyền thao tác. Kiểm tra API với database thật bằng `npm run demo:smoke` ở thư mục gốc.
