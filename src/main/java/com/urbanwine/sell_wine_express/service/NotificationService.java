package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.respone.NotificationResponse;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.enums.NotificationType;

import java.util.List;

public interface NotificationService {

    void sendNotification(User recipient, String title, String message, NotificationType type, Long orderId);

    List<NotificationResponse> getShipperNotifications(User shipper);

    void markAsRead(User shipper, Long notificationId);
}
