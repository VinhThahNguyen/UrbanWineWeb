# Script test tự động kịch bản từ Login -> Select Payment Method (COD / VNPAY)
param (
    [string]$BaseUrl = "http://localhost:8080/api",
    [string]$Method = "COD" # "COD" hoặc "VNPAY"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " URBAN WINE EXPRESS - TEST FLOW: LOGIN -> PAYMENT METHOD" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "`nBạn muốn làm gì?" -ForegroundColor Yellow
Write-Host "1. Đăng ký tài khoản mới (Khuyên dùng khi CSDL vừa được tạo lại)" -ForegroundColor Cyan
Write-Host "2. Đăng nhập tài khoản có sẵn" -ForegroundColor Cyan
$authChoice = Read-Host "Nhập lựa chọn (1 hoặc 2, mặc định 1)"
if (-not $authChoice) { $authChoice = "1" }

$userEmail = "mycustomer@gmail.com"
$userPassword = "Password@123"

if ($authChoice -eq "1") {
    $inputEmail = Read-Host "`nNhập email muốn đăng ký (bấm Enter để dùng mặc định: $userEmail)"
    if ($inputEmail) { $userEmail = $inputEmail }
    $inputPass = Read-Host "Nhập mật khẩu (bấm Enter để dùng mặc định: $userPassword)"
    if ($inputPass) { $userPassword = $inputPass }

    # 1. Đăng ký tài khoản
    Write-Host "`n[0.1] Đang gửi yêu cầu đăng ký tài khoản [$userEmail]..." -ForegroundColor Yellow
    $registerBody = @{
        email = $userEmail
        password = $userPassword
        fullName = "Khách Hàng Mới"
        phone = "0987654321"
        birthDate = "2000-01-01"
    } | ConvertTo-Json

    try {
        $regRes = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
        Write-Host "Đăng ký thành công! Hệ thống đã gửi mã OTP kích hoạt." -ForegroundColor Green
    } catch {
        Write-Host "Lỗi khi đăng ký: $_" -ForegroundColor Red
        exit
    }

    # 2. Nhập OTP kích hoạt tài khoản
    Write-Host "`n>>> Vui lòng xem Console Spring Boot để lấy MÃ OTP ĐĂNG KÝ (Loại: REGISTER) <<<" -ForegroundColor Magenta
    $regOtp = Read-Host "Nhập mã OTP kích hoạt tài khoản 6 số"
    $verifyRegBody = @{
        email = $userEmail
        otpCode = $regOtp
    } | ConvertTo-Json

    try {
        $verifyRegRes = Invoke-RestMethod -Uri "$BaseUrl/auth/verify-register-otp" -Method Post -Body $verifyRegBody -ContentType "application/json"
        Write-Host "Kích hoạt tài khoản thành công! Bây giờ sẽ tiến hành đăng nhập." -ForegroundColor Green
    } catch {
        Write-Host "Lỗi khi kích hoạt OTP: $_" -ForegroundColor Red
        exit
    }
} else {
    $inputEmail = Read-Host "`nNhập email đăng nhập (bấm Enter để dùng customer@urbanwine.com)"
    if ($inputEmail) { 
        $userEmail = $inputEmail 
        $userPassword = Read-Host "Nhập mật khẩu"
    } else {
        $userEmail = "customer@urbanwine.com"
        $userPassword = "Customer@123"
    }
}

# 1. Login
Write-Host "`n[1] Đăng nhập tài khoản [$userEmail]..." -ForegroundColor Yellow
$loginBody = @{
    email = $userEmail
    password = $userPassword
} | ConvertTo-Json

try {
    $loginRes = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "Kết quả Login: " ($loginRes | ConvertTo-Json -Compress)
} catch {
    Write-Host "Lỗi khi Login: $_" -ForegroundColor Red
    exit
}

# 2. Xử lý OTP nếu tài khoản yêu cầu OTP (Customer mặc định yêu cầu OTP)
$token = ""
if ($loginRes.requiresOtp) {
    Write-Host "`n>>> Vui lòng kiểm tra Console Spring Boot hoặc Email để lấy mã OTP 6 số <<<" -ForegroundColor Green
    $otpCode = Read-Host "Nhập mã OTP"
    
    $verifyBody = @{
        email = $userEmail
        otpCode = $otpCode
    } | ConvertTo-Json

    try {
        $verifyRes = Invoke-RestMethod -Uri "$BaseUrl/auth/verify-login-otp" -Method Post -Body $verifyBody -ContentType "application/json"
        $token = $verifyRes.accessToken
        Write-Host "Xác thực OTP thành công! Đã lấy AccessToken." -ForegroundColor Green
    } catch {
        Write-Host "Xác thực OTP thất bại: $_" -ForegroundColor Red
        exit
    }
} else {
    $token = $loginRes.accessToken
    Write-Host "Đăng nhập thành công! Đã lấy AccessToken." -ForegroundColor Green
}

$headers = @{
    "Authorization" = "Bearer $token"
}

# 3. Lấy danh sách sản phẩm để chọn rượu còn hàng
Write-Host "`n[2] Lấy danh sách rượu còn tồn kho..." -ForegroundColor Yellow
$wineId = 1
try {
    $winesRes = Invoke-RestMethod -Uri "$BaseUrl/wines?page=0&size=5" -Method Get -Headers $headers
    if ($winesRes.content -and $winesRes.content.Count -gt 0) {
        $availableWine = $winesRes.content | Where-Object { $_.stockQuantity -gt 0 } | Select-Object -First 1
        if ($availableWine) {
            $wineId = $availableWine.wineId
            Write-Host "Chọn sản phẩm: $($availableWine.wineName) (ID: $wineId, Tồn kho: $($availableWine.stockQuantity))" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "Không lấy được danh sách sản phẩm, mặc định dùng Wine ID = 1" -ForegroundColor DarkGray
}

# 4. Đặt hàng với Payment Method được chọn
Write-Host "`n[3] Đặt hàng với Payment Method: [$Method]..." -ForegroundColor Yellow
$orderBody = @{
    recipientName = "Nguyễn Khách Hàng"
    recipientPhone = "0988888888"
    deliveryAddress = "Số 10 Tràng Tiền, Hoàn Kiếm, Hà Nội"
    paymentMethod = $Method
    items = @(
        @{
            wineId = [int]$wineId
            quantity = 1
        }
    )
} | ConvertTo-Json

try {
    $orderRes = Invoke-RestMethod -Uri "$BaseUrl/orders/place-order" -Method Post -Body $orderBody -ContentType "application/json" -Headers $headers
    Write-Host "`n====== KẾT QUẢ TẠO ĐƠN HÀNG ======" -ForegroundColor Green
    Write-Host "Mã đơn hàng: $($orderRes.orderId)"
    Write-Host "Trạng thái đơn hàng: $($orderRes.orderStatus)"
    Write-Host "Phương thức thanh toán: $($orderRes.paymentMethod)"
    Write-Host "Trạng thái thanh toán: $($orderRes.paymentStatus)"
    Write-Host "Tổng tiền: $($orderRes.totalAmount) VNĐ"

    if ($Method -eq "VNPAY") {
        Write-Host "`n[VNPAY URL]: $($orderRes.paymentUrl)" -ForegroundColor Magenta
        Write-Host "Mở URL trên trình duyệt để kiểm tra thanh toán qua cổng VNPay Sandbox!" -ForegroundColor Yellow
    }

    # 5. UC_2.2.6: Xem danh sách đơn hàng của tôi
    Write-Host "`n[4] Kiểm tra UC_2.2.6: Xem danh sách đơn hàng của tôi..." -ForegroundColor Yellow
    $myOrders = Invoke-RestMethod -Uri "$BaseUrl/orders/my-orders" -Method Get -Headers $headers
    Write-Host "Tìm thấy $($myOrders.Count) đơn hàng trong lịch sử." -ForegroundColor Green
    foreach ($o in $myOrders | Select-Object -First 3) {
        Write-Host " -> Mã: $($o.orderCode) | Trạng thái: $($o.orderStatus) | Yêu cầu hủy: $($o.cancelStatus) | Tổng tiền: $($o.totalAmount)" -ForegroundColor Cyan
    }

    # 6. UC_2.2.6: Xem chi tiết đơn hàng vừa tạo
    Write-Host "`n[5] Kiểm tra UC_2.2.6: Xem chi tiết đơn hàng #$($orderRes.orderId)..." -ForegroundColor Yellow
    $orderDetail = Invoke-RestMethod -Uri "$BaseUrl/orders/$($orderRes.orderId)" -Method Get -Headers $headers
    Write-Host "Chi tiết đơn hàng: Mã tham chiếu $($orderDetail.orderCode), Người nhận: $($orderDetail.recipientName), Địa chỉ: $($orderDetail.deliveryAddress)" -ForegroundColor Green

    # 7. UC_2.2.6: Hủy đơn hàng PENDING trực tiếp và hoàn kho
    $cancelChoice = Read-Host "`nBạn có muốn thử hủy trực tiếp đơn hàng này (PENDING -> CANCELLED & Hoàn kho)? (Y/N)"
    if ($cancelChoice -eq "Y" -or $cancelChoice -eq "y") {
        $cancelBody = @{
            reason = "Test hủy đơn hàng PENDING theo kịch bản UC_2.2.6"
        } | ConvertTo-Json
        $cancelRes = Invoke-RestMethod -Uri "$BaseUrl/orders/$($orderRes.orderId)/cancel" -Method Post -Body $cancelBody -ContentType "application/json" -Headers $headers
        Write-Host "`n[KẾT QUẢ HỦY ĐƠN]:" -ForegroundColor Green
        Write-Host " -> Trạng thái mới: $($cancelRes.orderStatus)" -ForegroundColor Cyan
        Write-Host " -> Trạng thái yêu cầu hủy: $($cancelRes.cancelStatus)" -ForegroundColor Cyan
        Write-Host " -> Lý do hủy: $($cancelRes.cancellationReason)" -ForegroundColor Cyan

        # Thử test Resume Payment sau khi đơn đã CANCELLED (Kiểm tra tồn kho thời gian thực E2)
        $resumeChoice = Read-Host "`nĐơn đã bị CANCELLED. Bạn có muốn thử khôi phục & thanh toán lại (Resume Payment)? (Y/N)"
        if ($resumeChoice -eq "Y" -or $resumeChoice -eq "y") {
            $resumeRes = Invoke-RestMethod -Uri "$BaseUrl/orders/$($orderRes.orderId)/resume-payment" -Method Post -Headers $headers
            Write-Host "`n[KẾT QUẢ RESUME PAYMENT]:" -ForegroundColor Green
            Write-Host " -> Trạng thái sau khôi phục: $($resumeRes.orderStatus)" -ForegroundColor Cyan
            Write-Host " -> URL VNPAY thanh toán mới: $($resumeRes.paymentUrl)" -ForegroundColor Magenta
        }
    }
} catch {
    Write-Host "Lỗi khi thực hiện: $_" -ForegroundColor Red
}
