package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.dto.respone.VnPayIpnResponse;
import com.urbanwine.sell_wine_express.entity.Order;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

public interface VnPayService {

    String createPaymentUrl(Order order, HttpServletRequest request);

    VnPayIpnResponse processIpn(Map<String, String> vnpParams);

    PaymentStatusResponse processReturn(Map<String, String> vnpParams);
}
