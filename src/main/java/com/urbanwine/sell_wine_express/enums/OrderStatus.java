package com.urbanwine.sell_wine_express.enums;

public enum OrderStatus {
    PENDING,      // Order created, waiting for approval
    PROCESSING,   // Order approved, packing items
    SHIPPING,     // Order assigned to shipper, delivering
    COMPLETED,    // Order successfully delivered
    CANCELLED     // Order cancelled
}