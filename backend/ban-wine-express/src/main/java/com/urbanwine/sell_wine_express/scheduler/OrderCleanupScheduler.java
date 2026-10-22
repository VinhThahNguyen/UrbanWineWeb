package com.urbanwine.sell_wine_express.scheduler;

import com.urbanwine.sell_wine_express.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderCleanupScheduler {

    private final OrderService orderService;

    /**
     * Tự động quét mỗi 60 giây (1 phút) để tìm và hủy các đơn hàng PENDING
     * đã quá hạn 15 phút chưa thanh toán, đồng thời cộng hoàn trả lại số lượng rượu vào kho.
     */
    @Scheduled(fixedRate = 60000)
    public void scheduleExpiredOrderCleanup() {
        try {
            orderService.cancelExpiredPendingOrders();
        } catch (Exception e) {
            log.error("Lỗi khi thực thi tiến trình tự động hủy đơn hết hạn và hoàn kho: {}", e.getMessage(), e);
        }
    }
}
