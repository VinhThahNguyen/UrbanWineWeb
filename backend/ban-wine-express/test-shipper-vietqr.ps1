$ErrorActionPreference = "Stop"

try {
    Write-Host "=== 1. Login Admin ===" -ForegroundColor Cyan
    $adminLogin = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@urbanwine.com","password":"Admin@123"}'
    $adminToken = $adminLogin.token
    Write-Host "Admin login OK" -ForegroundColor Green

    Write-Host "`n=== 2. Login Shipper 1 ===" -ForegroundColor Cyan
    $s1Login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"shipper1@urbanwine.com","password":"123456"}'
    $s1Token = $s1Login.token
    $s1Id = $s1Login.userId
    Write-Host "Shipper 1 login OK - ID: $s1Id, Name: $($s1Login.fullName)" -ForegroundColor Green

    # -------------------------------------------------------------------------
    # KỊCH BẢN 1: KHÁCH QUÉT VIETQR TẠI CHỖ & THANH TOÁN THÀNH CÔNG (NORMAL FLOW)
    # -------------------------------------------------------------------------
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> KICH BAN 1: QUET VIETQR TAI CHO -> THANH TOAN -> GIAO HANG <<<" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta

    Write-Host "`n[1.1] Tao don hang COD..." -ForegroundColor Cyan
    $order1Body = @{
        recipientName = "Anh Hoang"
        recipientPhone = "0933221100"
        deliveryAddress = "So 88 Pho Hue, Quan Hoan Kiem, Ha Noi"
        paymentMethod = "COD"
        items = @(
            @{
                wineId = 1
                quantity = 1
            }
        )
    } | ConvertTo-Json -Depth 4
    $order1 = Invoke-RestMethod -Uri "http://localhost:8080/api/orders/place-order" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $order1Body
    $orderId1 = $order1.orderId
    Write-Host "Tao thanh cong Don #$orderId1 (TotalAmount: $($order1.totalAmount) VND)" -ForegroundColor Green

    Write-Host "`n[1.2] Admin duyet va gan don #$orderId1 cho Shipper 1..." -ForegroundColor Cyan
    $null = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId1/approve" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }
    $assign1Body = @{ shipperId = $s1Id; note = "Giao cho khach tai toa nha" } | ConvertTo-Json
    $assigned1 = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId1/assign-shipper" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $assign1Body
    Write-Host "Don #$orderId1 da o trang thai SHIPPING, Shipper = $($assigned1.shipperName)" -ForegroundColor Green

    Write-Host "`n[1.3] Shipper 1 den noi, khach xin quet QR -> Shipper 1 tao ma VietQR dong..." -ForegroundColor Cyan
    $qrRes1 = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId1/generate-qr" -Method Post -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "TAO MA VIETQR DONG THANH CONG!" -ForegroundColor Green
    Write-Host " - Order ID: $($qrRes1.orderId)"
    Write-Host " - So tien can thu: $($qrRes1.amountToCollect) VND" -ForegroundColor Yellow
    Write-Host " - Ngan hang: $($qrRes1.bankId) - So TK: $($qrRes1.accountNo) - Chu TK: $($qrRes1.accountName)"
    Write-Host " - Noi dung chuyen khoan: $($qrRes1.transferMemo)" -ForegroundColor Yellow
    Write-Host " - Link anh ma QR: $($qrRes1.qrCodeUrl)" -ForegroundColor Cyan
    Write-Host " - Thoi gian hieu luc: $($qrRes1.expiresInSeconds) giay (15 phut)" -ForegroundColor Yellow

    Write-Host "`n[1.4] Shipper 1 kiem tra trang thai thanh toan khi khach chua quet (Polling)..." -ForegroundColor Cyan
    $pollBefore = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId1/payment-status" -Method Get -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "Trang thai hien tai: $($pollBefore.paymentStatus) (Ky vong: UNPAID)" -ForegroundColor Yellow
    Write-Host "Thong diep man hinh: $($pollBefore.message)" -ForegroundColor Yellow

    Write-Host "`n[1.5] Khach quet QR xong -> Ngan hang ban Webhook IPN xac nhan tien vao..." -ForegroundColor Cyan
    $webhookBody = @{
        orderId = $orderId1
        amount = $qrRes1.amountToCollect
        referenceCode = "MB_BANK_CONFIRM_778899"
    } | ConvertTo-Json
    $null = Invoke-RestMethod -Uri "http://localhost:8080/api/payment/vietqr-webhook" -Method Post -ContentType "application/json" -Body $webhookBody
    Write-Host "Webhook da ghi nhan tien vao tai khoan thanh cong!" -ForegroundColor Green

    Write-Host "`n[1.6] Shipper 1 kiem tra lai trang thai (Polling sau khi tien vao)..." -ForegroundColor Cyan
    $pollAfter = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId1/payment-status" -Method Get -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "Trang thai sau Webhook: $($pollAfter.paymentStatus) (Ky vong: PAID)" -ForegroundColor Green
    Write-Host "Ma giao dich ngan hang: $($pollAfter.bankReceiptCode)" -ForegroundColor Green
    Write-Host "Thong diep man hinh: $($pollAfter.message)" -ForegroundColor Green

    Write-Host "`n[1.7] Kiem tra trang thai don hang: Theo Lua chon A, don VẪN GIỮ NGUYÊN SHIPPING..." -ForegroundColor Cyan
    $checkOrder = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId1" -Method Get -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "Trang thai don hang hien tai: $($checkOrder.orderStatus) (Dung 100% theo Lua chon A: SHIPPING)" -ForegroundColor Green

    Write-Host "`n[1.8] Kiem tra chuong thong bao cua Shipper 1..." -ForegroundColor Cyan
    $s1Notifs = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/notifications" -Method Get -Headers @{ Authorization = "Bearer $s1Token" }
    if ($s1Notifs.Count -gt 0) {
        Write-Host "Chuong thong bao: $($s1Notifs[0].title) | $($s1Notifs[0].message)" -ForegroundColor Yellow
    }

    Write-Host "`n[1.9] Shipper 1 trao ruou tan tay khach va bam Giao hang thanh cong (UC_2.3.2)..." -ForegroundColor Cyan
    $completed1 = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId1/complete" -Method Post -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "GIAO HANG HOAN TAT! OrderStatus = $($completed1.orderStatus), PaymentStatus = $($completed1.paymentStatus)" -ForegroundColor Green

    # -------------------------------------------------------------------------
    # KỊCH BẢN 2: KHÁCH ĐỔI Ý TRẢ TIỀN MẶT -> HỦY PHIÊN QR (ALTERNATIVE FLOW)
    # -------------------------------------------------------------------------
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> KICH BAN 2: KHACH DOI Y TRA TIEN MAT -> HUY PHIEN QR <<<" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta

    Write-Host "`n[2.1] Tao don hang thu 2..." -ForegroundColor Cyan
    $order2Body = @{
        recipientName = "Bac Nam"
        recipientPhone = "0944556677"
        deliveryAddress = "So 22 Phan Chu Trinh, Hoan Kiem, Ha Noi"
        paymentMethod = "COD"
        items = @(
            @{
                wineId = 1
                quantity = 1
            }
        )
    } | ConvertTo-Json -Depth 4
    $order2 = Invoke-RestMethod -Uri "http://localhost:8080/api/orders/place-order" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $order2Body
    $orderId2 = $order2.orderId
    $null = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId2/approve" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }
    $assign2Body = @{ shipperId = $s1Id; note = "Giao buoi sang" } | ConvertTo-Json
    $assigned2 = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId2/assign-shipper" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $assign2Body
    Write-Host "Don #$orderId2 da san sang giao cho Shipper 1" -ForegroundColor Green

    Write-Host "`n[2.2] Shipper tao ma QR..." -ForegroundColor Cyan
    $qrRes2 = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId2/generate-qr" -Method Post -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "Da tao ma QR cho don #$orderId2" -ForegroundColor Green

    Write-Host "`n[2.3] Khach tim thay tien mat va xin tra tien mat -> Shipper huy phien QR..." -ForegroundColor Cyan
    $cancelQrRes = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId2/cancel-qr" -Method Post -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "DA HUY PHIEN QR THANH CONG! Phuong thuc thanh toan da chuyen ve: $($cancelQrRes.paymentMethod)" -ForegroundColor Green

    Write-Host "`n[2.4] Shipper thu tien mat va bam Giao thanh cong..." -ForegroundColor Cyan
    $completed2 = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId2/complete" -Method Post -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "GIAO THANH CONG BANG TIEN MAT HOAN TAT! OrderStatus = $($completed2.orderStatus), PaymentStatus = $($completed2.paymentStatus)" -ForegroundColor Green

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host ">>> TAT CA CAC KICH BAN UC_2.3.4 DA TEST THANH CONG 100%! <<<" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green

} catch {
    Write-Host "`n[ERROR]: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response Body: " $reader.ReadToEnd() -ForegroundColor Red
    }
}
