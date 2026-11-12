# EcoStore · Zero-Waste E-commerce

Bản demo cửa hàng sản phẩm ít rác thải bằng tiếng Việt: Vue 3, NestJS, PostgreSQL và chatbot EcoBot. Dùng để học tập, trải nghiệm luồng mua hàng và chia sẻ mã nguồn.

**Đây là dự án mô phỏng. Không bán hàng, không giao hàng và không xử lý tiền thật.** Tài khoản, nhận xét, thông tin sản phẩm và thông tin môi trường đều là dữ liệu mẫu.

![Hình minh họa EcoStore](frontend/public/images/hero.svg)

## Chạy trên máy cá nhân

Cần Node.js **20.19+ hoặc 22.12+**, npm, Python **3.10+**, Docker Desktop đang chạy (hoặc PostgreSQL 16 cài sẵn). Các lệnh dưới đây chạy tại thư mục gốc.

```sh
npm run setup:env
npm run install:all
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
```

`setup:env` tạo các file `.env` từ mẫu, sinh JWT secret ngẫu nhiên và **giữ nguyên file đã có**. Nếu dùng lại bản dự án cũ, đối chiếu `backend/.env` với [backend/.env.example](backend/.env.example): DATABASE_URL phải trỏ tới **ZeroWasteDemo** với đúng mật khẩu/cổng của Compose; JWT_SECRET cần chuỗi ngẫu nhiên ít nhất 32 ký tự. Không chạy seed lên database thật.

Mở ba terminal:

```sh
# Terminal 1: NestJS API
npm run dev:backend

# Terminal 2: Vue frontend
npm run dev:frontend
```

Terminal 3 trên Windows PowerShell:

```powershell
python -m venv chatbot/.venv
chatbot/.venv/Scripts/python.exe -m pip install -r chatbot/requirements.txt
chatbot/.venv/Scripts/python.exe chatbot/api_chatbot.py
```

Trên macOS/Linux, dùng `chatbot/.venv/bin/python` thay cho `chatbot/.venv/Scripts/python.exe`.

| Dịch vụ        | Địa chỉ                        |
| -------------- | ------------------------------ |
| Cửa hàng       | http://localhost:5173          |
| Trang quản trị | http://localhost:5173/admin    |
| API            | http://localhost:3000/api/v1   |
| Swagger        | http://localhost:3000/api/docs |
| Chatbot health | http://localhost:5000/health   |

Tài khoản demo sau khi seed:

| Vai trò    | Email                | Mật khẩu mặc định |
| ---------- | -------------------- | ----------------- |
| Quản trị   | admin@example.com    | EcoDemo123!       |
| Khách hàng | customer@example.com | EcoDemo123!       |

Đặt `DEMO_PASSWORD` trước lần seed đầu tiên để dùng mật khẩu khác. Seed chạy lại không đặt lại mật khẩu, tồn kho hay nội dung đã sửa của bản ghi đã tồn tại.

## Có gì trong bản demo?

- Trang chủ, danh mục, tìm kiếm và bộ lọc sản phẩm; biến thể, tồn kho và khuyến mãi theo ngày hiệu lực.
- Đăng ký, đăng nhập JWT, hồ sơ, đổi mật khẩu và ảnh đại diện.
- Giỏ hàng, đặt hàng COD, mô phỏng MoMo/PayPal; backend tính giá và phí vận chuyển. Hai checkout cùng mua món cuối chỉ một yêu cầu thành công.
- Xem và hủy đơn đang chờ; hoàn kho trong transaction. Quản trị theo dõi đơn và chuyển trạng thái theo luồng hợp lệ.
- Đánh giá sau đơn hoàn thành, đính kèm ảnh/video, quản trị ẩn/hiện bình luận.
- Dashboard doanh thu, tồn kho và khách hàng.
- EcoBot tìm kiếm danh mục/chính sách không cần API key; bật Groq bằng `GROQ_API_KEY` nếu muốn tạo câu trả lời tự nhiên hơn. Khi Groq lỗi, tự dùng câu trả lời cục bộ.
- 18 sản phẩm, 36 biến thể, 6 danh mục, 4 tài khoản, 15 đơn mẫu và nhận xét mô phỏng. 20 hình SVG được tạo riêng, không cần tải ảnh sản phẩm từ bên ngoài.

## Email và Google tùy chọn

Để thử quên mật khẩu, bật hộp thư cục bộ:

