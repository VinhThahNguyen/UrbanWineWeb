package com.urbanwine.sell_wine_express.dto.respone;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponse {
    private Long cartItemId;
    private Long wineId;
    private String wineName;
    private String imageUrl;
    private BigDecimal price;
    private Integer quantity;
    private Integer stockQuantity;
    private BigDecimal itemSubtotal; // price * quantity
}
