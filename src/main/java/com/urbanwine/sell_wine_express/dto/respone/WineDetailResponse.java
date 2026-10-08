package com.urbanwine.sell_wine_express.dto.respone;

import lombok.*;
import java.math.BigDecimal;

/**
 * DTO for Wine Detail (Step 6 in UC 2.2.1).
 * Includes origin, grape variety, vintage year, abv, description, stock quantity, and isOutOfStock flag.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WineDetailResponse {
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
    private String imageUrl;
    private Integer stockQuantity;
    private boolean isOutOfStock; // Exception E2
}
