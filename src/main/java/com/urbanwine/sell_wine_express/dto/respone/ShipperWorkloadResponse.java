package com.urbanwine.sell_wine_express.dto.respone;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipperWorkloadResponse {
    private Long shipperId;
    private String fullName;
    private String email;
    private String phoneNumber;
    private long currentActiveOrders;
    private int maxOrders;
    private boolean canAssign;
    private Boolean isOnline;
}
