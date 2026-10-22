package com.urbanwine.sell_wine_express.dto.respone;

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
public class ShipperVietQrResponse {

    private Long orderId;
    private String orderCode;
    private BigDecimal amountToCollect;
    private String bankId;
    private String accountNo;
    private String accountName;
    private String transferMemo;
    private String qrCodeUrl;
    private PaymentStatus paymentStatus;
    private LocalDateTime expiresAt;
    private Long expiresInSeconds;
    private String message;
}
