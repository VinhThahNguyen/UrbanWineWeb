package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.CancelOrderRequest;
import com.urbanwine.sell_wine_express.dto.request.CheckoutSummaryRequest;
import com.urbanwine.sell_wine_express.dto.request.PlaceOrderRequest;
import com.urbanwine.sell_wine_express.dto.request.RejectOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.CheckoutSummaryResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.CancelStatus;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

public interface OrderService {

    CheckoutSummaryResponse calculateCheckoutSummary(User customer, CheckoutSummaryRequest request);

    OrderResponse placeOrder(User customer, PlaceOrderRequest request, HttpServletRequest servletRequest);

    List<OrderResponse> getCustomerOrders(User customer);

    OrderResponse getOrderDetail(User customer, Long orderId);

    PaymentStatusResponse getPaymentStatus(User customer, Long orderId);

    void cancelExpiredPendingOrders();

    OrderResponse cancelOrder(User customer, Long orderId, CancelOrderRequest request);

    OrderResponse resumePayment(User customer, Long orderId, HttpServletRequest servletRequest);

    List<OrderResponse> getPendingCancellationOrders();

    OrderResponse reviewCancellationRequest(Long orderId, boolean approve, String adminNote);

    // UC_2.1.2 Process Order: Admin xem danh sách đơn hàng cần xử lý hoặc toàn bộ đơn
    default PageResponse<OrderResponse> getAdminOrders(OrderStatus status, CancelStatus cancelStatus, int page, int size) {
        return getAdminOrders(status, cancelStatus, false, page, size);
    }

    PageResponse<OrderResponse> getAdminOrders(OrderStatus status, CancelStatus cancelStatus, boolean all, int page, int size);

    // Lấy số lượng đơn hàng theo từng trạng thái cho Admin Dashboard / Order Management
    java.util.Map<String, Long> getOrderCounts();

    // UC_2.1.2 Process Order: Admin xem chi tiết toàn bộ thông tin đơn hàng
    OrderResponse getAdminOrderDetail(Long orderId);

    // UC_2.1.2 Process Order: Admin duyệt đơn PENDING -> PROCESSING (BR-07)
    OrderResponse approveOrder(Long orderId);

    // UC_2.1.2 Process Order: Admin từ chối đơn PENDING kèm lý do (E2, POST-2, POST-3)
    OrderResponse rejectOrder(Long orderId, RejectOrderRequest request);

    // =========================================================================
    // UC_2.1.5: CREATE OFFLINE ORDER (BÁN LẺ TẠI QUẦY CHO KHÁCH VÃNG LAI)
    // =========================================================================
    // 1. Tạo đơn hàng offline và xử lý thanh toán (CASH hoàn tất ngay, VIETQR sinh dynamic QR)
    com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse createOfflineOrder(com.urbanwine.sell_wine_express.dto.request.CreateOfflineOrderRequest request);

    // 2. Hủy nhanh đơn hàng offline PENDING tại quầy (khách đổi ý) -> hoàn kho ngay lập tức
    com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse cancelOfflineOrder(Long orderId);

    // 3. Xem chi tiết / Polling trạng thái đơn hàng offline tại quầy
    com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse getOfflineOrderDetail(Long orderId);

    // 4. Nhận Webhook IPN từ cổng thanh toán / ngân hàng xác nhận khách quét VietQR thành công
    com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse processVietQrWebhook(com.urbanwine.sell_wine_express.dto.request.VietQrWebhookRequest request);

    // =========================================================================
    // UC_2.1.4: ASSIGN ORDER TO SHIPPER (ĐIỀU PHỐI ĐƠN HÀNG CHO SHIPPER)
    // =========================================================================
    // 1. Lấy danh sách nhân viên giao hàng đang trong ca trực (isOnline = true) và khối lượng công việc hiện tại (E1)
    List<com.urbanwine.sell_wine_express.dto.respone.ShipperWorkloadResponse> getAvailableShippers();

    // 2. Gán đơn hàng PROCESSING cho shipper lần đầu -> chuyển sang SHIPPING (PRE-2, POST-1, POST-2, POST-3, E2)
    OrderResponse assignShipper(Long orderId, com.urbanwine.sell_wine_express.dto.request.AssignShipperRequest request);

    // 3. Phân công lại đơn hàng cho shipper khác khi cần thiết (Alternative Flow)
    OrderResponse reassignShipper(Long orderId, com.urbanwine.sell_wine_express.dto.request.AssignShipperRequest request);

    // 4. Shipper xem danh sách các đơn hàng được gán cho chính mình (BR-08)
    List<OrderResponse> getShipperOrders(User shipper);

    // 5. Shipper xem chi tiết đơn hàng được gán cho mình (BR-08)
    OrderResponse getShipperOrderDetail(User shipper, Long orderId);

    // =========================================================================
    // SHIPPER REJECT DELIVERY FLOW (SHIPPER TỪ CHỐI NHẬN ĐƠN / BÁO SỰ CỐ)
    // =========================================================================
    // 1. Shipper gửi yêu cầu xin từ chối giao đơn hàng kèm lý do sự cố (hỏng xe, ngập lụt...)
    OrderResponse requestShipperRejectOrder(User shipper, Long orderId, com.urbanwine.sell_wine_express.dto.request.ShipperRejectOrderRequest request);

    // 2. Admin xem danh sách các đơn hàng shipper đang xin từ chối nhận
    List<OrderResponse> getPendingShipperRejectOrders();

    // 3. Admin xét duyệt yêu cầu từ chối của shipper (approve = true: rút đơn; approve = false: shipper giao tiếp)
    OrderResponse reviewShipperRejectOrder(Long orderId, com.urbanwine.sell_wine_express.dto.request.ReviewShipperRejectRequest request);

    // =========================================================================
    // UC_2.3.2: UPDATE DELIVERY STATUS (CẬP NHẬT TRẠNG THÁI GIAO HÀNG CỦA SHIPPER)
    // =========================================================================
    // 1. Shipper xác nhận giao hàng thành công (POST-1, BR-08, BR-09)
    OrderResponse completeDelivery(User shipper, Long orderId);

    // 2. Shipper báo cáo giao hàng thất bại kèm lý do (POST-2, BR-04, BR-08, E2)
    OrderResponse failDelivery(User shipper, Long orderId, com.urbanwine.sell_wine_express.dto.request.FailDeliveryRequest request);

    // =========================================================================
    // UC_2.3.4: DISPLAY PAYMENT METHOD (HIỂN THỊ VIETQR ĐỘNG CHO SHIPPER THU TIỀN TẠI CHỖ)
    // =========================================================================
    // 1. Shipper yêu cầu tạo mã VietQR động để khách quét thanh toán tại chỗ (Normal Flow, BR-08, E1)
    com.urbanwine.sell_wine_express.dto.respone.ShipperVietQrResponse generateShipperVietQr(User shipper, Long orderId);

    // 2. Khách đổi ý trả tiền mặt -> Shipper hủy phiên QR chuyển về tiền mặt (Alternative Flow)
    OrderResponse cancelShipperVietQr(User shipper, Long orderId);

    // 3. Shipper kiểm tra trạng thái thanh toán thời gian thực khi đang chờ khách quét QR (Polling)
    com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse getShipperPaymentStatus(User shipper, Long orderId);
}


