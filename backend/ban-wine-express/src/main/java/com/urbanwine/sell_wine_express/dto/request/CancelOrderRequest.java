package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelOrderRequest {

    @NotBlank(message = "Vui lòng nhập lý do hủy đơn hàng")
    @Size(max = 500, message = "Lý do hủy đơn không được vượt quá 500 ký tự")
    private String reason;
}
