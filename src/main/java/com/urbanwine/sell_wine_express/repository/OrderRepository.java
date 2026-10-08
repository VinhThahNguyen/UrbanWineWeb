package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerOrderByCreatedAtDesc(User customer);

    List<Order> findByOrderStatusAndCreatedAtBefore(OrderStatus orderStatus, LocalDateTime thresholdTime);
}
