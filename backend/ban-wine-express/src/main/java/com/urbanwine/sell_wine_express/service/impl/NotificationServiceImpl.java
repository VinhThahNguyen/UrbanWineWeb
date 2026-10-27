package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.dto.respone.NotificationResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderRealtimeMessage;
import com.urbanwine.sell_wine_express.entity.Notification;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.NotificationType;
import com.urbanwine.sell_wine_express.repository.NotificationRepository;
import com.urbanwine.sell_wine_express.service.NotificationService;
import com.urbanwine.sell_wine_express.websocket.OrderNotificationWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final OrderNotificationWebSocketHandler orderNotificationWebSocketHandler;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendNotification(User recipient, String title, String message, NotificationType type, Long orderId) {
        if (recipient == null) {
            log.info("Bỏ qua thông báo in-app: Người nhận là null (khách vãng lai).");
            return;
        }

        try {
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
        } catch (Exception e) {
            log.warn("Không thể lưu thông báo in-app cho người dùng [{}]: {}", recipient.getEmail(), e.getMessage());
        }

        try {
            // Phát tín hiệu Real-time qua WebSocket cho trình duyệt của người dùng (nếu có handler)
            if (orderNotificationWebSocketHandler != null) {
                orderNotificationWebSocketHandler.sendOrderNotification(
                        OrderRealtimeMessage.builder()
                                .type(type.name())
                                .orderId(orderId)
                                .orderCode(orderId != null ? "#UWE-" + orderId : null)
                                .customerEmail(recipient.getEmail())
                                .title(title)
                                .message(message)
                                .timestamp(LocalDateTime.now())
                                .build()
                );
            }

            log.info("[NOTIFICATION DISPATCHED] To: {}, Title: {}, Type: {}, OrderId: {}",
                    recipient.getEmail(), title, type, orderId);
        } catch (Exception e) {
            log.warn("Không thể phát WebSocket cho người dùng [{}]: {}", recipient.getEmail(), e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getShipperNotifications(User shipper) {
        return getUserNotifications(shipper);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(User user) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(user)
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
    public void markAsRead(User user, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông báo #" + notificationId));

        if (!notification.getRecipient().getUserId().equals(user.getUserId())) {
            throw new IllegalArgumentException("Bạn không có quyền truy cập thông báo này");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(User user) {
        List<Notification> list = notificationRepository.findByRecipientOrderByCreatedAtDesc(user);
        for (Notification n : list) {
            if (Boolean.FALSE.equals(n.getIsRead())) {
                n.setIsRead(true);
            }
        }
        notificationRepository.saveAll(list);
    }
}
