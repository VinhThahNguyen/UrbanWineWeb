package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.CheckoutSummaryRequest;
import com.urbanwine.sell_wine_express.dto.request.PlaceOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.CheckoutSummaryResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.entity.User;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

public interface OrderService {

    CheckoutSummaryResponse calculateCheckoutSummary(User customer, CheckoutSummaryRequest request);

    OrderResponse placeOrder(User customer, PlaceOrderRequest request, HttpServletRequest servletRequest);

    List<OrderResponse> getCustomerOrders(User customer);

    OrderResponse getOrderDetail(User customer, Long orderId);

    PaymentStatusResponse getPaymentStatus(User customer, Long orderId);

    void cancelExpiredPendingOrders();
}
