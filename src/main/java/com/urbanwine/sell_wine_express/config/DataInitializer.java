package com.urbanwine.sell_wine_express.config;

import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.Role;
import com.urbanwine.sell_wine_express.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        initializeAdminUser();
    }

    private void initializeAdminUser() {
        // Tự động khởi tạo tài khoản Admin mặc định của hệ thống nếu chưa tồn tại
        if (userRepository.findByEmail("admin@urbanwine.com").isEmpty()) {
            User admin = User.builder()
                    .email("admin@urbanwine.com")
                    .passwordHash(passwordEncoder.encode("Admin@123"))
                    .fullName("System Administrator")
                    .phoneNumber("0900000000")
                    .birthDate(LocalDate.of(1990, 1, 1))
                    .role(Role.ROLE_ADMIN)
                    .isOver18(true)
                    .isActive(true)
                    .build();

            userRepository.save(admin);
            log.info("==========================================================");
            log.info(" ĐÃ KHỞI TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH THÀNH CÔNG:");
            log.info(" Email: admin@urbanwine.com");
            log.info(" Password: Admin@123");
            log.info("==========================================================");
        }
    }
}
