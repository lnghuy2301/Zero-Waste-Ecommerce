# Dữ liệu và hình ảnh demo

catalogue.json chứa 18 sản phẩm, 36 biến thể và 6 danh mục mô phỏng cho một cửa hàng tại Việt Nam. Tên, giá, tồn kho và thông tin vật liệu chỉ dùng minh họa. Các mô tả môi trường không phải chứng nhận hay kết quả kiểm định.

Prisma seed và chatbot cùng đọc file này. Seed tạo thêm 4 tài khoản, 15 đơn hàng và các nhận xét giả lập; email dùng example.com, số điện thoại và địa chỉ đều là dữ liệu minh họa.

frontend/public/images/demo/\*.svg, hero.svg và product-placeholder.svg là hình vector tạo riêng bằng scripts/generate-demo-assets.mjs. Chạy `node scripts/generate-demo-assets.mjs` để tái tạo; không có ảnh stock, logo thanh toán hay mô hình nhúng cần tải xuống.

Các JPEG tải lên từ bản dự án cũ được lưu riêng ở .local/legacy-uploads (không đưa vào bản xuất công khai), vì chưa xác định được nguồn và quyền sử dụng. Không dùng chúng trong seed. Lịch sử Git cũ vẫn có thể chứa các ảnh này.

Font và biểu tượng trên giao diện tải từ Google Fonts; cần mạng cho các tài nguyên đó. Hình sản phẩm và hero được phục vụ cục bộ.