```sh
docker compose --profile mail up -d
```

Giữ SMTP*HOST=localhost, SMTP_PORT=1025 trong backend/.env và mở http://localhost:8025 để đọc thư thử nghiệm. Không gửi thư thật khi dùng cấu hình này. Đổi SMTP*\* nếu dùng máy chủ email riêng.

Google OAuth cần GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET và GOOGLE_CALLBACK_URL. Không có cấu hình, dùng đăng nhập email/mật khẩu. Bật `VITE_GOOGLE_LOGIN=true` trong frontend/.env nếu muốn hiện nút Google. Callback dùng OAuth state và trả token qua URL fragment.

## Kiểm tra

```sh
npm run build
npm test
# Windows:
chatbot/.venv/Scripts/python.exe -m unittest discover -s chatbot -p "test_*.py" -v

# Khi API và PostgreSQL demo đang chạy:
npm run demo:smoke
# Khi Mailpit và API có SMTP_HOST cấu hình đang chạy:
npm run demo:mail-smoke
```

Smoke test kiểm tra API thật, quyền truy cập, nhập liệu lồng nhau, giá, tồn kho đồng thời, hoàn kho và thanh toán mô phỏng. Nó tạo bản ghi thử có tên riêng rồi dọn chúng. Không chạy lên dịch vụ sản xuất. GitHub Actions chạy build, unit test, chatbot test và smoke test với PostgreSQL riêng.

## Cấu trúc và công nghệ

```text
backend/
  prisma/              Schema, migrations tiến tới và seed
  src/                 NestJS: controller → service → repository → Prisma
  test/                Kiểm thử HTTP
frontend/
  src/views/           Trang khách hàng và quản trị
  src/components/      Navbar, footer, chatbot
  src/service/         Axios API client
  src/utils/           URL ảnh, giá, thông báo
  public/images/       Minh họa SVG dùng trong dữ liệu mẫu
chatbot/
  api_chatbot.py       Flask + tìm kiếm nhẹ + Groq HTTP tùy chọn
  data_txt/            Chính sách cửa hàng mẫu
data/catalogue.json    Danh mục dùng chung cho seed và EcoBot
scripts/               Thiết lập môi trường, hình ảnh, smoke test, dọn build
docs/                  Kiến trúc, kiểm thử và phạm vi demo
```

Frontend dùng Vue Router, Tailwind CSS, Axios, Chart.js, vue-easy-lightbox và vue-toastification. Backend dùng NestJS 11, Prisma 5, Passport/JWT, bcrypt, class-validator, Swagger và Nodemailer. Chatbot chỉ cần Flask, flask-cors, python-dotenv và Waitress; không cần PyTorch, FAISS hay tải embedding model.

Xem [kiến trúc và API](docs/ARCHITECTURE.md), [báo cáo sửa lỗi và kiểm thử](docs/MAINTENANCE.md), [bảo mật](SECURITY.md) và [nguồn dữ liệu/hình ảnh](data/README.md).

## Dọn dung lượng và chia sẻ

`npm run clean` xóa build, coverage và cache Python, giữ dependencies đang dùng và dữ liệu cá nhân. Có thể xóa `node_modules` và `chatbot/.venv` khi không làm việc; cài lại bằng lockfile/requirements khi cần. Hai môi trường Python cũ và vector index đã được thay bằng môi trường nhẹ.

`npm run export:public` tạo bản mã nguồn sạch ở `release/zero-waste-ecommerce`, bỏ qua .git, .env, môi trường ảo, dependencies, ảnh tải lên và dữ liệu cục bộ. Kiểm tra nội dung trước khi đăng vào repository mới.

Không commit .env, khóa API, mật khẩu SMTP, database dump hoặc file upload của người dùng. Nếu khóa từng xuất hiện trong commit cũ, phải thu hồi/đổi khóa; xóa khỏi file hiện tại không xóa lịch sử Git. Lịch sử repo hiện tại chưa được viết lại.

Docker Compose chỉ chạy PostgreSQL và Mailpit tùy chọn, không đóng gói cả ba ứng dụng. Để dừng DB: `docker compose stop`. Dữ liệu nằm trong volume riêng; không cần xóa volume để cập nhật mã nguồn.

Chưa thêm giấy phép mã nguồn theo lựa chọn của chủ dự án. Không có file LICENSE trong bản bàn giao.
