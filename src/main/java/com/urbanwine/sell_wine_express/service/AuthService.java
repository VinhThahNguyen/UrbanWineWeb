package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.*;
import com.urbanwine.sell_wine_express.dto.respone.*;
import com.urbanwine.sell_wine_express.entity.RefreshToken;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.OtpType;
import com.urbanwine.sell_wine_express.enums.Role;
import com.urbanwine.sell_wine_express.repository.UserRepository;
import com.urbanwine.sell_wine_express.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RefreshTokenService refreshTokenService;
    private final OtpService otpService;

    @Transactional
    public User register(RegisterRequest request) {
        // 1. Kiểm tra xem email đã tồn tại hay chưa
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email đã được sử dụng: " + request.getEmail());
        }

        // 2. Kiểm tra quy tắc BR-01: Khách hàng phải từ 18 tuổi trở lên
        if (request.getBirthDate() == null) {
            throw new RuntimeException("Ngày sinh không được để trống");
        }
        int age = Period.between(request.getBirthDate(), LocalDate.now()).getYears();
        if (age < 18) {
            throw new RuntimeException("Bạn chưa đủ 18 tuổi để mua rượu vang (Quy định BR-01)");
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

    @Transactional
    public void verifyRegisterOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này"));

        if (Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("Tài khoản này đã được kích hoạt trước đó");
        }

        boolean isValid = otpService.verifyOtp(request.getEmail(), request.getOtpCode(), OtpType.REGISTER);
        if (!isValid) {
            throw new RuntimeException("Mã OTP không chính xác hoặc đã hết hạn");
        }

        // Kích hoạt tài khoản
        user.setIsActive(true);
        userRepository.save(user);
    }

    @Transactional
    public Object login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Email hoặc mật khẩu không chính xác"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Email hoặc mật khẩu không chính xác");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("Tài khoản chưa được kích hoạt. Vui lòng xác thực mã OTP gửi về email");
        }

        // Đối với ROLE_CUSTOMER: Cần xác thực 2 bước bằng OTP
        if (user.getRole() == Role.ROLE_CUSTOMER) {
            otpService.generateAndSendOtp(user.getEmail(), OtpType.LOGIN);
            return "REQUIRES_OTP";
        }

        // Đối với ROLE_ADMIN hoặc ROLE_SHIPPER: Đăng nhập thẳng, nhận Token ngay
        return createTokenResponse(user);
    }

    @Transactional
    public LoginResponse verifyLoginOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này"));

        boolean isValid = otpService.verifyOtp(request.getEmail(), request.getOtpCode(), OtpType.LOGIN);
        if (!isValid) {
            throw new RuntimeException("Mã OTP không chính xác hoặc đã hết hạn");
        }

        return createTokenResponse(user);
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này"));

        otpService.generateAndSendOtp(email, OtpType.FORGOT_PASSWORD);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này"));

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu mới và xác nhận mật khẩu không khớp");
        }

        boolean isValid = otpService.verifyOtp(request.getEmail(), request.getOtpCode(), OtpType.FORGOT_PASSWORD);
        if (!isValid) {
            throw new RuntimeException("Mã OTP không chính xác hoặc đã hết hạn");
        }

        // Đổi mật khẩu mới
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Thu hồi refresh token cũ
        refreshTokenService.deleteByUser(user);
    }

    @Transactional
    public User createShipper(CreateShipperRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email đã được sử dụng: " + request.getEmail());
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
                .orElseThrow(() -> new RuntimeException("Refresh token không tồn tại trong hệ thống!"));
    }

    @Transactional
    public void logout(User currentUser) {
        if (currentUser != null) {
            refreshTokenService.deleteByUser(currentUser);
        }
    }

    @Transactional
    public void changePassword(User currentUser, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu mới và xác nhận mật khẩu không khớp");
        }

        if (passwordEncoder.matches(request.getNewPassword(), currentUser.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        currentUser.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);

        refreshTokenService.deleteByUser(currentUser);
    }
}
