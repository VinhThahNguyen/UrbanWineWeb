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
        initializeCustomerUser();
        initializeGuestUser();
        initializeShipperUsers();
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

        // 1. Tài khoản Admin để đăng nhập quản trị
        User admin = userRepository.findByEmail("admin@gmail.com")
                .orElse(User.builder()
                        .email("admin@gmail.com")
                        .fullName("System Administrator")
                        .phoneNumber("0900000000")
                        .birthDate(LocalDate.of(1990, 1, 1))
                        .role(Role.ROLE_ADMIN)
                        .isOver18(true)
                        .isActive(true)
                        .build());

        admin.setPasswordHash(passwordEncoder.encode("123456"));
        admin.setRole(Role.ROLE_ADMIN);
        admin.setIsActive(true);
        userRepository.save(admin);

        log.info("==========================================================");
        log.info(" ĐÃ KHỞI TẠO TÀI KHOẢN ADMIN ĐĂNG NHẬP:");
        log.info(" Email: admin@gmail.com");
        log.info(" Password: {}", "123456");
        log.info("==========================================================");
    }

    private void initializeCustomerUser() {
        // 2. Tài khoản Khách hàng mang email thật của bạn (Vnguyenthanh0805@gmail.com)
        // để khi đăng nhập Customer thì mã OTP sẽ gửi thẳng về điện thoại/hộp thư của bạn!
        User customer = userRepository.findByEmail("Vnguyenthanh0805@gmail.com")
                .orElse(User.builder()
                        .email("Vnguyenthanh0805@gmail.com")
                        .fullName("Nguyễn Thành Vinh (Customer)")
                        .phoneNumber("0988888888")
                        .birthDate(LocalDate.of(1995, 1, 1))
                        .role(Role.ROLE_CUSTOMER)
                        .isOver18(true)
                        .isActive(true)
                        .build());

        customer.setRole(Role.ROLE_CUSTOMER);
        customer.setPasswordHash(passwordEncoder.encode("123456"));
        customer.setIsActive(true);
        userRepository.save(customer);

        log.info("==========================================================");
        log.info(" ĐÃ THIẾT LẬP TÀI KHOẢN CUSTOMER (NHẬN OTP VỀ GMAIL):");
        log.info(" Email: Vnguyenthanh0805@gmail.com");
        log.info(" Password: {}", "123456");
        log.info("==========================================================");
    }

    private void initializeGuestUser() {
        if (userRepository.findByEmail("guest@urbanwine.com").isEmpty()) {
            User guest = User.builder()
                    .email("guest@urbanwine.com")
                    .passwordHash(passwordEncoder.encode("Guest@123"))
                    .fullName("Khách mua tại quầy")
                    .phoneNumber("N/A")
                    .birthDate(LocalDate.of(2000, 1, 1))
                    .role(Role.ROLE_CUSTOMER)
                    .isOver18(true)
                    .isActive(true)
                    .build();
            userRepository.save(guest);
            log.info(" Đã khởi tạo tài khoản Khách vãng lai mua tại quầy (guest@urbanwine.com)");
        }
    }

    private void initializeShipperUsers() {
        if (userRepository.findByEmail("shipper1@urbanwine.com").isEmpty()) {
            User shipper1 = User.builder()
                    .email("shipper1@urbanwine.com")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName("Nguyễn Văn Giao (Shipper 1)")
                    .phoneNumber("0911111111")
                    .birthDate(LocalDate.of(1996, 5, 10))
                    .role(Role.ROLE_SHIPPER)
                    .isOver18(true)
                    .isActive(true)
                    .isOnline(false) // Mặc định chưa online, khi đăng nhập sẽ online
                    .build();
            userRepository.save(shipper1);
            log.info(" Đã khởi tạo tài khoản Shipper 1: shipper1@urbanwine.com / 123456");
        }

        if (userRepository.findByEmail("shipper2@urbanwine.com").isEmpty()) {
            User shipper2 = User.builder()
                    .email("shipper2@urbanwine.com")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .fullName("Trần Văn Tốc (Shipper 2)")
                    .phoneNumber("0922222222")
                    .birthDate(LocalDate.of(1998, 8, 20))
                    .role(Role.ROLE_SHIPPER)
                    .isOver18(true)
                    .isActive(true)
                    .isOnline(false)
                    .build();
            userRepository.save(shipper2);
            log.info(" Đã khởi tạo tài khoản Shipper 2: shipper2@urbanwine.com / 123456");
        }
    }
}
