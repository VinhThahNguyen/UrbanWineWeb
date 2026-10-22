package com.urbanwine.sell_wine_express.enums;

public enum CancelStatus {
    NONE,       // Không có yêu cầu hủy
    REQUESTED,  // Khách hàng đã gửi yêu cầu hủy, chờ Admin/Store Manager phê duyệt
    APPROVED,   // Yêu cầu hủy đã được chấp thuận (hoặc đơn PENDING tự hủy trực tiếp)
    REJECTED    // Yêu cầu hủy bị Store Manager từ chối
}
