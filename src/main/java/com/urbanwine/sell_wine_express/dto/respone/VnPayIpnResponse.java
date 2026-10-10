package com.urbanwine.sell_wine_express.dto.respone;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnPayIpnResponse {

    @JsonProperty("RspCode")
    private String rspCode;

    @JsonProperty("Message")
    private String message;
}
