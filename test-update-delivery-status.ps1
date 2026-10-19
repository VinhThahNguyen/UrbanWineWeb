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

    Write-Host "`n=== 3. Login Shipper 2 ===" -ForegroundColor Cyan
    $s2Login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"shipper2@urbanwine.com","password":"123456"}'
    $s2Token = $s2Login.token
    $s2Id = $s2Login.userId
    Write-Host "Shipper 2 login OK - ID: $s2Id, Name: $($s2Login.fullName)" -ForegroundColor Green

    # ---------------------------------------------------------
    # KỊCH BẢN 1: GIAO HÀNG THÀNH CÔNG (NORMAL FLOW & BR-09, POST-1)
    # ---------------------------------------------------------
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> KICH BAN 1: GIAO HANG THANH CONG (NORMAL FLOW) <<<" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta

    Write-Host "`n[1.1] Tao don hang COD moi..." -ForegroundColor Cyan
    $order1Body = @{
        recipientName = "Nguyen Van Khach"
        recipientPhone = "0912345678"
        deliveryAddress = "So 18 Le Duan, Quan Hoan Kiem, Ha Noi"
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
    Write-Host "Tao thanh cong Don #$orderId1 (Status: $($order1.orderStatus), PaymentStatus: $($order1.paymentStatus))" -ForegroundColor Green

    Write-Host "`n[1.2] Admin duyet don #$orderId1 sang PROCESSING..." -ForegroundColor Cyan
    $approved1 = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId1/approve" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "Duyet thanh cong: Status = $($approved1.orderStatus)" -ForegroundColor Green

    Write-Host "`n[1.3] Admin phan cong don #$orderId1 cho Shipper 1..." -ForegroundColor Cyan
    $assign1Body = @{
        shipperId = $s1Id
        note = "Giao buoi chieu truoc 17h"
    } | ConvertTo-Json
    $assigned1 = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId1/assign-shipper" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $assign1Body
    Write-Host "Phan cong thanh cong: Status = $($assigned1.orderStatus), Shipper = $($assigned1.shipperName)" -ForegroundColor Green

    Write-Host "`n[1.4] Test ngoai le E1 / Quy tac BR-08: Shipper 2 co tinh bam giao don cua Shipper 1..." -ForegroundColor Cyan
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId1/complete" -Method Post -Headers @{ Authorization = "Bearer $s2Token" }
        Write-Host "FAIL: Khong chan duoc Shipper 2!" -ForegroundColor Red
    } catch {
        Write-Host "PASS: He thong da chan Shipper 2 theo dung quy tac BR-08!" -ForegroundColor Green
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host "Thong bao loi: " $reader.ReadToEnd() -ForegroundColor Yellow
        }
    }

    Write-Host "`n[1.5] Shipper 1 xac nhan Giao hang thanh cong don #$orderId1..." -ForegroundColor Cyan
    $completed1 = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId1/complete" -Method Post -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "XAC NHAN GIAO THANH CONG HOAN TAT!" -ForegroundColor Green
    Write-Host " - Order ID: $($completed1.orderId)"
    Write-Host " - Order Status: $($completed1.orderStatus) (Ky vong: COMPLETED)" -ForegroundColor Yellow
    Write-Host " - Payment Status: $($completed1.paymentStatus) (Ky vong: PAID - Tu dong quyet toan COD theo BR-09)" -ForegroundColor Yellow
    Write-Host " - Completed At: $($completed1.completedAt) (Ky vong: Co thoi gian)" -ForegroundColor Yellow

    Write-Host "`n[1.6] Kiem tra qua chuong thong bao cua Shipper 1..." -ForegroundColor Cyan
    $s1Notifs = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/notifications" -Method Get -Headers @{ Authorization = "Bearer $s1Token" }
    if ($s1Notifs.Count -gt 0) {
        Write-Host " - Thong bao moi nhat: $($s1Notifs[0].title) | $($s1Notifs[0].message)" -ForegroundColor Yellow
    }

    # ---------------------------------------------------------
    # KỊCH BẢN 2: BÁO CÁO GIAO THẤT BẠI (ALTERNATIVE FLOW, BR-04, POST-2)
    # ---------------------------------------------------------
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> KICH BAN 2: GIAO THAT BAI & HOAN KHO (ALT FLOW) <<<" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta

    Write-Host "`n[2.1] Tao don hang thu 2..." -ForegroundColor Cyan
    $order2Body = @{
        recipientName = "Tran Thi Thu"
        recipientPhone = "0988776655"
        deliveryAddress = "So 45 Nguyen Trai, Quan Thanh Xuan, Ha Noi"
        paymentMethod = "COD"
        items = @(
            @{
                wineId = 1
                quantity = 2
            }
        )
    } | ConvertTo-Json -Depth 4
    $order2 = Invoke-RestMethod -Uri "http://localhost:8080/api/orders/place-order" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $order2Body
    $orderId2 = $order2.orderId
    Write-Host "Tao thanh cong Don #$orderId2 (Status: $($order2.orderStatus))" -ForegroundColor Green

    Write-Host "`n[2.2] Admin duyet don #$orderId2 sang PROCESSING..." -ForegroundColor Cyan
    $approved2 = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId2/approve" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }

    Write-Host "`n[2.3] Admin phan cong don #$orderId2 cho Shipper 2..." -ForegroundColor Cyan
    $assign2Body = @{
        shipperId = $s2Id
        note = "Don giao gio hanh chinh"
    } | ConvertTo-Json
    $assigned2 = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId2/assign-shipper" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $assign2Body
    Write-Host "Phan cong cho Shipper 2 OK: Status = $($assigned2.orderStatus), Shipper = $($assigned2.shipperName)" -ForegroundColor Green

    Write-Host "`n[2.4] Test ngoai le E2: Shipper 2 bao giao that bai nhung bo trong ly do..." -ForegroundColor Cyan
    try {
        $emptyReasonBody = @{ reason = "" } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId2/fail" -Method Post -Headers @{ Authorization = "Bearer $s2Token" } -ContentType "application/json" -Body $emptyReasonBody
        Write-Host "FAIL: Khong chan duoc ly do trong!" -ForegroundColor Red
    } catch {
        Write-Host "PASS: He thong da bat loi bo trong ly do theo dung ngoai le E2!" -ForegroundColor Green
    }

    Write-Host "`n[2.5] Shipper 2 bao giao that bai kem ly do cu the..." -ForegroundColor Cyan
    $failBody = @{
        reason = "Goi dien 3 lan khong bat may, den tan dia chi thay cua khoa ngoai khong co nguoi"
    } | ConvertTo-Json
    $failed2 = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId2/fail" -Method Post -Headers @{ Authorization = "Bearer $s2Token" } -ContentType "application/json" -Body $failBody
    Write-Host "BAO GIAO THAT BAI THANH CONG!" -ForegroundColor Green
    Write-Host " - Order ID: $($failed2.orderId)"
    Write-Host " - Order Status: $($failed2.orderStatus) (Ky vong: CANCELLED theo BR-04)" -ForegroundColor Yellow
    Write-Host " - Cancellation Reason: $($failed2.cancellationReason)" -ForegroundColor Yellow
    Write-Host " - Cancel Status: $($failed2.cancelStatus) (Ky vong: APPROVED)" -ForegroundColor Yellow

    Write-Host "`n[2.6] Kiem tra qua chuong thong bao cua Shipper 2..." -ForegroundColor Cyan
    $s2Notifs = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/notifications" -Method Get -Headers @{ Authorization = "Bearer $s2Token" }
    if ($s2Notifs.Count -gt 0) {
        Write-Host " - Thong bao moi nhat: $($s2Notifs[0].title) | $($s2Notifs[0].message)" -ForegroundColor Yellow
    }

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host ">>> TAT CA CAC KICH BAN UC_2.3.2 DA TEST HOAN TAT 100%! <<<" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green

} catch {
    Write-Host "`n[ERROR]: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response Body: " $reader.ReadToEnd() -ForegroundColor Red
    }
}
