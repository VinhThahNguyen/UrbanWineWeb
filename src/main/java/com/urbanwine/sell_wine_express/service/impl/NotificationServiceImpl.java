package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.dto.respone.NotificationResponse;
import com.urbanwine.sell_wine_express.entity.Notification;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.NotificationType;
import com.urbanwine.sell_wine_express.repository.NotificationRepository;
import com.urbanwine.sell_wine_express.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional
    public void sendNotification(User recipient, String title, String message, NotificationType type, Long orderId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .title(title)
                .message(message)
                .type(type)
                .orderId(orderId)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);

        // Mô phỏng Push Notification tới thiết bị di động của Shipper
        log.info("==========================================================================");
        log.info("[PUSH NOTIFICATION -> SHIPPER MOBILE DEVICE]");
        log.info("To Shipper: {} ({})", recipient.getFullName(), recipient.getEmail());
        log.info("Title: {}", title);
        log.info("Message: {}", message);
        log.info("Order ID: {}", orderId);
        log.info("Type: {}", type);
        log.info("==========================================================================");
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getShipperNotifications(User shipper) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(shipper)
                .stream()
                .map(n -> NotificationResponse.builder()
                        .notificationId(n.getNotificationId())
                        .title(n.getTitle())
                        .message(n.getMessage())
                        .type(n.getType())
                        .orderId(n.getOrderId())
                        .isRead(n.getIsRead())
                        .createdAt(n.getCreatedAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void markAsRead(User shipper, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo #" + notificationId));

        if (!notification.getRecipient().getUserId().equals(shipper.getUserId())) {
            throw new IllegalArgumentException("Bạn không có quyền truy cập thông báo này");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
    }
}
