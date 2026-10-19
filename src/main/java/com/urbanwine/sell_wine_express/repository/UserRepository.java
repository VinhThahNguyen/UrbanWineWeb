package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByRoleAndIsOnlineTrue(Role role);
}
