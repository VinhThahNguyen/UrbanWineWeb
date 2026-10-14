package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.entity.Order;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class OrderEmailService {

    private final JavaMailSender mailSender;

    public OrderEmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Gửi email thông báo khi Admin phê duyệt đơn hàng PENDING -> PROCESSING
     */
    public void sendOrderApprovedEmail(Order order) {
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Đơn hàng #%s đã được phê duyệt thành công", orderCode);
        String content = String.format("""
                Kính gửi quý khách %s,

                Đơn hàng #%s của quý khách đã được Quản lý cửa hàng phê duyệt thành công!
                Hệ thống đang tiến hành đóng gói và sẵn sàng bàn giao cho nhân viên giao hàng (Shipper).

                - Người nhận: %s (%s)
                - Địa chỉ giao hàng: %s
                - Tổng giá trị đơn hàng: %,d VNĐ

                Cảm ơn quý khách đã tin tưởng và mua sắm tại Urban Wine Express!
                """,
                order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName(),
                orderCode,
                order.getRecipientName(),
                order.getRecipientPhone(),
                order.getDeliveryAddress(),
                order.getTotalAmount().longValue()
        );

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin từ chối đơn hàng PENDING
     */
    public void sendOrderRejectedEmail(Order order, String reason, boolean isPrepaid) {
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Đơn hàng #%s đã bị từ chối phục vụ", orderCode);

        String refundNotice = isPrepaid
                ? "\n* LƯU Ý HOÀN TIỀN: Vì đơn hàng đã được thanh toán online trước qua VNPay, hệ thống đã kích hoạt quy trình hoàn tiền tự động về tài khoản ngân hàng của quý khách."
                : "";

        String content = String.format("""
                Kính gửi quý khách %s,

                Rất tiếc, đơn hàng #%s của quý khách không thể hoàn tất và đã bị từ chối bởi Quản lý cửa hàng.

                - Lý do từ chối: %s
                - Tổng giá trị đơn hàng: %,d VNĐ%s

                Mọi thắc mắc xin vui lòng liên hệ tổng đài hỗ trợ Urban Wine Express để được giải đáp.
                """,
                order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName(),
                orderCode,
                reason,
                order.getTotalAmount().longValue(),
                refundNotice
        );

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin chấp thuận yêu cầu hủy đơn hàng PROCESSING của khách
     */
    public void sendCancellationApprovedEmail(Order order, String adminNote, boolean isPrepaid) {
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Yêu cầu hủy đơn hàng #%s đã được chấp thuận", orderCode);

        String refundNotice = isPrepaid
                ? "\n* LƯU Ý HOÀN TIỀN: Vì đơn hàng đã được thanh toán online trước qua VNPay, hệ thống đã kích hoạt quy trình hoàn tiền tự động về tài khoản ngân hàng của quý khách."
                : "";

        String noteSection = (adminNote != null && !adminNote.isBlank())
                ? "\n- Phản hồi từ Quản lý: " + adminNote
                : "";

        String content = String.format("""
                Kính gửi quý khách %s,

                Yêu cầu hủy đơn hàng #%s của quý khách đã được Quản lý cửa hàng XÁC NHẬN CHẤP THUẬN.
                Đơn hàng đã được chuyển sang trạng thái HỦY và số lượng sản phẩm đã được hoàn trả về kho.%s%s

                Trân trọng cảm ơn quý khách,
                Urban Wine Express Team
                """,
                order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName(),
                orderCode,
                noteSection,
                refundNotice
        );

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin từ chối yêu cầu hủy đơn hàng PROCESSING của khách (do hàng đã đóng gói)
     */
    public void sendCancellationRejectedEmail(Order order, String adminNote) {
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Phản hồi về yêu cầu hủy đơn hàng #%s", orderCode);

        String noteSection = (adminNote != null && !adminNote.isBlank())
                ? adminNote
                : "Sản phẩm trong đơn hàng đã hoàn tất đóng gói niêm phong và đang trên đường giao hàng, không thể hủy đơn.";

        String content = String.format("""
                Kính gửi quý khách %s,

                Yêu cầu hủy đơn hàng #%s của quý khách đã bị TỪ CHỐI bởi Quản lý cửa hàng.
                - Lý do từ chối: %s

                Đơn hàng vẫn đang tiếp tục được vận chuyển tới quý khách. Quý khách vui lòng chú ý điện thoại để nhận hàng.

                Trân trọng,
                Urban Wine Express Team
                """,
                order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName(),
                orderCode,
                noteSection
        );

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
                log.info("Đã gửi email thông báo thành công tới khách hàng: [{}] - Tiêu đề: [{}]", toEmail, subject);
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
