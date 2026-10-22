package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignShipperRequest {

    @NotNull(message = "Mã nhân viên giao hàng (shipperId) không được để trống")
    private Long shipperId;

    private String note;
}
