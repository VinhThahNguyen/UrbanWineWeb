package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.CancelStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerOrderByCreatedAtDesc(User customer);

    List<Order> findByOrderStatusAndCreatedAtBefore(OrderStatus orderStatus, LocalDateTime thresholdTime);

    List<Order> findByCancelStatus(CancelStatus cancelStatus);

    Page<Order> findByOrderStatus(OrderStatus orderStatus, Pageable pageable);

    Page<Order> findByCancelStatus(CancelStatus cancelStatus, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.orderStatus = :orderStatus OR o.cancelStatus = :cancelStatus")
    Page<Order> findRequiringAttentionOrders(@Param("orderStatus") OrderStatus orderStatus,
                                            @Param("cancelStatus") CancelStatus cancelStatus,
                                            Pageable pageable);

    long countByShipperAndOrderStatus(User shipper, OrderStatus orderStatus);

    List<Order> findByShipperOrderByCreatedAtDesc(User shipper);

    java.util.Optional<Order> findByOrderIdAndShipper(Long orderId, User shipper);
}
