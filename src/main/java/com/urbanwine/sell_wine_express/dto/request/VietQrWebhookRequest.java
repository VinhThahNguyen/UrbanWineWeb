package com.urbanwine.sell_wine_express.dto.request;

import lombok.*;

import java.math.BigDecimal;

/**
 * DTO nhận thông báo thanh toán (Webhook IPN) từ Cổng thanh toán / PayOS / VietQR Bot
 * khi khách hàng hoàn tất chuyển khoản ngân hàng tại quầy.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VietQrWebhookRequest {

    // ID đơn hàng
    private Long orderId;

    // Mã đơn hàng (VD: "WINE123" hoặc "OFFLINE_123")
    private String orderCode;

    // Số tiền đã chuyển khoản
    private BigDecimal amount;

    // Mã giao dịch ngân hàng / Mã tham chiếu
    private String referenceCode;

    // Nội dung chuyển khoản
    private String description;
}
