package com.urbanwine.sell_wine_express.dto.respone;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryResponse {
    private Integer categoryId;
    private String categoryName;
    private String description;
}
