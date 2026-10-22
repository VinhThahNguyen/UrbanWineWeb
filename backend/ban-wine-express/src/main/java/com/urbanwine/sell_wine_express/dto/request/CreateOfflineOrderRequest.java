package com.urbanwine.sell_wine_express.dto.request;

import com.urbanwine.sell_wine_express.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO yêu cầu tạo đơn hàng bán lẻ tại quầy (UC_2.1.5 Create Offline Order).
 * Áp dụng cho khách vãng lai (không bắt buộc tài khoản người dùng, số điện thoại, địa chỉ nhận hàng).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOfflineOrderRequest {

    @NotEmpty(message = "Danh sách sản phẩm mua tại quầy không được để trống")
    @Valid
    private List<OrderItemRequest> items;

    @NotNull(message = "Phương thức thanh toán không được để trống (CASH hoặc VIETQR)")
    private PaymentMethod paymentMethod;

    /**
     * Số tiền mặt khách đưa (chỉ dùng khi thanh toán CASH).
     * Hệ thống sẽ kiểm tra amountTendered >= grandTotal và tính ra tiền thối lại cho khách.
     */
    private BigDecimal amountTendered;

    /**
     * Ghi chú tùy chọn của nhân viên thu ngân tại quầy
     */
    private String note;
}
