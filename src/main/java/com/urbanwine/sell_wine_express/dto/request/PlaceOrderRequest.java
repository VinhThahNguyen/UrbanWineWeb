package com.urbanwine.sell_wine_express.dto.request;

import com.urbanwine.sell_wine_express.enums.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceOrderRequest {

    @NotBlank(message = "Tên người nhận không được để trống")
    private String recipientName;

    @NotBlank(message = "Số điện thoại người nhận không được để trống")
    private String recipientPhone;

    @NotBlank(message = "Địa chỉ giao hàng không được để trống")
    private String deliveryAddress;

    @NotNull(message = "Phương thức thanh toán không được để trống")
    private PaymentMethod paymentMethod;

    @NotEmpty(message = "Danh sách sản phẩm không được để trống")
    @Valid
    private List<OrderItemRequest> items;
}

