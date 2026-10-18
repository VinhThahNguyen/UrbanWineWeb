package com.urbanwine.sell_wine_express.enums;

public enum PaymentMethod {
    COD,    // Cash On Delivery - Thanh toán khi nhận hàng (Online)
    VNPAY,  // Online Payment qua VNPay (hỗ trợ VietQR động & Thẻ ATM nội địa)
    CASH,   // Tiền mặt tại quầy (Offline POS)
    VIETQR  // Chuyển khoản VietQR động tại quầy (Offline POS)
}
