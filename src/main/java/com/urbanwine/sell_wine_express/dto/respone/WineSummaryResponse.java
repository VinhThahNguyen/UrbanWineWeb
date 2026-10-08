package com.urbanwine.sell_wine_express.dto.respone;

import lombok.*;
import java.math.BigDecimal;

/**
 * DTO for Wine Catalog item (Step 2 in UC 2.2.1).
 * Includes image, wine name, winery name, category name, unit price, abv, and stock availability flag.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WineSummaryResponse {
    private Long wineId;
    private String wineName;
    private String wineryName;
    private Integer categoryId;
    private String categoryName;
    private BigDecimal price;
    private Double abv;
    private String imageUrl;
    private boolean isOutOfStock; // Exception E2: Stock availability flag
}
