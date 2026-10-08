package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByOrder(Order order);
}
