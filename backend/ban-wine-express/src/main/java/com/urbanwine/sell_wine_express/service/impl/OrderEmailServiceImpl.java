package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.service.OrderEmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class OrderEmailServiceImpl implements OrderEmailService {

    private final JavaMailSender mailSender;

    @Value("${app.admin.email:Vnguyenthanh0805@gmail.com}")
    private String adminEmail;

    public OrderEmailServiceImpl(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Gửi email thông báo khi Admin phê duyệt đơn hàng PENDING -> PROCESSING
     */
    @Override
    public void sendOrderApprovedEmail(Order order) {
        if (order == null || order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            log.info("Bỏ qua gửi email phê duyệt: Đơn hàng không có thông tin email khách hàng.");
            return;
        }
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Order #%s Confirmed", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String content = "Dear " + recipientName + ",\n\n"
                + "Your order #" + orderCode + " has been confirmed!\n"
                + "We are packing your wine and preparing it for delivery.\n\n"
                + "- Recipient: " + order.getRecipientName() + " (" + order.getRecipientPhone() + ")\n"
                + "- Delivery Address: " + order.getDeliveryAddress() + "\n"
                + "- Total Amount: " + String.format("%,d VND", order.getTotalAmount().longValue()) + "\n\n"
                + "Thank you for shopping at Urban Wine Express!\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin từ chối đơn hàng PENDING
     */
    @Override
    public void sendOrderRejectedEmail(Order order, String reason, boolean isPrepaid) {
        if (order == null || order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            log.info("Bỏ qua gửi email từ chối: Đơn hàng không có thông tin email khách hàng.");
            return;
        }
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Order #%s Has Been Cancelled", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String refundNotice = isPrepaid
                ? "\n* REFUND NOTICE: As this order was paid online via VNPay, a full refund has been initiated to your bank account."
                : "";

        String content = "Dear " + recipientName + ",\n\n"
                + "We are sorry to inform you that order #" + orderCode + " could not be fulfilled.\n\n"
                + "- Reason: " + reason + "\n"
                + "- Total Amount: " + String.format("%,d VND", order.getTotalAmount().longValue()) + refundNotice + "\n\n"
                + "Please contact Urban Wine Express support if you have any questions.\n\nBest regards,\nUrban Wine Express Team\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin chấp thuận yêu cầu hủy đơn hàng PROCESSING của khách
     */
    @Override
    public void sendCancellationApprovedEmail(Order order, String adminNote, boolean isPrepaid) {
        if (order == null || order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            log.info("Bỏ qua gửi email xác nhận hủy: Đơn hàng không có thông tin email khách hàng.");
            return;
        }
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Cancellation Request Approved for Order #%s", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String refundNotice = isPrepaid
                ? "\n* REFUND NOTICE: A full refund has been initiated to your bank account."
                : "";

        String noteSection = (adminNote != null && !adminNote.trim().isEmpty())
                ? "\n- Store Note: " + adminNote
                : "";

        String content = "Dear " + recipientName + ",\n\n"
                + "Your cancellation request for order #" + orderCode + " has been approved.\n"
                + "The order has been cancelled and items returned to stock." + noteSection + refundNotice + "\n\n"
                + "Best regards,\n"
                + "Urban Wine Express Team\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin từ chối yêu cầu hủy đơn hàng PROCESSING của khách (do hàng đã đóng gói)
     */
    @Override
    public void sendCancellationRejectedEmail(Order order, String adminNote) {
        if (order == null || order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            log.info("Bỏ qua gửi email phản hồi từ chối hủy: Đơn hàng không có thông tin email khách hàng.");
            return;
        }
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Update on Cancellation Request for Order #%s", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String noteSection = (adminNote != null && !adminNote.trim().isEmpty())
                ? adminNote
                : "Order has already been packed and is on the way for delivery.";

        String content = "Dear " + recipientName + ",\n\n"
                + "Your cancellation request for order #" + orderCode + " was declined.\n"
                + "- Reason: " + noteSection + "\n\n"
                + "Your order is continuing to be delivered. Please keep your phone available to receive your order.\n\n"
                + "Best regards,\n"
                + "Urban Wine Express Team\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * UC_2.1.3 BR-06: Gửi email cảnh báo tồn kho thấp cho Admin khi số lượng tồn kho <= 5 chai.
     */
    @Override
    public void sendLowStockAlertEmail(Wine wine) {
        String recipient = (adminEmail != null && !adminEmail.trim().isEmpty()) ? adminEmail.trim() : "Vnguyenthanh0805@gmail.com";
        String subject = String.format("[CẢNH BÁO TỒN KHO] Sản phẩm \"%s\" sắp hết hàng!", wine.getWineName());
        String categoryName = wine.getCategory() != null ? wine.getCategory().getCategoryName() : "Không xác định";
        int stock = wine.getStockQuantity() != null ? wine.getStockQuantity() : 0;

        String content = "Chào Admin,\n\n"
                + "Sản phẩm \"" + wine.getWineName() + "\" (Mã ID: " + wine.getWineId() + ") thuộc danh mục \"" + categoryName + "\" hiện chỉ còn " + stock + " chai trong kho.\n\n"
                + "Vui lòng nhanh chóng nhập thêm hàng vào kho!\n";

        sendEmail(recipient, subject, content);
    }

    /**
     * Gửi email thông báo khi đơn hàng được giao thành công cho khách hàng
     */
    @Override
    public void sendDeliverySuccessEmail(Order order) {
        if (order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            return;
        }
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Order #%s Delivered Successfully", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String content = "Dear " + recipientName + ",\n\n"
                + "Your order #" + orderCode + " has been delivered successfully!\n\n"
                + "- Recipient: " + order.getRecipientName() + " (" + order.getRecipientPhone() + ")\n"
                + "- Delivery Address: " + order.getDeliveryAddress() + "\n"
                + "- Total Amount: " + String.format("%,d VND", order.getTotalAmount().longValue()) + "\n\n"
                + "Thank you for choosing Urban Wine Express. Enjoy your wine!\n\n"
                + "Best regards,\n"
                + "Urban Wine Express Team\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi đơn hàng giao thất bại và bị hủy
     */
    @Override
    public void sendDeliveryFailedEmail(Order order, String reason, boolean isPrepaid) {
        if (order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            return;
        }
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Delivery Unsuccessful for Order #%s", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String refundNotice = isPrepaid
                ? "\n* REFUND NOTICE: A full refund has been initiated to your bank account."
                : "";

        String content = "Dear " + recipientName + ",\n\n"
                + "We are sorry to inform you that delivery for order #" + orderCode + " could not be completed and the order has been cancelled.\n\n"
                + "- Reason: " + reason + "\n"
                + "- Total Amount: " + String.format("%,d VND", order.getTotalAmount().longValue()) + refundNotice + "\n\n"
                + "If you still wish to receive this order or need assistance, please contact our support team.\n\n"
                + "Best regards,\n"
                + "Urban Wine Express Team\n";

        sendEmail(toEmail, subject, content);
    }

    private void sendEmail(String toEmail, String subject, String content) {
        if (mailSender != null) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(toEmail);
                message.setSubject(subject);
                message.setText(content);
                mailSender.send(message);
                log.info("Đã gửi email thông báo thành công tới: [{}] - Tiêu đề: [{}]", toEmail, subject);
                return;
            } catch (Exception e) {
                log.warn("Không thể gửi email qua Gmail SMTP tới [{}]: {}. Đang ghi nhận nội dung vào log hệ thống.", toEmail, e.getMessage());
            }
        }

        // Log dự phòng khi không kết nối được Mail Server
        log.info("=================================================================");
        log.info(">>> [MOCK EMAIL] GỬI TỚI: [{}] <<<", toEmail);
        log.info(">>> TIÊU ĐỀ: [{}] <<<", subject);
        log.info(">>> NỘI DUNG:\n{}", content);
        log.info("=================================================================");
    }
}

