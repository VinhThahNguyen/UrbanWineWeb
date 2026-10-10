package com.urbanwine.sell_wine_express.dto.respone;

import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.PaymentMethod;
import com.urbanwine.sell_wine_express.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatusResponse {
    private Long orderId;
    private BigDecimal totalAmount;
    private OrderStatus orderStatus;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private String bankReceiptCode;
    private Boolean isPaid;
    private LocalDateTime createdAt;
}
