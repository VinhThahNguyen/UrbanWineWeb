package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.enums.OtpType;

public interface OtpService {

    String generateAndSendOtp(String email, OtpType type);

    boolean verifyOtp(String email, String otpCode, OtpType type);
}
