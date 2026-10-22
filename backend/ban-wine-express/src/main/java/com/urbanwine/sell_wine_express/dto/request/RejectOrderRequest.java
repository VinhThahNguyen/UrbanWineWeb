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
public class RejectOrderRequest {

    @NotBlank(message = "Vui lòng nhập lý do từ chối đơn hàng")
    @Size(max = 500, message = "Lý do từ chối không được vượt quá 500 ký tự")
    private String reason;
}
