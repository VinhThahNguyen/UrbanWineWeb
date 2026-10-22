package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.Cart;
import com.urbanwine.sell_wine_express.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findByUser(User user);
    Optional<Cart> findByUserUserId(Long userId);
}
