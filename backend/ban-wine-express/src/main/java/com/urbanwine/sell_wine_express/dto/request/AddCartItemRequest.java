package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddCartItemRequest {

    @NotNull(message = "Wine ID is required")
    private Long wineId;

    @NotNull(message = "Quantity is required")
    private Integer quantity;
}
