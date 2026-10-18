package com.urbanwine.sell_wine_express.dto.respone;

import com.urbanwine.sell_wine_express.enums.OrderChannel;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.PaymentMethod;
import com.urbanwine.sell_wine_express.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO phản hồi cho đơn hàng bán lẻ tại quầy (UC_2.1.5 Create Offline Order).
 * Bao gồm đầy đủ thông tin thanh toán, tiền thừa, mã VietQR (nếu thanh toán ngân hàng)
 * và dữ liệu hóa đơn bán lẻ (receiptContent) để in ngay cho khách.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfflineOrderResponse {

    private Long orderId;
    private String orderCode;
    private OrderChannel channelType;
    private OrderStatus orderStatus;
    private PaymentStatus paymentStatus;
    private PaymentMethod paymentMethod;

    private BigDecimal merchandiseSubtotal;
    private BigDecimal vatAmount;
    private BigDecimal shippingFee; // Luôn = 0 đối với đơn bán tại quầy
    private BigDecimal totalAmount;

    // Thông tin tiền mặt (Normal flow)
    private BigDecimal amountTendered;
    private BigDecimal changeAmount;

    // Thông tin chuyển khoản VietQR (Alternative flow)
    private String qrCodeUrl;
    private Integer qrExpiresInSeconds; // Mặc định 300 giây (5 phút)

    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;

    // Nội dung hóa đơn bán lẻ định dạng sẵn để in máy in nhiệt/kẹp vào túi rượu
    private String receiptContent;
}
