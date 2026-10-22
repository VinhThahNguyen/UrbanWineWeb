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
public class ReviewShipperRejectRequest {

    @NotNull(message = "Vui lòng chọn chấp thuận (true) hoặc từ chối (false)")
    private Boolean approved;

    private String adminNote;
}
