package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.dto.request.*;
import com.urbanwine.sell_wine_express.dto.respone.*;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 1. Đăng ký tài khoản khách hàng (Kiểm tra 18+ và gửi OTP)
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            User registeredUser = authService.register(request);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP kích hoạt tài khoản.");
            response.put("userId", registeredUser.getUserId());
            response.put("email", registeredUser.getEmail());
            response.put("fullName", registeredUser.getFullName());
            response.put("isActive", registeredUser.getIsActive());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    // 2. Xác thực OTP đăng ký (Kích hoạt tài khoản)
    @PostMapping("/verify-register-otp")
    public ResponseEntity<?> verifyRegisterOtp(@Valid @RequestBody VerifyOtpRequest request) {
        try {
            authService.verifyRegisterOtp(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Kích hoạt tài khoản thành công! Bây giờ bạn có thể đăng nhập.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    // 3. Đăng nhập (Bước 1: Khách hàng cần OTP 2FA, Admin/Shipper nhận Token ngay)
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            Object result = authService.login(request);

            if ("REQUIRES_OTP".equals(result)) {
                Map<String, Object> response = new HashMap<>();
                response.put("requiresOtp", true);
                response.put("email", request.getEmail());
                response.put("message", "Mã xác thực đăng nhập (OTP) đã được gửi đến email của bạn. Vui lòng nhập OTP để hoàn tất.");
                return ResponseEntity.ok(response);
            }

            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }

    // 4. Xác thực OTP đăng nhập (Bước 2: Cấp Token JWT cho Khách hàng)
    @PostMapping("/verify-login-otp")
    public ResponseEntity<?> verifyLoginOtp(@Valid @RequestBody VerifyOtpRequest request) {
        try {
            LoginResponse response = authService.verifyLoginOtp(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }

    // 5. Yêu cầu mã OTP khôi phục mật khẩu (Forgot Password)
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Email không được để trống"));
        }

        try {
            authService.forgotPassword(email);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Mã OTP khôi phục mật khẩu đã được gửi đến email của bạn.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    // 6. Đặt lại mật khẩu mới bằng OTP (Reset Password)
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    // 7. Cấp lại Access Token từ Refresh Token
    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            TokenRefreshResponse response = authService.refreshToken(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        }
    }

    // 8. Đăng xuất (Thu hồi Refresh Token)
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Yêu cầu cần token xác thực hợp lệ");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        authService.logout(currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đăng xuất thành công!");
        return ResponseEntity.ok(response);
    }

    // 9. Đổi mật khẩu trong trang cá nhân
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ChangePasswordRequest request) {
        if (currentUser == null) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Yêu cầu cần token xác thực hợp lệ");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        try {
            authService.changePassword(currentUser, request);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Đổi mật khẩu thành công!");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    // 10. Admin tạo tài khoản Shipper (Không cần OTP)
    @PostMapping("/create-shipper")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> createShipper(@Valid @RequestBody CreateShipperRequest request) {
        try {
            User shipper = authService.createShipper(request);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Tạo tài khoản Shipper thành công!");
            response.put("userId", shipper.getUserId());
            response.put("email", shipper.getEmail());
            response.put("fullName", shipper.getFullName());
            response.put("role", shipper.getRole());
            response.put("isActive", shipper.getIsActive());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }
}
