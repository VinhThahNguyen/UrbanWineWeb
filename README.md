# Ban Wine Express - Urban Wine Web
**Hệ thống Quản lý Kinh doanh & Giao hàng Rượu Vang Nội thành Siêu Tốc**  
**Dự án môn học:** PRJ301 - FPT University  
**Sinh viên thực hiện:** Nguyễn Thành Vinh - HE190385  
---

Hệ thống gồm 2 phân hệ chính:
- **Backend:** Spring Boot 3.x (Java 21) - `backend/ban-wine-express`
- **Frontend:** React 18 + TypeScript + Vite - `frontend`

---

## 1. Yêu cầu môi trường

| Thành phần | Phiên bản đề xuất | Ghi chú |
| :--- | :--- | :--- |
| **JDK** | 21+ | Yêu cầu cho Spring Boot 3.x |
| **Maven** | Dùng kèm Maven Wrapper (`mvnw`), không cần cài riêng | Kèm sẵn trong thư mục backend |
| **Node.js** | 18+ hoặc 20+ LTS | Môi trường chạy Vite & React |
| **npm** | Đi kèm Node.js | Trình quản lý package |
| **SQL Server** | 2019+ (Đã bật TCP/IP, port 1433) | CSDL: `urban_wine_db` |
| **SMTP Gmail** | Tài khoản Gmail (App Password 16 ký tự) | Gửi OTP 2FA kích hoạt & đăng nhập |

---

## 2. Cấu trúc thư mục chính

```text
ban-wine-express/
├── backend/
│   └── ban-wine-express/                  # Spring Boot REST API
│       ├── src/main/java/com/urbanwine/sell_wine_express/
│       │   ├── config/                    # Seeder, DataInitializer, VNPay Config
│       │   ├── controller/                # Admin, Auth, Order, Shipper, Wine, Payment
│       │   ├── dto/                       # Request & Response DTOs
│       │   ├── entity/                    # JPA Entities (User, Wine, Order, Cart...)
│       │   ├── enums/                     # Role, OrderStatus, PaymentMethod...
│       │   ├── repository/                # Spring Data JPA Repositories
│       │   ├── scheduler/                 # Tự động hủy đơn quá hạn 15p & hoàn kho
│       │   ├── security/                  # JWT Filter, SecurityConfig (RBAC)
│       │   ├── service/                   # Business logic dịch vụ
│       │   └── websocket/                 # Real-time WebSocket Notifications
│       ├── src/main/resources/
│       │   └── application.properties     # Cấu hình CSDL, JWT, Mail, VNPay, VietQR
│       ├── mvnw / mvnw.cmd
│       └── pom.xml
│
├── frontend/                              # Giao diện React + TypeScript + Vite
│   └── src/
│       ├── app/                           # Cấu hình App & Routing
│       ├── features/                      # Phân hệ: admin, auth, cart, checkout, order, shipper, wine
│       ├── realtime/                      # WebSocket Service (Push notification)
│       ├── shared/                        # Axios client, components dùng chung, notification bell
│       └── styles/                        # Theme giao diện rượu vang
│
└── README.md
```

---

## 3. Cấu hình Backend

File cấu hình: `backend/ban-wine-express/src/main/resources/application.properties`

### 3.1. Database (SQL Server)
```properties
spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=urban_wine_db;encrypt=true;trustServerCertificate=true;
spring.datasource.username=sa
spring.datasource.password=<mật khẩu SQL Server của bạn>
spring.jpa.hibernate.ddl-auto=update
```
- Tạo database `urban_wine_db` trên SQL Server trước khi chạy.
- `ddl-auto=update`: Hibernate sẽ tự động cập nhật schema bảng và giữ nguyên dữ liệu. Khi chạy lần đầu, `DatabaseSeeder` và `DataInitializer` sẽ tự nạp danh mục rượu và tài khoản mẫu.

### 3.2. Mail (Gửi OTP 2FA & Thông báo đơn hàng)
```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=<email gmail>
spring.mail.password=<mã app password 16 ký tự>
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
```
- Sử dụng **App Password (16 ký tự)** của Gmail (yêu cầu bật xác thực 2 bước cho tài khoản Google).

### 3.3. JWT & Bảo mật
```properties
jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
jwt.expiration-ms=900000          # Access token 15 phút
jwt.refresh-expiration-ms=604800000 # Refresh token 7 ngày
```

### 3.4. VNPay & VietQR (Cổng thanh toán)
```properties
# VNPay Sandbox
vnpay.tmn-code=75FFOF52
vnpay.hash-secret=XJELTYRGBOSFGEHTLKTJVNJSNUSJOCGD
vnpay.pay-url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
vnpay.return-url=http://localhost:8080/api/payment/vnpay-return

# VietQR tại quầy / Shipper thu tiền
vietqr.bank-id=MB
vietqr.account-no=0987654321
vietqr.account-name=URBAN WINE STORE
```

### 3.5. Chạy Backend
Từ thư mục `backend/ban-wine-express`:

- **Windows:**
  ```powershell
  .\mvnw.cmd clean spring-boot:run
  ```
- **macOS / Linux:**
  ```bash
  ./mvnw clean spring-boot:run
  ```
Backend API mặc định chạy tại: **`http://localhost:8080`**

---

## 4. Cấu hình & Chạy Frontend

