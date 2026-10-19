package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailDeliveryRequest {

    @NotBlank(message = "Lý do giao hàng thất bại không được để trống")
    private String reason;
}
