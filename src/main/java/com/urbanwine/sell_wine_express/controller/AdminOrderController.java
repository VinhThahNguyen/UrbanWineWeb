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
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminOrderController {

    private final OrderService orderService;

    /**
     * UC_2.1.2 Normal Flow - Bước 1 & 2:
     * Xem danh sách các đơn hàng cần xử lý trong hệ thống.
     * Mặc định hiển thị các đơn PENDING hoặc đơn PROCESSING có yêu cầu hủy (CancelStatus = REQUESTED).
     * Hỗ trợ lọc theo trạng thái đơn hàng (status) hoặc trạng thái yêu cầu hủy (cancelStatus) và phân trang.
     */
    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getAdminOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) CancelStatus cancelStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<OrderResponse> response = orderService.getAdminOrders(status, cancelStatus, page, size);
        return ResponseEntity.ok(response);
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
}
