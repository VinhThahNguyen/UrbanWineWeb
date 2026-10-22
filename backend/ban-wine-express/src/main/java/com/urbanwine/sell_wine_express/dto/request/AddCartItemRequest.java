package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddCartItemRequest {

    @NotNull(message = "ID của rượu không được để trống")
    private Long wineId;

    @NotNull(message = "Số lượng không được để trống")
    private Integer quantity;
}
