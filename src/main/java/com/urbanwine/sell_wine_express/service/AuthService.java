package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.security.JwtUtils;
import com.urbanwine.sell_wine_express.dto.LoginRequest;
import com.urbanwine.sell_wine_express.dto.LoginResponse;
import com.urbanwine.sell_wine_express.dto.RegisterRequest;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.Role;
import com.urbanwine.sell_wine_express.repository.UserRepository;
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

    public LoginResponse login(LoginRequest request) {
        // 1. Tìm người dùng theo email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Email hoặc mật khẩu không chính xác"));

        // 2. Đối chiếu mật khẩu nhập vào với mật khẩu đã mã hóa trong CSDL
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Email hoặc mật khẩu không chính xác");
        }

        // 3. Tạo JWT Token
        String token = jwtUtils.generateToken(user);

        // 4. Trả về thông tin đăng nhập kèm Token
        return LoginResponse.builder()
                .token(token)
                .type("Bearer")
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();
    }
}
