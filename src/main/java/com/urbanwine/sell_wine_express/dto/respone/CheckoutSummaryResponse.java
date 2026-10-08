package com.urbanwine.sell_wine_express.dto.respone;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutSummaryResponse {
    private String deliveryAddress;
    private boolean isInnerCitySupported;
    private List<OrderItemResponse> items;
    private BigDecimal merchandiseSubtotal; // Tiền hàng (chưa VAT)
    private BigDecimal vatAmount;            // Thuế VAT (10%)
    private BigDecimal shippingFee;          // Phí ship (30.000 VNĐ)
    private BigDecimal totalAmount;          // Tổng tiền thanh toán
}
