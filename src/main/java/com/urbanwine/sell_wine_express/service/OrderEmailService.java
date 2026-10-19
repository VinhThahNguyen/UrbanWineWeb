package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.Wine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class OrderEmailService {

    private final JavaMailSender mailSender;

    @Value("${app.admin.email:Vnguyenthanh0805@gmail.com}")
    private String adminEmail;

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
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String content = "Kính gửi quý khách " + recipientName + ",\n\n"
                + "Đơn hàng #" + orderCode + " của quý khách đã được Quản lý cửa hàng phê duyệt thành công!\n"
                + "Hệ thống đang tiến hành đóng gói và sẵn sàng bàn giao cho nhân viên giao hàng (Shipper).\n\n"
                + "- Người nhận: " + order.getRecipientName() + " (" + order.getRecipientPhone() + ")\n"
                + "- Địa chỉ giao hàng: " + order.getDeliveryAddress() + "\n"
                + "- Tổng giá trị đơn hàng: " + String.format("%,d VNĐ", order.getTotalAmount().longValue()) + "\n\n"
                + "Cảm ơn quý khách đã tin tưởng và mua sắm tại Urban Wine Express!\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin từ chối đơn hàng PENDING
     */
    public void sendOrderRejectedEmail(Order order, String reason, boolean isPrepaid) {
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Đơn hàng #%s đã bị từ chối phục vụ", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String refundNotice = isPrepaid
                ? "\n* LƯU Ý HOÀN TIỀN: Vì đơn hàng đã được thanh toán online trước qua VNPay, hệ thống đã kích hoạt quy trình hoàn tiền tự động về tài khoản ngân hàng của quý khách."
                : "";

        String content = "Kính gửi quý khách " + recipientName + ",\n\n"
                + "Rất tiếc, đơn hàng #" + orderCode + " của quý khách không thể hoàn tất và đã bị từ chối bởi Quản lý cửa hàng.\n\n"
                + "- Lý do từ chối: " + reason + "\n"
                + "- Tổng giá trị đơn hàng: " + String.format("%,d VNĐ", order.getTotalAmount().longValue()) + refundNotice + "\n\n"
                + "Mọi thắc mắc xin vui lòng liên hệ tổng đài hỗ trợ Urban Wine Express để được giải đáp.\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin chấp thuận yêu cầu hủy đơn hàng PROCESSING của khách
     */
    public void sendCancellationApprovedEmail(Order order, String adminNote, boolean isPrepaid) {
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Yêu cầu hủy đơn hàng #%s đã được chấp thuận", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String refundNotice = isPrepaid
                ? "\n* LƯU Ý HOÀN TIỀN: Vì đơn hàng đã được thanh toán online trước qua VNPay, hệ thống đã kích hoạt quy trình hoàn tiền tự động về tài khoản ngân hàng của quý khách."
                : "";

        String noteSection = (adminNote != null && !adminNote.trim().isEmpty())
                ? "\n- Phản hồi từ Quản lý: " + adminNote
                : "";

        String content = "Kính gửi quý khách " + recipientName + ",\n\n"
                + "Yêu cầu hủy đơn hàng #" + orderCode + " của quý khách đã được Quản lý cửa hàng XÁC NHẬN CHẤP THUẬN.\n"
                + "Đơn hàng đã được chuyển sang trạng thái HỦY và số lượng sản phẩm đã được hoàn trả về kho." + noteSection + refundNotice + "\n\n"
                + "Trân trọng cảm ơn quý khách,\n"
                + "Urban Wine Express Team\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi Admin từ chối yêu cầu hủy đơn hàng PROCESSING của khách (do hàng đã đóng gói)
     */
    public void sendCancellationRejectedEmail(Order order, String adminNote) {
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Phản hồi về yêu cầu hủy đơn hàng #%s", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String noteSection = (adminNote != null && !adminNote.trim().isEmpty())
                ? adminNote
                : "Sản phẩm trong đơn hàng đã hoàn tất đóng gói niêm phong và đang trên đường giao hàng, không thể hủy đơn.";

        String content = "Kính gửi quý khách " + recipientName + ",\n\n"
                + "Yêu cầu hủy đơn hàng #" + orderCode + " của quý khách đã bị TỪ CHỐI bởi Quản lý cửa hàng.\n"
                + "- Lý do từ chối: " + noteSection + "\n\n"
                + "Đơn hàng vẫn đang tiếp tục được vận chuyển tới quý khách. Quý khách vui lòng chú ý điện thoại để nhận hàng.\n\n"
                + "Trân trọng,\n"
                + "Urban Wine Express Team\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * UC_2.1.3 BR-06: Gửi email cảnh báo tồn kho thấp cho Admin khi số lượng tồn kho <= 5 chai.
     */
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
    public void sendDeliverySuccessEmail(Order order) {
        if (order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            return;
        }
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Đơn hàng #%s đã được giao thành công", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String content = "Kính gửi quý khách " + recipientName + ",\n\n"
                + "Đơn hàng #" + orderCode + " của quý khách đã được nhân viên giao hàng (Shipper) giao thành công!\n\n"
                + "- Người nhận: " + order.getRecipientName() + " (" + order.getRecipientPhone() + ")\n"
                + "- Địa chỉ nhận: " + order.getDeliveryAddress() + "\n"
                + "- Tổng tiền đơn hàng: " + String.format("%,d VNĐ", order.getTotalAmount().longValue()) + "\n\n"
                + "Urban Wine Express chân thành cảm ơn quý khách đã tin tưởng và ủng hộ chúng tôi. Chúc quý khách có những trải nghiệm tuyệt vời khi thưởng thức sản phẩm!\n";

        sendEmail(toEmail, subject, content);
    }

    /**
     * Gửi email thông báo khi đơn hàng giao thất bại và bị hủy
     */
    public void sendDeliveryFailedEmail(Order order, String reason, boolean isPrepaid) {
        if (order.getCustomer() == null || order.getCustomer().getEmail() == null) {
            return;
        }
        String toEmail = order.getCustomer().getEmail();
        String orderCode = String.format("ORD-%06d", order.getOrderId());
        String subject = String.format("[Urban Wine Express] Thông báo giao hàng không thành công cho đơn hàng #%s", orderCode);
        String recipientName = order.getCustomer().getFullName() != null ? order.getCustomer().getFullName() : order.getRecipientName();

        String refundNotice = isPrepaid
                ? "\n* LƯU Ý HOÀN TIỀN: Vì đơn hàng đã được thanh toán online trước qua VNPay, hệ thống đã tự động kích hoạt quy trình hoàn tiền về tài khoản ngân hàng của quý khách."
                : "";

        String content = "Kính gửi quý khách " + recipientName + ",\n\n"
                + "Rất tiếc, đơn hàng #" + orderCode + " của quý khách không thể hoàn tất giao hàng và đã được chuyển sang trạng thái HỦY.\n\n"
                + "- Lý do không giao được: " + reason + "\n"
                + "- Tổng tiền đơn hàng: " + String.format("%,d VNĐ", order.getTotalAmount().longValue()) + refundNotice + "\n\n"
                + "Nếu quý khách vẫn muốn nhận đơn hàng này hoặc cần hỗ trợ thêm, vui lòng liên hệ ngay với tổng đài CSKH của Urban Wine Express.\n\n"
                + "Trân trọng,\n"
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
