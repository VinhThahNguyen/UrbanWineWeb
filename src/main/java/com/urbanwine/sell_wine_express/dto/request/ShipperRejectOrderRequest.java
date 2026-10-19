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
public class ShipperRejectOrderRequest {

    @NotBlank(message = "Vui lòng nhập lý do từ chối nhận đơn hàng")
    private String reason;
}
