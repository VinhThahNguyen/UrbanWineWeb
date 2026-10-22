package com.urbanwine.sell_wine_express.repository;

import com.urbanwine.sell_wine_express.entity.Notification;
import com.urbanwine.sell_wine_express.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);

    long countByRecipientAndIsReadFalse(User recipient);
}
