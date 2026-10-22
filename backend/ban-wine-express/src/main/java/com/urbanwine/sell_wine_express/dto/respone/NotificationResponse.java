package com.urbanwine.sell_wine_express.dto.respone;

import com.urbanwine.sell_wine_express.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long notificationId;
    private String title;
    private String message;
    private NotificationType type;
    private Long orderId;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
