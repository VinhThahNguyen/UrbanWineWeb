package com.urbanwine.sell_wine_express.dto.respone;

import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long orderId;
    private String recipientName;
    private String recipientPhone;
    private String deliveryAddress;
    private BigDecimal merchandiseSubtotal;
    private BigDecimal vatAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private OrderStatus orderStatus;
    private PaymentStatus paymentStatus;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;
}
