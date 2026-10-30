package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.*;
import com.urbanwine.sell_wine_express.dto.respone.*;
import com.urbanwine.sell_wine_express.entity.User;

public interface AuthService {

    User register(RegisterRequest request);

    void verifyRegisterOtp(VerifyOtpRequest request);

    Object login(LoginRequest request);

    LoginResponse verifyLoginOtp(VerifyOtpRequest request);

    void forgotPassword(String email);

    void resetPassword(ResetPasswordRequest request);

    User createShipper(CreateShipperRequest request);

    TokenRefreshResponse refreshToken(RefreshTokenRequest request);

    void logout(User currentUser);

    void changePassword(User currentUser, ChangePasswordRequest request);
}
