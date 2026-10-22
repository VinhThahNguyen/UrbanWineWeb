package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.request.CheckoutSummaryRequest;
import com.urbanwine.sell_wine_express.dto.request.PlaceOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.CheckoutSummaryResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * Bước 1: Xem trước tóm tắt đơn hàng (tính tiền hàng, VAT 10%, ship 30k, kiểm tra tồn kho & địa chỉ nội thành)
     */
    @PostMapping("/checkout-summary")
    public ResponseEntity<CheckoutSummaryResponse> getCheckoutSummary(
            @AuthenticationPrincipal User customer,
            @Valid @RequestBody CheckoutSummaryRequest request
    ) {
        CheckoutSummaryResponse summary = orderService.calculateCheckoutSummary(customer, request);
        return ResponseEntity.ok(summary);
    }

    /**
     * Bước 2: Xác nhận đặt hàng và chọn phương thức thanh toán (COD hoặc VNPAY)
     */
    @PostMapping("/place-order")
    public ResponseEntity<OrderResponse> placeOrder(
            @AuthenticationPrincipal User customer,
            @Valid @RequestBody PlaceOrderRequest request,
            HttpServletRequest servletRequest
    ) {
        OrderResponse response = orderService.placeOrder(customer, request, servletRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Kiểm tra trạng thái thanh toán của đơn hàng (dùng cho Frontend polling thời gian thực)
     */
    @GetMapping("/{orderId}/payment-status")
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            @AuthenticationPrincipal User customer,
            @PathVariable Long orderId
    ) {
        PaymentStatusResponse status = orderService.getPaymentStatus(customer, orderId);
        return ResponseEntity.ok(status);
    }

    /**
     * Lấy danh sách lịch sử đơn hàng của khách hàng
     */
    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderResponse>> getMyOrders(
            @AuthenticationPrincipal User customer
    ) {
        List<OrderResponse> orders = orderService.getCustomerOrders(customer);
        return ResponseEntity.ok(orders);
    }

    /**
     * Xem chi tiết một đơn hàng cụ thể
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrderDetail(
            @AuthenticationPrincipal User customer,
            @PathVariable Long orderId
    ) {
        OrderResponse response = orderService.getOrderDetail(customer, orderId);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.2.6: Hủy đơn hàng (PENDING) hoặc Gửi yêu cầu hủy đơn (PROCESSING)
     */
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            @AuthenticationPrincipal User customer,
            @PathVariable Long orderId,
            @Valid @RequestBody com.urbanwine.sell_wine_express.dto.request.CancelOrderRequest request
    ) {
        OrderResponse response = orderService.cancelOrder(customer, orderId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.2.6: Tiếp tục thanh toán cho đơn hàng chưa thanh toán (Resume Payment)
     */
    @PostMapping("/{orderId}/resume-payment")
    public ResponseEntity<OrderResponse> resumePayment(
            @AuthenticationPrincipal User customer,
            @PathVariable Long orderId,
            HttpServletRequest servletRequest
    ) {
        OrderResponse response = orderService.resumePayment(customer, orderId, servletRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Quản lý/Admin: Lấy danh sách các đơn hàng đang chờ duyệt hủy
     */
    @GetMapping("/admin/cancellations")
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<OrderResponse>> getPendingCancellations() {
        List<OrderResponse> responses = orderService.getPendingCancellationOrders();
        return ResponseEntity.ok(responses);
    }

    /**
     * Quản lý/Admin: Duyệt hoặc từ chối yêu cầu hủy đơn hàng
     */
    @PostMapping("/admin/{orderId}/review-cancellation")
    @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<OrderResponse> reviewCancellation(
            @PathVariable Long orderId,
            @RequestParam boolean approve,
            @RequestParam(required = false) String adminNote
    ) {
        OrderResponse response = orderService.reviewCancellationRequest(orderId, approve, adminNote);
        return ResponseEntity.ok(response);
    }
}
