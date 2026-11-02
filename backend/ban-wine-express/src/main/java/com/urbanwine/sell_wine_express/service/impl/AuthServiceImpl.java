package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.dto.request.*;
import com.urbanwine.sell_wine_express.dto.respone.*;
import com.urbanwine.sell_wine_express.entity.RefreshToken;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.OtpType;
import com.urbanwine.sell_wine_express.enums.Role;
import com.urbanwine.sell_wine_express.repository.UserRepository;
import com.urbanwine.sell_wine_express.security.JwtUtils;
import com.urbanwine.sell_wine_express.service.AuthService;
import com.urbanwine.sell_wine_express.service.OtpService;
import com.urbanwine.sell_wine_express.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RefreshTokenService refreshTokenService;
    private final OtpService otpService;

    @Override
    @Transactional
    public User register(RegisterRequest request) {
        // 1. Kiểm tra xem email đã tồn tại hay chưa
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email is already in use: " + request.getEmail());
        }

        // 2. Kiểm tra quy tắc BR-01: Khách hàng phải từ 18 tuổi trở lên
        if (request.getBirthDate() == null) {
            throw new RuntimeException("Date of birth is required");
        }
        int age = Period.between(request.getBirthDate(), LocalDate.now()).getYears();
        if (age < 18) {
            throw new RuntimeException("You must be at least 18 years old to purchase wine (Rule BR-01)");
        }

        // 3. Tạo tài khoản khách hàng ở trạng thái CHƯA KÍCH HOẠT (isActive = false)
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhone());
        user.setBirthDate(request.getBirthDate());
        user.setRole(Role.ROLE_CUSTOMER);
        user.setIsOver18(true);
        user.setIsActive(false); // Chờ nhập OTP mới kích hoạt

        User savedUser = userRepository.save(user);

        // 4. Sinh OTP và gửi qua Email
        otpService.generateAndSendOtp(user.getEmail(), OtpType.REGISTER);

        return savedUser;
    }

    @Override
    @Transactional
    public void verifyRegisterOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found with this email"));

        if (Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("This account is already activated");
        }

        boolean isValid = otpService.verifyOtp(request.getEmail(), request.getOtpCode(), OtpType.REGISTER);
        if (!isValid) {
            throw new RuntimeException("Invalid or expired OTP code");
        }

        // Kích hoạt tài khoản
        user.setIsActive(true);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public Object login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Incorrect email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Incorrect email or password");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("Account is not activated. Please verify the OTP sent to your email");
        }

        // Đối với ROLE_CUSTOMER: Cần xác thực 2 bước bằng OTP
        if (user.getRole() == Role.ROLE_CUSTOMER) {
            otpService.generateAndSendOtp(user.getEmail(), OtpType.LOGIN);
            return "REQUIRES_OTP";
        }

        // Đối với ROLE_ADMIN hoặc ROLE_SHIPPER: Đăng nhập thẳng, nhận Token ngay
        if (user.getRole() == Role.ROLE_SHIPPER) {
            user.setIsOnline(true);
            userRepository.save(user);
        }

        return createTokenResponse(user);
    }

    @Override
    @Transactional
    public LoginResponse verifyLoginOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found with this email"));

        boolean isValid = otpService.verifyOtp(request.getEmail(), request.getOtpCode(), OtpType.LOGIN);
        if (!isValid) {
            throw new RuntimeException("Invalid or expired OTP code");
        }

        return createTokenResponse(user);
    }

    @Override
    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No account found with this email"));

        otpService.generateAndSendOtp(email, OtpType.FORGOT_PASSWORD);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No account found with this email"));

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New password and confirmation do not match");
        }

        boolean isValid = otpService.verifyOtp(request.getEmail(), request.getOtpCode(), OtpType.FORGOT_PASSWORD);
        if (!isValid) {
            throw new RuntimeException("Invalid or expired OTP code");
        }

        // Đổi mật khẩu mới
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Thu hồi refresh token cũ
        refreshTokenService.deleteByUser(user);
    }

    @Override
    @Transactional
    public User createShipper(CreateShipperRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email is already in use: " + request.getEmail());
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhone());
        user.setBirthDate(request.getBirthDate());
        user.setRole(Role.ROLE_SHIPPER);
        user.setIsOver18(true);
        user.setIsActive(true); // Shipper do Admin tạo được kích hoạt ngay, không cần OTP

        return userRepository.save(user);
    }

    private LoginResponse createTokenResponse(User user) {
        String token = jwtUtils.generateToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken.getToken())
                .type("Bearer")
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();
    }

    @Override
    @Transactional
    public TokenRefreshResponse refreshToken(RefreshTokenRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String newAccessToken = jwtUtils.generateToken(user);
                    return TokenRefreshResponse.builder()
                            .accessToken(newAccessToken)
                            .refreshToken(requestRefreshToken)
                            .tokenType("Bearer")
                            .build();
                })
                .orElseThrow(() -> new RuntimeException("Refresh token does not exist in the system"));
    }

    @Override
    @Transactional
    public void logout(User currentUser) {
        if (currentUser != null) {
            refreshTokenService.deleteByUser(currentUser);
            if (currentUser.getRole() == Role.ROLE_SHIPPER) {
                currentUser.setIsOnline(false);
                userRepository.save(currentUser);
            }
        }
    }

    @Override
    @Transactional
    public void changePassword(User currentUser, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPasswordHash())) {
            throw new RuntimeException("Current password is incorrect");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New password and confirmation do not match");
        }

        if (passwordEncoder.matches(request.getNewPassword(), currentUser.getPasswordHash())) {
            throw new RuntimeException("New password cannot be the same as current password");
        }

        currentUser.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);

        refreshTokenService.deleteByUser(currentUser);
    }
}

