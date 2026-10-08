package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.OrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderDetailRepository extends JpaRepository<OrderDetail, Long> {
    List<OrderDetail> findByOrder(Order order);
}
