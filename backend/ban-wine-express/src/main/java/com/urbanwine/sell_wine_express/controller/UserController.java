package com.urbanwine.sell_wine_express.controller;

import com.urbanwine.sell_wine_express.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    // Endpoint yêu cầu người dùng phải đăng nhập (có JWT token hợp lệ)
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUserProfile(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Chưa xác thực"));
        }

        Map<String, Object> profile = new HashMap<>();
        profile.put("userId", currentUser.getUserId());
        profile.put("email", currentUser.getEmail());
        profile.put("fullName", currentUser.getFullName());
        profile.put("phone", currentUser.getPhoneNumber());
        profile.put("role", currentUser.getRole());
        profile.put("isOver18", currentUser.getIsOver18());

        return ResponseEntity.ok(profile);
    }

    // Endpoint chỉ cho phép tài khoản có quyền ROLE_ADMIN truy cập
    @GetMapping("/admin-only")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> adminOnlyEndpoint() {
        return ResponseEntity.ok(Map.of("message", "Chào mừng Admin đến với khu vực quản trị!"));
    }
}
