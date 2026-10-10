package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.config.VnPayConfig;
import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.dto.respone.VnPayIpnResponse;
import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.PaymentTransaction;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.PaymentMethod;
import com.urbanwine.sell_wine_express.enums.PaymentStatus;
import com.urbanwine.sell_wine_express.repository.OrderRepository;
import com.urbanwine.sell_wine_express.repository.PaymentTransactionRepository;
import com.urbanwine.sell_wine_express.service.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VnPayServiceImpl implements VnPayService {

    private final VnPayConfig vnPayConfig;
    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    @Override
    public String createPaymentUrl(Order order, HttpServletRequest request) {
        long amount = order.getTotalAmount().multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(amount));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", String.valueOf(order.getOrderId()));
        vnpParams.put("vnp_OrderInfo", "Thanh toan don hang #" + order.getOrderId());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", VnPayConfig.getIpAddress(request));

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        String vnpCreateDate = formatter.format(cld.getTime());
        vnpParams.put("vnp_CreateDate", vnpCreateDate);

        // Hết hạn sau 15 phút (theo Business Rule E3)
        cld.add(Calendar.MINUTE, 15);
        String vnpExpireDate = formatter.format(cld.getTime());
        vnpParams.put("vnp_ExpireDate", vnpExpireDate);

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        try {
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = vnpParams.get(fieldName);
                if (fieldValue != null && !fieldValue.isEmpty()) {
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));

                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString()));
                    query.append('=');
                    query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));

                    if (itr.hasNext()) {
                        query.append('&');
                        hashData.append('&');
                    }
                }
            }
        } catch (UnsupportedEncodingException e) {
            log.error("Lỗi mã hóa tham số VNPay: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi tạo URL thanh toán VNPay", e);
        }

        String queryUrl = query.toString();
        String vnpSecureHash = VnPayConfig.hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnpSecureHash;

        return vnPayConfig.getPayUrl() + "?" + queryUrl;
    }

    @Override
    @Transactional
    public VnPayIpnResponse processIpn(Map<String, String> vnpParams) {
        log.info("Nhận thông báo IPN từ VNPay: {}", vnpParams);

        String vnpSecureHash = vnpParams.get("vnp_SecureHash");

        // 1. Kiểm tra tính hợp lệ của chữ ký Checksum
        if (!validateSignature(vnpParams, vnpSecureHash)) {
            log.warn("IPN VNPay: Sai chữ ký bảo mật (Invalid Checksum)");
            return new VnPayIpnResponse("97", "Invalid Checksum");
        }

        // 2. Tìm đơn hàng tương ứng
        String txnRef = vnpParams.get("vnp_TxnRef");
        if (txnRef == null) {
            return new VnPayIpnResponse("01", "Order not Found");
        }

        Long orderId;
        try {
            orderId = Long.parseLong(txnRef);
        } catch (NumberFormatException e) {
            return new VnPayIpnResponse("01", "Order not Found");
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            log.warn("IPN VNPay: Không tìm thấy đơn hàng #{}", orderId);
            return new VnPayIpnResponse("01", "Order not Found");
        }

        // 3. Kiểm tra số tiền giao dịch
        String vnpAmountStr = vnpParams.get("vnp_Amount");
        long vnpAmount = (vnpAmountStr != null ? Long.parseLong(vnpAmountStr) : 0) / 100;
        long orderAmount = order.getTotalAmount().longValue();

        if (vnpAmount != orderAmount) {
            log.warn("IPN VNPay: Sai lệch số tiền cho đơn #{}. Cổng: {}, DB: {}", orderId, vnpAmount, orderAmount);
            return new VnPayIpnResponse("04", "Invalid Amount");
        }

        // 4. Kiểm tra trạng thái giao dịch hiện tại
        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order)
                .orElseGet(() -> {
                    PaymentTransaction tx = new PaymentTransaction();
                    tx.setOrder(order);
                    tx.setPaymentMethod(PaymentMethod.VNPAY.name());
                    return tx;
                });

        if (paymentTx.getPaymentStatus() == PaymentStatus.PAID) {
            log.info("IPN VNPay: Đơn hàng #{} đã được ghi nhận thanh toán trước đó", orderId);
            return new VnPayIpnResponse("02", "Order already confirmed");
        }

        // 5. Cập nhật kết quả thanh toán theo phản hồi từ VNPay
        String responseCode = vnpParams.get("vnp_ResponseCode");
        String transactionStatus = vnpParams.get("vnp_TransactionStatus");
        String bankReceiptCode = vnpParams.get("vnp_TransactionNo");

        if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
            // Thanh toán thành công: Cập nhật order sang PROCESSING, payment sang PAID (BR-07, POST-3)
            order.setOrderStatus(OrderStatus.PROCESSING);
            paymentTx.setPaymentStatus(PaymentStatus.PAID);
            paymentTx.setBankReceiptCode(bankReceiptCode);

            orderRepository.save(order);
            paymentTransactionRepository.save(paymentTx);

            log.info("IPN VNPay: Đơn hàng #{} thanh toán THÀNH CÔNG qua VNPay! Mã GD: {}", orderId, bankReceiptCode);
        } else {
            // Thanh toán thất bại hoặc hủy bỏ (E2)
            paymentTx.setPaymentStatus(PaymentStatus.FAILED);
            paymentTx.setBankReceiptCode(bankReceiptCode);
            paymentTransactionRepository.save(paymentTx);

            log.warn("IPN VNPay: Giao dịch đơn #{} thất bại với responseCode={}", orderId, responseCode);
        }

        return new VnPayIpnResponse("00", "Confirm Success");
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse processReturn(Map<String, String> vnpParams) {
        String vnpSecureHash = vnpParams.get("vnp_SecureHash");
        boolean isSignatureValid = validateSignature(vnpParams, vnpSecureHash);

        String txnRef = vnpParams.get("vnp_TxnRef");
        Long orderId = null;
        if (txnRef != null) {
            try {
                orderId = Long.parseLong(txnRef);
            } catch (NumberFormatException ignored) {}
        }

        if (orderId == null) {
            return PaymentStatusResponse.builder()
                    .isPaid(false)
                    .paymentStatus(PaymentStatus.FAILED)
                    .build();
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null) {
            return PaymentStatusResponse.builder()
                    .orderId(orderId)
                    .isPaid(false)
                    .paymentStatus(PaymentStatus.FAILED)
                    .build();
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        PaymentStatus paymentStatus = (paymentTx != null) ? paymentTx.getPaymentStatus() : PaymentStatus.UNPAID;
        String bankReceiptCode = (paymentTx != null) ? paymentTx.getBankReceiptCode() : null;

        String responseCode = vnpParams.get("vnp_ResponseCode");
        boolean isSuccess = isSignatureValid && "00".equals(responseCode);

        return PaymentStatusResponse.builder()
                .orderId(order.getOrderId())
                .totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus())
                .paymentMethod(PaymentMethod.VNPAY)
                .paymentStatus(isSuccess ? PaymentStatus.PAID : paymentStatus)
                .bankReceiptCode(bankReceiptCode != null ? bankReceiptCode : vnpParams.get("vnp_TransactionNo"))
                .isPaid(isSuccess || paymentStatus == PaymentStatus.PAID)
                .createdAt(order.getCreatedAt())
                .build();
    }

    private boolean validateSignature(Map<String, String> vnpParams, String vnpSecureHash) {
        if (vnpSecureHash == null || vnpSecureHash.isEmpty()) {
            return false;
        }

        Map<String, String> fields = new HashMap<>(vnpParams);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        try {
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = fields.get(fieldName);
                if (fieldValue != null && !fieldValue.isEmpty()) {
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                    if (itr.hasNext()) {
                        hashData.append('&');
                    }
                }
            }
        } catch (UnsupportedEncodingException e) {
            return false;
        }

        String calculatedHash = VnPayConfig.hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
        return calculatedHash.equalsIgnoreCase(vnpSecureHash);
    }
}
