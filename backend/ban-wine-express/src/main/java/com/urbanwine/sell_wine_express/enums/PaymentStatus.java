package com.urbanwine.sell_wine_express.enums;

public enum PaymentStatus {
    UNPAID,    // Payment pending
    PAID,      // Payment completed successfully
    FAILED,    // Payment failed or declined
    REFUNDED   // Money refunded to customer
}
