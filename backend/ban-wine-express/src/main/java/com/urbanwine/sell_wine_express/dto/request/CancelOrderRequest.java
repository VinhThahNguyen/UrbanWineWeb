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

    @NotBlank(message = "Please provide a reason for cancellation")
    @Size(max = 500, message = "Cancellation reason cannot exceed 500 characters")
    private String reason;
}
