package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.request.RejectOrderRequest;
import com.urbanwine.sell_wine_express.dto.request.ReviewCancellationRequest;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.enums.CancelStatus;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller dành riêng cho Quản lý / Store Manager xử lý đơn hàng (UC_2.1.2 Process Order).
 * Yêu cầu quyền: ROLE_ADMIN (PRE-1, BR-04, BR-07).
 */
@RestController
@RequestMapping("/api/admin/orders")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    /**
     * UC_2.1.2 Normal Flow - Bước 1 & 2:
     * Xem danh sách các đơn hàng cần xử lý trong hệ thống.
     * Mặc định hiển thị các đơn PENDING hoặc đơn PROCESSING có yêu cầu hủy (CancelStatus = REQUESTED).
     * Hỗ trợ lọc theo trạng thái đơn hàng (status) hoặc trạng thái yêu cầu hủy (cancelStatus), all (lấy tất cả) và phân trang.
     */
    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getAdminOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) CancelStatus cancelStatus,
            @RequestParam(required = false, defaultValue = "false") boolean all,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<OrderResponse> response = orderService.getAdminOrders(status, cancelStatus, all, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy tổng số lượng đơn hàng theo từng trạng thái (ALL, PENDING, PROCESSING, SHIPPING, COMPLETED, CANCELLED)
     */
    @GetMapping("/counts")
    public ResponseEntity<java.util.Map<String, Long>> getOrderCounts() {
        return ResponseEntity.ok(orderService.getOrderCounts());
    }

    /**
     * UC_2.1.2 Normal Flow - Bước 3 & 4:
     * Xem chi tiết toàn bộ thông tin một đơn hàng: danh sách rượu, số lượng, đơn giá,
     * tiền hàng, thuế VAT, phí ship, thông tin người nhận, địa chỉ giao hàng, phương thức thanh toán.
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getAdminOrderDetail(@PathVariable("orderId") Long orderId) {
        OrderResponse response = orderService.getAdminOrderDetail(orderId);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.2 Normal Flow - Bước 5 & 6:
     * Quản lý phê duyệt đơn hàng PENDING chuyển sang PROCESSING để chuẩn bị đóng gói và gán shipper.
     * Kiểm tra điều kiện thanh toán BR-07 (nếu là VNPay thì phải đã thanh toán thành công).
     * Ghi nhận approvedAt và gửi email thông báo xác nhận cho khách hàng.
     */
    @PostMapping("/{orderId}/approve")
    public ResponseEntity<OrderResponse> approveOrder(@PathVariable("orderId") Long orderId) {
        OrderResponse response = orderService.approveOrder(orderId);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.2 Alternative Flow 1:
     * Quản lý từ chối đơn hàng PENDING khi không thể đáp ứng (không liên hệ được khách, sai địa chỉ, lỗi vận hành).
     * Bắt buộc có lý do từ chối (Ngoại lệ E2).
     * Chuyển trạng thái sang CANCELLED, tự động hoàn trả số lượng vào tồn kho (POST-2),
     * kích hoạt quy trình hoàn tiền nếu đã thanh toán (POST-3), và gửi email lý do cho khách hàng.
     */
    @PostMapping("/{orderId}/reject")
    public ResponseEntity<OrderResponse> rejectOrder(
            @PathVariable("orderId") Long orderId,
            @Valid @RequestBody RejectOrderRequest request
    ) {
        OrderResponse response = orderService.rejectOrder(orderId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.2 Alternative Flow 2:
     * Quản lý xét duyệt yêu cầu hủy đơn hàng PROCESSING do khách hàng gửi lên (BR-04).
     * - 3a: Chấp thuận hủy (approve = true) -> Chuyển sang CANCELLED, hoàn tồn kho (POST-2), hoàn tiền nếu có (POST-3), gửi email.
     * - 3b: Từ chối hủy (approve = false) -> Giữ nguyên PROCESSING để tiếp tục giao hàng, gửi email lý do từ chối.
     */
    @PostMapping("/{orderId}/review-cancellation")
    public ResponseEntity<OrderResponse> reviewCancellation(
            @PathVariable("orderId") Long orderId,
            @Valid @RequestBody ReviewCancellationRequest request
    ) {
        OrderResponse response = orderService.reviewCancellationRequest(orderId, request.getApprove(), request.getAdminNote());
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // UC_2.1.5: CREATE OFFLINE ORDER (BÁN LẺ TẠI QUẦY)
    // =========================================================================

    /**
     * UC_2.1.5 Normal & Alternative Flow:
     * Nhân viên tạo đơn hàng bán lẻ tại quầy cho khách vãng lai.
     * - CASH: Thu tiền mặt, tính tiền thừa, trừ kho ngay lập tức, chuyển COMPLETED/PAID, trả về hóa đơn.
     * - VIETQR: Sinh mã VietQR động kèm số tiền và mã đơn, tạm giữ kho trong 5 phút.
     */
    @PostMapping("/offline")
    public ResponseEntity<com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse> createOfflineOrder(
            @Valid @RequestBody com.urbanwine.sell_wine_express.dto.request.CreateOfflineOrderRequest request
    ) {
        com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse response = orderService.createOfflineOrder(request);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.5 Exceptions E3 & E4:
     * Hủy nhanh đơn hàng offline PENDING tại quầy (khách hủy/đổi ý/không chuyển khoản được).
     * Hệ thống hoàn trả ngay lập tức toàn bộ số lượng rượu vào kho (0 giây).
     */
    @PostMapping("/offline/{orderId}/cancel")
    public ResponseEntity<com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse> cancelOfflineOrder(
            @PathVariable("orderId") Long orderId
    ) {
        com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse response = orderService.cancelOfflineOrder(orderId);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.5 Alternative Flow:
     * Xem chi tiết / Polling kiểm tra trạng thái đơn hàng offline (dùng để màn hình POS kiểm tra xem khách đã quét QR thành công chưa).
     */
    @GetMapping("/offline/{orderId}")
    public ResponseEntity<com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse> getOfflineOrderDetail(
            @PathVariable("orderId") Long orderId
    ) {
        com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse response = orderService.getOfflineOrderDetail(orderId);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // UC_2.1.4: ASSIGN ORDER TO SHIPPER (ĐIỀU PHỐI ĐƠN HÀNG CHO SHIPPER)
    // =========================================================================

    /**
     * UC_2.1.4 Normal Flow - Bước 2 & Ngoại lệ E1:
     * Quản lý xem danh sách các nhân viên giao hàng đang trong ca trực (Online)
     * kèm số lượng đơn đang giao hiện tại để lựa chọn phân công.
     */
    @GetMapping({"/shippers/available", "/available-shippers"})
    public ResponseEntity<java.util.List<com.urbanwine.sell_wine_express.dto.respone.ShipperWorkloadResponse>> getAvailableShippers() {
        java.util.List<com.urbanwine.sell_wine_express.dto.respone.ShipperWorkloadResponse> response = orderService.getAvailableShippers();
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.4 Normal Flow - Bước 3, 4, 5:
     * Quản lý gán đơn hàng PROCESSING cho shipper đã chọn.
     * Chuyển trạng thái sang SHIPPING và gửi thông báo tới shipper (POST-1, POST-2, POST-3).
     * Chặn nếu shipper đã đạt tối đa 5 đơn (Ngoại lệ E2).
     */
    @PostMapping("/{orderId}/assign-shipper")
    public ResponseEntity<OrderResponse> assignShipper(
            @PathVariable("orderId") Long orderId,
            @Valid @RequestBody com.urbanwine.sell_wine_express.dto.request.AssignShipperRequest request
    ) {
        OrderResponse response = orderService.assignShipper(orderId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.4 Alternative Flow:
     * Quản lý điều phối lại đơn hàng sang một shipper khác khi cần thiết (đổi người, sự cố).
     * Gửi thông báo thu hồi cho shipper cũ và thông báo mới cho shipper thay thế.
     */
    @PostMapping("/{orderId}/reassign-shipper")
    public ResponseEntity<OrderResponse> reassignShipper(
            @PathVariable("orderId") Long orderId,
            @Valid @RequestBody com.urbanwine.sell_wine_express.dto.request.AssignShipperRequest request
    ) {
        OrderResponse response = orderService.reassignShipper(orderId, request);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // SHIPPER REJECT DELIVERY REVIEW (ADMIN XÉT DUYỆT YÊU CẦU TỪ CHỐI TỪ SHIPPER)
    // =========================================================================

    /**
     * Admin xem danh sách các đơn hàng có shipper gửi yêu cầu xin từ chối giao để xử lý điều phối.
     */
    @GetMapping("/shipper-reject-requests")
    public ResponseEntity<java.util.List<OrderResponse>> getPendingShipperRejectOrders() {
        java.util.List<OrderResponse> response = orderService.getPendingShipperRejectOrders();
        return ResponseEntity.ok(response);
    }

    /**
     * Admin xét duyệt yêu cầu từ chối nhận đơn của Shipper:
     * - approved = true (Đồng ý): Rút đơn khỏi shipper cũ, đưa về PROCESSING sẵn sàng gán shipper khác.
     * - approved = false (Từ chối): Bắt shipper cũ tiếp tục đi giao đơn.
     */
    @PostMapping("/{orderId}/review-shipper-reject")
    public ResponseEntity<OrderResponse> reviewShipperReject(
            @PathVariable("orderId") Long orderId,
            @Valid @RequestBody com.urbanwine.sell_wine_express.dto.request.ReviewShipperRejectRequest request
    ) {
        OrderResponse response = orderService.reviewShipperRejectOrder(orderId, request);
        return ResponseEntity.ok(response);
    }
}
