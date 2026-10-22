package com.urbanwine.sell_wine_express.dto.respone;

import lombok.*;

import java.math.BigDecimal;

/**
 * DTO hiển thị chi tiết sản phẩm rượu cho Admin quản trị (UC_2.1.1).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WineAdminResponse {
    private Long wineId;
    private String wineName;
    private String wineryName;
    private Integer categoryId;
    private String categoryName;
    private String origin;
    private String grapeVariety;
    private Integer vintageYear;
    private String description;
    private BigDecimal price;
    private Double abv;
    private Integer stockQuantity;
    private String imageUrl;
    private Boolean isActive;
    private boolean isOutOfStock;
}
