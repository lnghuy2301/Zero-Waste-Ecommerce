# Bàn giao bản demo · 2026-11-10

Phạm vi đã thống nhất: demo công khai chạy trên máy cá nhân, thanh toán mô phỏng, dữ liệu giả lập và chatbot có thể chạy không cần API key. Chưa thêm giấy phép theo lựa chọn của chủ dự án.

## Các thay đổi chính

| Khu vực          | Đã xử lý                                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Xác thực         | Dùng chung JWT secret qua ConfigModule; loại khóa mặc định sai lệch; đọc lại quyền và trạng thái tài khoản trên mỗi request; không trả password/reset token; Google OAuth tùy chọn với state cookie |
| Tài khoản        | Bỏ SMTP credential gắn cứng; cấu hình qua môi trường; DTO khôi phục mật khẩu; tiêu thụ reset token một lần; sửa upload avatar gửi hai request; giữ tài khoản ADMIN khi xóa danh sách                |
| Database         | Thêm migration tiến tới cho các cột thiếu, backfill liên kết hồ sơ; các module dùng chung một Prisma client; giữ database/volume demo riêng                                                         |
| Checkout         | Kiểm tra lồng nhau, gộp biến thể trùng, giới hạn số lượng; tính khuyến mãi và phí giao hàng ở server; trừ kho có điều kiện trong transaction                                                        |
| Đơn hàng         | Hoàn kho một lần khi hủy; kiểm soát chuyển trạng thái; API thanh toán mô phỏng riêng có kiểm tra chủ đơn; giữ lịch sử khi xóa sản phẩm                                                              |
| Quyền truy cập   | Giới hạn xóa giỏ theo tài khoản; bảo vệ đọc/sửa hồ sơ; yêu cầu ADMIN khi ẩn bình luận; bỏ CRUD chi tiết đơn độc lập                                                                                 |
| Dữ liệu hiển thị | Sửa lọc và sort giá; API danh sách trả mảng rỗng hợp lệ; cập nhật thống kê khi tạo/ẩn đánh giá; sửa tổng hóa đơn gồm phí giao hàng                                                                  |
| Frontend         | Build TypeScript; URL môi trường và ảnh dùng chung; 404; giao diện di động, menu mobile, lỗi tải dữ liệu và retry; bỏ form newsletter không hoạt động                                               |
| Chatbot          | Flask/Waitress, tìm kiếm nhẹ chuẩn hóa tiếng Việt, Groq tùy chọn và fallback; body/question limits; hiển thị văn bản đã escape thay cho HTML                                                        |
| Upload           | Tên UUID của Node, giới hạn 10MB, kiểm tra extension/MIME; xóa file review đã bỏ và avatar cũ                                                                                                       |
| Chia sẻ          | README, tài liệu kiến trúc, SECURITY, mẫu môi trường, CI, script clean, export và smoke test                                                                                                        |

## Dọn dung lượng

- Xóa môi trường Python cũ ở root và chatbot/venv: chúng tham chiếu Python trên máy khác, không dùng được trên máy hiện tại.
- Thay môi trường cũ khoảng 1,15 GB bằng chatbot/.venv khoảng 17,4 MB: giảm xấp xỉ **1,1 GB** chỉ tính môi trường Python.
- Bỏ FAISS index/pickle cũ, các import LangChain, Sentence Transformers, PyTorch và SDK thừa. Chatbot chỉ cần 4 thư viện trực tiếp.
- Bỏ Pinia/counter mẫu, marked/@types/marked, Vite devtools không dùng, ServeStaticModule trùng, uuid và khai báo dependency dư.
- Bỏ MainLayout không dùng, ảnh nền lỗi đường dẫn, hai màn thanh toán giả cũ, API/service order-detail độc lập và các test scaffold không kiểm tra được nghiệp vụ.
- 58 JPEG cũ (~3,9 MB) được giữ ở .local/legacy-uploads, nằm ngoài bản export. Dữ liệu mẫu dùng 20 SVG mới (~17 KB).
- Giữ dependencies đang dùng để làm việc; script clean chỉ dọn build/cache, không xóa database, .env hoặc archive.

## Dữ liệu mẫu

6 danh mục, 18 sản phẩm, 36 biến thể, 4 tài khoản, 15 đơn hàng và 6 đánh giá mẫu. Danh mục gốc dùng chung giữa Prisma seed và EcoBot. Seed không đặt lại mật khẩu, tồn kho hoặc nội dung bản ghi đã tồn tại.

## Kết quả xác minh tại máy này

Môi trường: Windows PowerShell, Node 20.20.0, Python 3.13.5, PostgreSQL 16 trong Docker.

| Kiểm tra                    | Kết quả                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Backend build               | Đạt                                                                                               |
| Frontend build + vue-tsc    | Đạt                                                                                               |
| Oxlint frontend             | 0 lỗi, 0 cảnh báo                                                                                 |
| Backend unit tests          | 19/19                                                                                             |
| HTTP tests                  | 4/4                                                                                               |
| Chatbot tests               | 9/9                                                                                               |
| Smoke API với PostgreSQL    | 49 yêu cầu đạt, thêm kiểm tra race tồn kho, quyền, đơn giá và thanh toán                          |
| SMTP cục bộ                 | Thư tới Mailpit, đổi mật khẩu, từ chối mật khẩu cũ và token đã dùng                               |
| Trình duyệt khách hàng      | Edge headless, desktop 1440px và mobile 390px; ảnh, đăng nhập, giỏ, chatbot; không lỗi JavaScript |
| Trình duyệt quản trị        | Dashboard, sản phẩm, đơn hàng, tài khoản, bình luận; không lỗi JavaScript/API                     |
| Migration từ database trống | Đạt                                                                                               |
| Seed chạy lặp lại           | Đạt                                                                                               |
| Prisma diff DB/schema       | Không có khác biệt                                                                                |
| npm audit --omit=dev        | 0 cảnh báo ở cả backend/frontend                                                                  |

Một số request font từ Google chậm trong môi trường kiểm tra; kiểm thử quản trị dùng font dự phòng để tách lỗi mạng khỏi chức năng ứng dụng.

Audit gồm công cụ phát triển còn **28** cảnh báo ở backend (5 thấp, 23 trung bình), **11 trung bình** ở frontend; không còn mức high/critical tại lần kiểm tra này. Chưa ép nâng major CLI/Jest/ESLint để xử lý toàn bộ chuỗi dependency phát triển. Đây là trạng thái tại lúc bàn giao, không phải cam kết cho các advisory tương lai.

## Những phần cần chủ dự án lưu ý

- Thu hồi/đổi thông tin SMTP hoặc mọi khóa từng có trong commit cũ. Mã nguồn hiện tại đã bỏ literal credential; lịch sử Git chưa được viết lại.
- backend/.env có sẵn được giữ lại. Đối chiếu mẫu môi trường và trỏ tới database ZeroWasteDemo trước khi chạy bằng lệnh thường.
- Groq và Google OAuth chưa được thử với tài khoản/khóa thật; chế độ chatbot cục bộ và đăng nhập mật khẩu đã được kiểm tra.
- Hình sản phẩm/hero nằm cục bộ. Font và Material Symbols hiện dùng Google Fonts.
- Giới hạn của bản demo gồm token localStorage, chưa có quét virus upload, chưa có thanh toán thật/webhook và chưa có rate limit phân tán. Xem SECURITY.md.
- CI đã được cấu hình; chưa chạy workflow trên GitHub trong phiên làm việc này.
- Chưa tạo commit, push hoặc công khai repository. Bản export không chứa lịch sử Git, .env, dependencies, virtualenv hay ảnh tải lên.
