package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.dto.respone.VnPayIpnResponse;
import com.urbanwine.sell_wine_express.service.VnPayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final VnPayService vnPayService;

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
}
