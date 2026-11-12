# Bảo mật

Đây là bản demo chạy cục bộ, chưa phải hệ thống bán hàng sản xuất. Báo lỗi bảo mật bằng kênh riêng với chủ repository; không đưa mật khẩu, token hoặc dữ liệu cá nhân vào issue công khai.

- JWT_SECRET phải ngẫu nhiên, tối thiểu 32 ký tự. Token hết hạn sau một giờ; backend đọc lại trạng thái và quyền tài khoản trên mỗi yêu cầu.
- Không lưu khóa trong mã nguồn, ảnh hoặc tài liệu. Biến VITE\_\* được đưa vào JavaScript công khai.
- Thông tin đăng nhập SMTP đã từng được gắn cứng trong bản cũ. Chủ sở hữu cần thu hồi/đổi thông tin đó, cùng mọi khóa từng công khai. Bản sửa chỉ loại bỏ khỏi cây mã nguồn hiện tại, không xóa lịch sử Git hay xác nhận khóa đã được thu hồi.
- Thanh toán demo cần DEMO_PAYMENTS=true và NODE_ENV khác production, kiểm tra chủ đơn và mã phương thức mô phỏng. Không dùng endpoint này như xác nhận thanh toán thật.
- Nếu triển khai thật, cần webhook đã xác minh từ nhà cung cấp thanh toán, HTTPS, quản lý secret, giới hạn tần suất phân tán, sao lưu và giám sát, chính sách dữ liệu và kiểm tra bảo mật riêng.
- Bản demo lưu token trong localStorage để đơn giản hóa trải nghiệm; cân nhắc cookie HttpOnly và bảo vệ CSRF cho triển khai thực tế.
- Upload giới hạn 10MB/file, kiểm tra phần mở rộng và MIME. Chưa có quét virus hoặc giải mã file để xác minh nội dung; không dùng làm kho file công khai.
- Không tin HTML do chatbot sinh. Giao diện hiển thị câu trả lời dưới dạng văn bản đã được Vue escape.
- Không tự động ghi đè .env, xóa database cũ hoặc viết lại lịch sử Git. Database demo sử dụng tên/volume riêng.

Chạy npm audit trong backend và frontend sau khi cập nhật thư viện. CI không thay thế việc đánh giá bảo mật trước triển khai.
