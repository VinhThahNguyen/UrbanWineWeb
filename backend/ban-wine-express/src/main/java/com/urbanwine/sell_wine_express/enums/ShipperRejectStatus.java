package com.urbanwine.sell_wine_express.enums;

public enum ShipperRejectStatus {
    NONE,        // Bình thường, không có yêu cầu từ chối
    REQUESTED,   // Shipper đang gửi yêu cầu từ chối nhận đơn, chờ Admin duyệt
    APPROVED,    // Admin đã chấp thuận cho shipper từ chối (đơn rút lại về PROCESSING)
    REJECTED     // Admin từ chối yêu cầu, shipper phải tiếp tục giao đơn
}
