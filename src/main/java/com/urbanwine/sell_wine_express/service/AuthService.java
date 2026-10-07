package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.ChangePasswordRequest;
import com.urbanwine.sell_wine_express.dto.LoginRequest;
import com.urbanwine.sell_wine_express.dto.LoginResponse;
import com.urbanwine.sell_wine_express.dto.RegisterRequest;
import com.urbanwine.sell_wine_express.dto.RefreshTokenRequest;
import com.urbanwine.sell_wine_express.dto.TokenRefreshResponse;
import com.urbanwine.sell_wine_express.entity.RefreshToken;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.Role;
import com.urbanwine.sell_wine_express.repository.UserRepository;
import com.urbanwine.sell_wine_express.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public User register(RegisterRequest request) {
        // 1. Kiểm tra xem email đã tồn tại hay chưa
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email đã được sử dụng: " + request.getEmail());
        }

        // 2. Tạo đối tượng User và mã hóa mật khẩu bằng BCrypt
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhone());
        user.setRole(Role.ROLE_CUSTOMER); // Gán vai trò mặc định khi đăng ký là ROLE_CUSTOMER
        user.setIsOver18(true);

        // 3. Lưu vào cơ sở dữ liệu
        return userRepository.save(user);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        // 1. Tìm người dùng theo email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Email hoặc mật khẩu không chính xác"));

        // 2. Đối chiếu mật khẩu nhập vào với mật khẩu đã mã hóa trong CSDL
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Email hoặc mật khẩu không chính xác");
        }

        // 3. Tạo Access Token (ngắn hạn - 15 phút)
        String token = jwtUtils.generateToken(user);

        // 4. Tạo Refresh Token (dài hạn - 7 ngày) lưu vào DB
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        // 5. Trả về thông tin đăng nhập kèm cả Access Token và Refresh Token
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
        // 1. Kiểm tra mật khẩu hiện tại có đúng không
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác");
        }

        // 2. Kiểm tra mật khẩu mới và xác nhận mật khẩu có khớp nhau không
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu mới và xác nhận mật khẩu không khớp");
        }

        // 3. Kiểm tra mật khẩu mới không được trùng mật khẩu cũ
        if (passwordEncoder.matches(request.getNewPassword(), currentUser.getPasswordHash())) {
            throw new RuntimeException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        // 4. Mã hóa mật khẩu mới và cập nhật vào CSDL
        currentUser.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(currentUser);

        // Đổi mật khẩu thành công -> thu hồi luôn refresh token hiện tại để bắt buộc các phiên khác đăng nhập lại
        refreshTokenService.deleteByUser(currentUser);
    }
}
