package com.urbanwine.sell_wine_express.dto.respone;

import com.urbanwine.sell_wine_express.enums.CancelStatus;
import com.urbanwine.sell_wine_express.enums.OrderChannel;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.PaymentMethod;
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
    private String orderCode;
    private OrderChannel channelType;
    private String recipientName;
    private String recipientPhone;
    private String deliveryAddress;
    private BigDecimal merchandiseSubtotal;
    private BigDecimal vatAmount;
    private BigDecimal shippingFee;
    private BigDecimal totalAmount;
    private OrderStatus orderStatus;
    private CancelStatus cancelStatus;
    private String cancellationReason;
    private LocalDateTime cancelRequestedAt;
    private LocalDateTime approvedAt;
    private String adminNote;
    private Long shipperId;
    private String shipperName;
    private String shipperPhone;
    private LocalDateTime assignedAt;
    private PaymentStatus paymentStatus;
    private PaymentMethod paymentMethod;
    private String paymentUrl;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;
}
