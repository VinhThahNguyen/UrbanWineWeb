package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.OtpVerification;
import com.urbanwine.sell_wine_express.enums.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {

    Optional<OtpVerification> findTopByEmailAndTypeAndIsUsedFalseOrderByExpiryTimeDesc(String email, OtpType type);

    Optional<OtpVerification> findTopByEmailAndOtpCodeAndTypeAndIsUsedFalseOrderByExpiryTimeDesc(String email, String otpCode, OtpType type);

    void deleteByEmail(String email);
}
