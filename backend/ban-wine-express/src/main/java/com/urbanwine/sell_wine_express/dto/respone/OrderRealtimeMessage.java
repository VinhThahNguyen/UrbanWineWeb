package com.urbanwine.sell_wine_express.dto.respone;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRealtimeMessage {
    private String type; // ORDER_REJECTED, ORDER_APPROVED, ORDER_SHIPPING, ORDER_COMPLETED
    private Long orderId;
    private String orderCode;
    private String customerEmail;
    private String title;
    private String message;
    private String reason;
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
