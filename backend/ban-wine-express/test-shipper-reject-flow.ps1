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

    Write-Host "`n=== 4. Admin checks available Shippers ===" -ForegroundColor Cyan
    $shippers = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/shippers/available" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "Available Shippers count: $($shippers.Count)" -ForegroundColor Yellow
    foreach ($s in $shippers) {
        Write-Host " - Shipper: $($s.fullName) (ID: $($s.userId)), active: $($s.currentActiveOrders)/$($s.maxOrders)"
    }

    Write-Host "`n=== 5. Find or create an Order to Assign ===" -ForegroundColor Cyan
    $allOrders = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders?page=0&size=10" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "Total orders in system: $($allOrders.totalElements)" -ForegroundColor Yellow
    
    $order = $null
    if ($allOrders.content.Count -gt 0) {
        $order = $allOrders.content[0]
    } else {
        Write-Host "Creating a test online COD order..." -ForegroundColor Cyan
        $placeOrderBody = @{
            recipientName = "Khach Hang VIP"
            recipientPhone = "0987654321"
            deliveryAddress = "So 12 Trang Tien, Hoan Kiem, Ha Noi"
            paymentMethod = "COD"
            items = @(
                @{
                    wineId = 1
                    quantity = 1
                }
            )
        } | ConvertTo-Json -Depth 4
        $order = Invoke-RestMethod -Uri "http://localhost:8080/api/orders/place-order" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $placeOrderBody
        Write-Host "Placed new Order ID: $($order.orderId), status: $($order.orderStatus)" -ForegroundColor Green
    }

    $orderId = $order.orderId
    Write-Host "Working with Order ID: $orderId, status: $($order.orderStatus)" -ForegroundColor Yellow

    # If PENDING, approve it to PROCESSING
    if ($order.orderStatus -eq "PENDING") {
        Write-Host "Order is PENDING -> Admin approves order..." -ForegroundColor Cyan
        $approvedOrder = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId/approve" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }
        Write-Host "Approved order to: $($approvedOrder.orderStatus)" -ForegroundColor Green
        $order = $approvedOrder
    }

    # Ensure assigned to Shipper 1
    if ($order.orderStatus -eq "PROCESSING") {
        Write-Host "Admin assigns order $orderId to Shipper 1..." -ForegroundColor Cyan
        $assignBody = @{
            shipperId = $s1Id
            note = "Don giao gap trong 2h"
        } | ConvertTo-Json
        $order = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId/assign-shipper" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $assignBody
        Write-Host "Assigned to Shipper 1 OK! Status: $($order.orderStatus), Shipper: $($order.shipperName)" -ForegroundColor Green
    } elseif ($order.orderStatus -eq "SHIPPING" -and $order.shipperId -ne $s1Id) {
        Write-Host "Reassigning order $orderId to Shipper 1..." -ForegroundColor Cyan
        $reassignBody = @{
            shipperId = $s1Id
            note = "Dieu phoi lai sang Shipper 1"
        } | ConvertTo-Json
        $order = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId/reassign-shipper" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $reassignBody
        Write-Host "Reassigned to Shipper 1 OK! Status: $($order.orderStatus), Shipper: $($order.shipperName)" -ForegroundColor Green
    } else {
        Write-Host "Order $orderId is already in SHIPPING assigned to Shipper 1." -ForegroundColor Green
    }

    Write-Host "`n=== 6. Shipper 1 requests reject (Su co thung lop xe) ===" -ForegroundColor Cyan
    $rejectReqBody = @{
        reason = "Xe bi thung lop va dut xich tai nga 4 CMT8, khong the di chuyen tiep duoc"
    } | ConvertTo-Json
    $rejectReqRes = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId/request-reject" -Method Post -Headers @{ Authorization = "Bearer $s1Token" } -ContentType "application/json" -Body $rejectReqBody
    Write-Host "Request Reject OK!" -ForegroundColor Green
    Write-Host " - Order ID: $($rejectReqRes.orderId)"
    Write-Host " - ShipperRejectStatus: $($rejectReqRes.shipperRejectStatus)" -ForegroundColor Yellow
    Write-Host " - ShipperRejectReason: $($rejectReqRes.shipperRejectReason)"
    Write-Host " - ShipperRejectRequestedAt: $($rejectReqRes.shipperRejectRequestedAt)"

    Write-Host "`n=== 7. Admin views pending reject requests ===" -ForegroundColor Cyan
    $pendingRes = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/shipper-reject-requests" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
    Write-Host "Pending reject requests count: $($pendingRes.Count)" -ForegroundColor Yellow
    foreach ($p in $pendingRes) {
        Write-Host " - Order ID: $($p.orderId), Shipper: $($p.shipperName), Reason: $($p.shipperRejectReason)"
    }

    Write-Host "`n=== 8. Admin reviews reject: CASE 2 (Admin tu choi yeu cau - approved = false) ===" -ForegroundColor Cyan
    $reviewTh2Body = @{
        approved = $false
        adminNote = "Tiem sua xe ngay dau hem 20m, shipper khac phuc nhanh de kip giao khach dang doi"
    } | ConvertTo-Json
    $reviewTh2Res = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId/review-shipper-reject" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $reviewTh2Body
    Write-Host "Review Case 2 OK!" -ForegroundColor Green
    Write-Host " - OrderStatus: $($reviewTh2Res.orderStatus) (Van giu SHIPPING)" -ForegroundColor Yellow
    Write-Host " - ShipperName: $($reviewTh2Res.shipperName) (Van giu Shipper 1)" -ForegroundColor Yellow
    Write-Host " - ShipperRejectStatus: $($reviewTh2Res.shipperRejectStatus) (Da thanh REJECTED)" -ForegroundColor Yellow

    Write-Host "`n=== 9. Shipper 1 checks notifications after Case 2 ===" -ForegroundColor Cyan
    $s1Notifs = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/notifications" -Method Get -Headers @{ Authorization = "Bearer $s1Token" }
    Write-Host "Latest notification for Shipper 1:" -ForegroundColor Yellow
    if ($s1Notifs.Count -gt 0) {
        $latest = $s1Notifs[0]
        Write-Host " - Title: $($latest.title)"
        Write-Host " - Message: $($latest.message)"
    }

    Write-Host "`n=== 10. Shipper 1 requests reject again (Xe bi hong nang hon du kien) ===" -ForegroundColor Cyan
    $rejectReq2Body = @{
        reason = "Tiem sua xe thong bao gay cang xe, phai de xe lai tiem den chieu, xin phep ban giao don"
    } | ConvertTo-Json
    $rejectReq2Res = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/orders/$orderId/request-reject" -Method Post -Headers @{ Authorization = "Bearer $s1Token" } -ContentType "application/json" -Body $rejectReq2Body
    Write-Host "Request Reject #2 OK! Status: $($rejectReq2Res.shipperRejectStatus)" -ForegroundColor Green

    Write-Host "`n=== 11. Admin reviews reject: CASE 1 (Admin dong y rut don - approved = true) ===" -ForegroundColor Cyan
    $reviewTh1Body = @{
        approved = $true
        adminNote = "Da xac nhan su co bat kha khang. Rut don de phan cong shipper khac"
    } | ConvertTo-Json
    $reviewTh1Res = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId/review-shipper-reject" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $reviewTh1Body
    Write-Host "Review Case 1 OK!" -ForegroundColor Green
    Write-Host " - OrderStatus: $($reviewTh1Res.orderStatus) (Da quay ve PROCESSING)" -ForegroundColor Yellow
    Write-Host " - Shipper: $($reviewTh1Res.shipperId) / $($reviewTh1Res.shipperName) (Da unassign - null)" -ForegroundColor Yellow
    Write-Host " - ShipperRejectStatus: $($reviewTh1Res.shipperRejectStatus) (Da thanh APPROVED)" -ForegroundColor Yellow

    Write-Host "`n=== 12. Shipper 1 checks notifications after Case 1 ===" -ForegroundColor Cyan
    $s1NotifsAfter = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/notifications" -Method Get -Headers @{ Authorization = "Bearer $s1Token" }
    if ($s1NotifsAfter.Count -gt 0) {
        $latest = $s1NotifsAfter[0]
        Write-Host " - Title: $($latest.title)"
        Write-Host " - Message: $($latest.message)"
    }

    Write-Host "`n=== 13. Admin reassigns order $orderId to Shipper 2 ===" -ForegroundColor Cyan
    $assignS2Body = @{
        shipperId = $s2Id
        note = "Nhan lai don chuyen giao tu Shipper 1 do hong xe"
    } | ConvertTo-Json
    $assignS2Res = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/orders/$orderId/assign-shipper" -Method Post -Headers @{ Authorization = "Bearer $adminToken" } -ContentType "application/json" -Body $assignS2Body
    Write-Host "Reassigned to Shipper 2 OK!" -ForegroundColor Green
    Write-Host " - OrderStatus: $($assignS2Res.orderStatus)"
    Write-Host " - Assigned Shipper: $($assignS2Res.shipperName) (ID: $($assignS2Res.shipperId))" -ForegroundColor Yellow

    Write-Host "`n=== 14. Shipper 2 checks notifications ===" -ForegroundColor Cyan
    $s2Notifs = Invoke-RestMethod -Uri "http://localhost:8080/api/shipper/notifications" -Method Get -Headers @{ Authorization = "Bearer $s2Token" }
    if ($s2Notifs.Count -gt 0) {
        $latest = $s2Notifs[0]
        Write-Host " - Title: $($latest.title)"
        Write-Host " - Message: $($latest.message)"
    }

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host ">>> TAT CA CAC BUOC TEST KICH BAN DA THANH CONG 100%! <<<" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green

} catch {
    Write-Host "`n[ERROR]: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response Body: " $reader.ReadToEnd() -ForegroundColor Red
    }
}