Từ thư mục `frontend`:

### 4.1. Cài đặt dependencies
```bash
npm install
```

### 4.2. Các script có sẵn (`package.json`)
| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Khởi chạy dev server (Vite HMR) |
| `npm run build` | Kiểm tra type (`tsc -b`) và build production |
| `npm run preview` | Chạy thử nghiệm bản build production |

### 4.3. Chạy môi trường dev
```bash
npm run dev
```
Mặc định Vite chạy tại: **`http://localhost:5173`**

### 4.4. Kết nối tới Backend
- **REST API:** Gọi qua Axios (`frontend/src/shared/api/client.ts`), mặc định trỏ tới `http://localhost:8080/api` (tự động gắn kèm JWT Bearer Token qua Interceptor).
- **Realtime:** Kết nối qua Native WebSocket (`frontend/src/realtime/websocketService.ts`) tới `ws://localhost:8080/ws/notifications` để nhận thông báo tức thì khi duyệt đơn, gán shipper hoặc thanh toán thành công.

---

## 5. Tài khoản thử nghiệm có sẵn

Hệ thống tự động khởi tạo các tài khoản demo khi khởi động lần đầu:

| Vai trò | Email đăng nhập | Mật khẩu | Ghi chú |
| :--- | :--- | :---: | :--- |
| **Quản trị viên (Admin)** | `admin@urbanwine.com` | `Admin@123` | Quản lý kho, cảnh báo tồn kho, duyệt đơn, bán tại quầy (POS), điều phối shipper |
| **Khách hàng (Customer)** | `Vnguyenthanh0805@gmail.com` | `123456` | Nhận mã OTP 2FA thật gửi về email khi đăng nhập |
| **Giao hàng (Shipper 1)** | `shipper1@urbanwine.com` | `123456` | Xem đơn gán, xác nhận giao thành công, sinh mã VietQR thu tiền tại chỗ |
| **Giao hàng (Shipper 2)** | `shipper2@urbanwine.com` | `123456` | Nhân viên giao hàng dự phòng / đổi ca |

---

## 6. Tính năng nổi bật của hệ thống

1. **Khách hàng (Customer):**
   - Xác thực độ tuổi 18+ (Age Gate) bắt buộc theo luật kinh doanh đồ uống có cồn.
   - Tìm kiếm, lọc rượu theo danh mục, giống nho, xuất xứ và nồng độ cồn (ABV).
   - Đặt hàng nội thành Hà Nội, tự động tính thuế VAT 10% và phí ship 30.000 VNĐ.
   - Thanh toán linh hoạt: COD hoặc VNPay Sandbox (hỗ trợ hoàn tiền nếu hủy đơn).
   - Theo dõi trạng thái đơn hàng thời gian thực qua WebSocket & thông báo chuông.

2. **Quản trị viên (Admin / Store Manager):**
   - Quản trị danh mục rượu (CRUD, Ẩn/Hiện sản phẩm không xóa mềm).
   - Cảnh báo sản phẩm sắp hết hàng (Stock Alert khi tồn kho $\le 5$ chai).
   - Duyệt hoặc từ chối đơn hàng PENDING, xét duyệt yêu cầu hủy đơn PROCESSING.
   - Bán lẻ tại quầy (Offline POS): Tính tiền thối hoặc sinh mã VietQR động tức thì.
   - Điều phối đơn hàng cho Shipper đang trực tuyến (giới hạn tối đa 5 đơn/shipper).

3. **Giao hàng (Shipper):**
   - Danh sách đơn hàng được gán riêng theo tài khoản.
   - Sinh mã VietQR động trên điện thoại để khách quét trả tiền tại chỗ thay vì tiền mặt.
   - Báo cáo giao hàng thành công (tự động chuyển COD sang PAID) hoặc giao thất bại (tự động hoàn trả tồn kho).

4. **Tự động hóa (Scheduler):**
   - Tiến trình nền tự động quét mỗi 60 giây để hủy các đơn PENDING quá hạn 15 phút chưa thanh toán và tự động hoàn trả lại số lượng rượu vào kho.

---

## 7. Thứ tự khởi động khuyến nghị

1. Khởi động SQL Server và tạo cơ sở dữ liệu `urban_wine_db`.
2. Kiểm tra thông tin cấu hình DB và Mail trong `application.properties`.
3. Khởi chạy Backend (`.\mvnw.cmd clean spring-boot:run`) $\rightarrow$ API sẵn sàng tại cổng `:8080`.
4. Khởi chạy Frontend (`npm run dev`) $\rightarrow$ Mở trình duyệt theo địa chỉ Vite (`http://localhost:5173`).
5. Đăng nhập thử bằng các tài khoản ở mục 5 để kiểm tra toàn bộ luồng Auth $\rightarrow$ Order $\rightarrow$ Payment $\rightarrow$ Dispatch $\rightarrow$ Realtime.

---

## 8. Công nghệ sử dụng

- **Backend:** Java 21, Spring Boot 3.x, Spring Data JPA (Hibernate), Spring Security (JWT), Spring WebSocket, Spring Mail (Gmail SMTP), Scheduled Tasks, SQL Server, VNPay Gateway, VietQR.
- **Frontend:** React 18, TypeScript, Vite, React Router DOM v6, Axios, Lucide React, WebSocket Client, Custom CSS.
