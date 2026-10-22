package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.entity.OtpVerification;
import com.urbanwine.sell_wine_express.enums.OtpType;
import com.urbanwine.sell_wine_express.repository.OtpVerificationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@Slf4j
public class OtpService {

    private final OtpVerificationRepository otpVerificationRepository;
    private final JavaMailSender mailSender; // Có thể null nếu chưa cấu hình Mail SMTP
    private final SecureRandom secureRandom = new SecureRandom();

    private static final int OTP_EXPIRY_MINUTES = 5;

    public OtpService(
            OtpVerificationRepository otpVerificationRepository,
            @Autowired(required = false) JavaMailSender mailSender) {
        this.otpVerificationRepository = otpVerificationRepository;
        this.mailSender = mailSender;
    }

    @Transactional
    public String generateAndSendOtp(String email, OtpType type) {
        // 1. Sinh ngẫu nhiên mã OTP 6 chữ số
        String otpCode = String.format("%06d", secureRandom.nextInt(1000000));

        // 2. Lưu vào CSDL
        OtpVerification otpVerification = OtpVerification.builder()
                .email(email)
                .otpCode(otpCode)
                .type(type)
                .expiryTime(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
                .isUsed(false)
                .build();
        otpVerificationRepository.save(otpVerification);

        // 3. Gửi OTP qua Email
        sendOtpEmail(email, otpCode, type);

        return otpCode;
    }

    public boolean verifyOtp(String email, String otpCode, OtpType type) {
        return otpVerificationRepository.findTopByEmailAndOtpCodeAndTypeAndIsUsedFalseOrderByExpiryTimeDesc(email, otpCode, type)
                .filter(otp -> otp.getExpiryTime().isAfter(LocalDateTime.now()))
                .map(otp -> {
                    otp.setUsed(true);
                    otpVerificationRepository.save(otp);
                    return true;
                })
                .orElse(false);
    }

    private void sendOtpEmail(String toEmail, String otpCode, OtpType type) {
        String subject;
        String content;

        switch (type) {
            case REGISTER -> {
                subject = "[Urban Wine Express] Mã OTP Xác Thực Đăng Ký Tài Khoản";
                content = String.format("Chào bạn,\n\nMã OTP để kích hoạt tài khoản của bạn là: %s\nMã có hiệu lực trong %d phút.\n\nTrân trọng,\nUrban Wine Express Team",
                        otpCode, OTP_EXPIRY_MINUTES);
            }
            case LOGIN -> {
                subject = "[Urban Wine Express] Mã OTP Xác Thực Đăng Nhập";
                content = String.format("Chào bạn,\n\nMã OTP xác thực 2 bước để đăng nhập vào tài khoản của bạn là: %s\nMã có hiệu lực trong %d phút.\n\nTrân trọng,\nUrban Wine Express Team",
                        otpCode, OTP_EXPIRY_MINUTES);
            }
            case FORGOT_PASSWORD -> {
                subject = "[Urban Wine Express] Mã OTP Khôi Phục Mật Khẩu";
                content = String.format("Chào bạn,\n\nMã OTP để khôi phục mật khẩu tài khoản của bạn là: %s\nMã có hiệu lực trong %d phút.\n\nTrân trọng,\nUrban Wine Express Team",
                        otpCode, OTP_EXPIRY_MINUTES);
            }
            default -> {
                subject = "[Urban Wine Express] Mã xác thực OTP";
                content = "Mã OTP của bạn là: " + otpCode;
            }
        }

        if (mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(toEmail);
                message.setSubject(subject);
                message.setText(content);
                mailSender.send(message);
                log.info("Đã gửi email OTP thành công tới: {}", toEmail);
                return;
            } catch (Exception e) {
                log.warn("Lỗi khi gửi email: {}", e.getMessage());
            }
        }

        // Khi chưa cấu hình Gmail SMTP trong application.properties, in mã OTP to rõ lên Console
        log.warn("=================================================================");
        log.warn(">>> MÃ OTP CHO [{}] (Loại: {}) LÀ: [{}] <<<", toEmail, type, otpCode);
        log.warn("=================================================================");
    }
}
