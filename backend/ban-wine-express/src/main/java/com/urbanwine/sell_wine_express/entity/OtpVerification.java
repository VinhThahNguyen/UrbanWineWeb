package com.urbanwine.sell_wine_express.entity;

import com.urbanwine.sell_wine_express.enums.OtpType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "otp_verifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtpVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "otp_id")
    private Long otpId;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "otp_code", nullable = false, length = 6)
    private String otpCode;

    @Column(name = "expiry_time", nullable = false)
    private LocalDateTime expiryTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private OtpType type;

    @Column(name = "is_used", nullable = false)
    @Builder.Default
    private boolean isUsed = false;
}
