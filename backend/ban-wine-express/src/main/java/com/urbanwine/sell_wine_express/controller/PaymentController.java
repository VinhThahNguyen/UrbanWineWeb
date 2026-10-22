package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.request.VietQrWebhookRequest;
import com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.dto.respone.VnPayIpnResponse;
import com.urbanwine.sell_wine_express.service.OrderService;
import com.urbanwine.sell_wine_express.service.VnPayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@Slf4j
public class PaymentController {

    private final VnPayService vnPayService;
    private final OrderService orderService;

    public PaymentController(VnPayService vnPayService, OrderService orderService) {
        this.vnPayService = vnPayService;
        this.orderService = orderService;
    }

    /**
     * Webhook ngầm (IPN) do VNPay Server gọi sang hệ thống (Server-to-Server)
     * Nhận và xác nhận giao dịch thanh toán thành công hay thất bại
     */
    @GetMapping("/vnpay-ipn")
    public ResponseEntity<VnPayIpnResponse> vnpayIpn(@RequestParam Map<String, String> vnpParams) {
        log.info("Nhận callback IPN từ VNPay Gateway");
        VnPayIpnResponse response = vnPayService.processIpn(vnpParams);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint điều hướng trình duyệt (Return URL) của khách hàng sau khi hoàn tất giao dịch trên VNPay
     */
    @GetMapping("/vnpay-return")
    public ResponseEntity<PaymentStatusResponse> vnpayReturn(@RequestParam Map<String, String> vnpParams) {
        log.info("Nhận client redirect từ VNPay Return URL");
        PaymentStatusResponse response = vnPayService.processReturn(vnpParams);
        return ResponseEntity.ok(response);
    }

    /**
     * UC_2.1.5 Alternative Flow - Bước 7 & 8:
     * Webhook IPN nhận xác nhận thanh toán chuyển khoản VietQR tự động từ Cổng thanh toán / PayOS / Banking Bot.
     * Cập nhật trạng thái đơn sang COMPLETED, paymentStatus sang PAID, hoàn tất đơn hàng cho khách takeaway.
     */
    @PostMapping("/vietqr-webhook")
    public ResponseEntity<OfflineOrderResponse> vietQrWebhook(@RequestBody VietQrWebhookRequest request) {
        log.info("Nhận Webhook xác nhận thanh toán VietQR cho đơn hàng: orderId={}, orderCode={}",
                request.getOrderId(), request.getOrderCode());
        OfflineOrderResponse response = orderService.processVietQrWebhook(request);
        return ResponseEntity.ok(response);
    }
}
