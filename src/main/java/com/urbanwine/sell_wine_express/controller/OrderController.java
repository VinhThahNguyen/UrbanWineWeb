package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.request.CheckoutSummaryRequest;
import com.urbanwine.sell_wine_express.dto.request.PlaceOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.CheckoutSummaryResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.service.OrderService;
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
     * Bước 2: Xác nhận đặt hàng (Tạo đơn PENDING, UNPAID, tạm giữ trừ kho)
     */
    @PostMapping("/place-order")
    public ResponseEntity<OrderResponse> placeOrder(
            @AuthenticationPrincipal User customer,
            @Valid @RequestBody PlaceOrderRequest request
    ) {
        OrderResponse response = orderService.placeOrder(customer, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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
}
