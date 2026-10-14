package com.urbanwine.sell_wine_express.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewCancellationRequest {

    @NotNull(message = "Vui lòng chỉ định chấp thuận (true) hoặc từ chối (false)")
    private Boolean approve;

    @Size(max = 500, message = "Ghi chú của quản lý không được vượt quá 500 ký tự")
    private String adminNote;
}
