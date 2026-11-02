package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutSummaryRequest {

    private String deliveryAddress;

    @NotEmpty(message = "Product items list cannot be empty")
    @Valid
    private List<OrderItemRequest> items;
}
