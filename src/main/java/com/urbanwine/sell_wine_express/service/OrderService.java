package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.CancelOrderRequest;
import com.urbanwine.sell_wine_express.dto.request.CheckoutSummaryRequest;
import com.urbanwine.sell_wine_express.dto.request.PlaceOrderRequest;
import com.urbanwine.sell_wine_express.dto.request.RejectOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.CheckoutSummaryResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.CancelStatus;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

public interface OrderService {

    CheckoutSummaryResponse calculateCheckoutSummary(User customer, CheckoutSummaryRequest request);

    OrderResponse placeOrder(User customer, PlaceOrderRequest request, HttpServletRequest servletRequest);

    List<OrderResponse> getCustomerOrders(User customer);

    OrderResponse getOrderDetail(User customer, Long orderId);

    PaymentStatusResponse getPaymentStatus(User customer, Long orderId);

    void cancelExpiredPendingOrders();

    OrderResponse cancelOrder(User customer, Long orderId, CancelOrderRequest request);

    OrderResponse resumePayment(User customer, Long orderId, HttpServletRequest servletRequest);

    List<OrderResponse> getPendingCancellationOrders();

    OrderResponse reviewCancellationRequest(Long orderId, boolean approve, String adminNote);

    // UC_2.1.2 Process Order: Admin xem danh sách đơn hàng cần xử lý
    PageResponse<OrderResponse> getAdminOrders(OrderStatus status, CancelStatus cancelStatus, int page, int size);

    // UC_2.1.2 Process Order: Admin xem chi tiết toàn bộ thông tin đơn hàng
    OrderResponse getAdminOrderDetail(Long orderId);

    // UC_2.1.2 Process Order: Admin duyệt đơn PENDING -> PROCESSING (BR-07)
    OrderResponse approveOrder(Long orderId);

    // UC_2.1.2 Process Order: Admin từ chối đơn PENDING kèm lý do (E2, POST-2, POST-3)
    OrderResponse rejectOrder(Long orderId, RejectOrderRequest request);
}
