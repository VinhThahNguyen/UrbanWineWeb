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
public class CartResponse {
    private Long cartId;
    private List<CartItemResponse> items;
    private Integer totalItems;      // Tổng số sản phẩm trong giỏ
    private BigDecimal cartSubtotal; // Tổng tiền các món (sum of unit_price * quantity)
}
