package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.respone.NotificationResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.service.NotificationService;
import com.urbanwine.sell_wine_express.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller dành riêng cho Nhân viên giao hàng (ROLE_SHIPPER).
 * Triển khai các tính năng xem đơn hàng được gán (BR-08) và xem thông báo (Quả chuông thông báo).
 */
@RestController
@RequestMapping("/api/shipper")
@PreAuthorize("hasAuthority('ROLE_SHIPPER')")
@RequiredArgsConstructor
public class ShipperController {

    private final OrderService orderService;
    private final NotificationService notificationService;

    /**
     * Quy tắc BR-08 (Shipper Order Access):
     * Shipper xem danh sách các đơn hàng được gán cho chính mình.
     */
    @GetMapping("/orders")
    public ResponseEntity<List<OrderResponse>> getMyOrders(@AuthenticationPrincipal User currentShipper) {
        List<OrderResponse> response = orderService.getShipperOrders(currentShipper);
        return ResponseEntity.ok(response);
    }

    /**
     * Quy tắc BR-08 (Shipper Order Access):
     * Shipper xem chi tiết một đơn hàng được gán cho chính mình.
     */
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderResponse> getMyOrderDetail(
            @AuthenticationPrincipal User currentShipper,
            @PathVariable("orderId") Long orderId
    ) {
        OrderResponse response = orderService.getShipperOrderDetail(currentShipper, orderId);
        return ResponseEntity.ok(response);
    }

    /**
     * Tính năng Quả chuông thông báo (Notification Bell):
     * Shipper xem danh sách tất cả các thông báo của tài khoản (mới nhất lên đầu).
     */
    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(@AuthenticationPrincipal User currentShipper) {
        List<NotificationResponse> response = notificationService.getShipperNotifications(currentShipper);
        return ResponseEntity.ok(response);
    }

    /**
     * Tính năng Quả chuông thông báo:
     * Shipper đánh dấu một thông báo đã đọc khi nhấp vào xem.
     */
    @PatchMapping("/notifications/{notificationId}/read")
    public ResponseEntity<?> markNotificationAsRead(
            @AuthenticationPrincipal User currentShipper,
            @PathVariable("notificationId") Long notificationId
    ) {
        notificationService.markAsRead(currentShipper, notificationId);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu thông báo là đã đọc"));
    }
}
