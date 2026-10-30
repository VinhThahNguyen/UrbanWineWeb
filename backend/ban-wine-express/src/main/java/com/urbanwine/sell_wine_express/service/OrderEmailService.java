package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.Wine;

public interface OrderEmailService {

    void sendOrderApprovedEmail(Order order);

    void sendOrderRejectedEmail(Order order, String reason, boolean isPrepaid);

    void sendCancellationApprovedEmail(Order order, String adminNote, boolean isPrepaid);

    void sendCancellationRejectedEmail(Order order, String adminNote);

    void sendLowStockAlertEmail(Wine wine);

    void sendDeliverySuccessEmail(Order order);

    void sendDeliveryFailedEmail(Order order, String reason, boolean isPrepaid);
}
