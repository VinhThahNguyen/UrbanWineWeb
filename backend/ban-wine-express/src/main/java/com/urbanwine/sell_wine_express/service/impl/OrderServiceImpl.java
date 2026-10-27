package com.urbanwine.sell_wine_express.service.impl;

import com.urbanwine.sell_wine_express.dto.request.CancelOrderRequest;
import com.urbanwine.sell_wine_express.dto.request.CheckoutSummaryRequest;
import com.urbanwine.sell_wine_express.dto.request.OrderItemRequest;
import com.urbanwine.sell_wine_express.dto.request.PlaceOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.CheckoutSummaryResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderItemResponse;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse;
import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.OrderDetail;
import com.urbanwine.sell_wine_express.entity.PaymentTransaction;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.enums.CancelStatus;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.PaymentMethod;
import com.urbanwine.sell_wine_express.enums.PaymentStatus;
import com.urbanwine.sell_wine_express.repository.OrderDetailRepository;
import com.urbanwine.sell_wine_express.repository.OrderRepository;
import com.urbanwine.sell_wine_express.repository.PaymentTransactionRepository;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import com.urbanwine.sell_wine_express.dto.request.RejectOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.service.CartService;
import com.urbanwine.sell_wine_express.service.OrderEmailService;
import com.urbanwine.sell_wine_express.service.OrderService;
import com.urbanwine.sell_wine_express.service.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.urbanwine.sell_wine_express.dto.request.CreateOfflineOrderRequest;
import com.urbanwine.sell_wine_express.dto.request.VietQrWebhookRequest;
import com.urbanwine.sell_wine_express.dto.respone.OfflineOrderResponse;
import com.urbanwine.sell_wine_express.enums.OrderChannel;
import com.urbanwine.sell_wine_express.repository.UserRepository;
import com.urbanwine.sell_wine_express.dto.request.AssignShipperRequest;
import com.urbanwine.sell_wine_express.dto.request.ReviewShipperRejectRequest;
import com.urbanwine.sell_wine_express.dto.request.ShipperRejectOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.ShipperWorkloadResponse;
import com.urbanwine.sell_wine_express.enums.NotificationType;
import com.urbanwine.sell_wine_express.enums.Role;
import com.urbanwine.sell_wine_express.enums.ShipperRejectStatus;
import com.urbanwine.sell_wine_express.service.NotificationService;
import org.springframework.beans.factory.annotation.Value;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final WineRepository wineRepository;
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final CartService cartService;
    private final VnPayService vnPayService;
    private final OrderEmailService orderEmailService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public OrderServiceImpl(WineRepository wineRepository,
                            OrderRepository orderRepository,
                            OrderDetailRepository orderDetailRepository,
                            PaymentTransactionRepository paymentTransactionRepository,
                            CartService cartService,
                            VnPayService vnPayService,
                            OrderEmailService orderEmailService,
                            UserRepository userRepository,
                            NotificationService notificationService) {
        this.wineRepository = wineRepository;
        this.orderRepository = orderRepository;
        this.orderDetailRepository = orderDetailRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.cartService = cartService;
        this.vnPayService = vnPayService;
        this.orderEmailService = orderEmailService;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Value("${vietqr.bank-id:MB}")
    private String vietQrBankId;

    @Value("${vietqr.account-no:0987654321}")
    private String vietQrAccountNo;

    @Value("${vietqr.account-name:URBAN WINE STORE}")
    private String vietQrAccountName;

    // Phí ship nội thành cố định 30.000 VNĐ
    public static final BigDecimal SHIPPING_FEE = new BigDecimal("30000");
    // Thuế VAT 10%
    public static final BigDecimal VAT_RATE = new BigDecimal("0.10");
    // Giới hạn số đơn giao tối đa cùng lúc cho 1 shipper (Ngoại lệ E2)
    public static final int MAX_CONCURRENT_ORDERS_PER_SHIPPER = 5;

    @Override
    public CheckoutSummaryResponse calculateCheckoutSummary(User customer, CheckoutSummaryRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Giỏ hàng phải có ít nhất một sản phẩm");
        }

        // Kiểm tra địa chỉ có thuộc nội thành Hà Nội (E2, BR-02)
        boolean isInnerCity = true;
        if (request.getDeliveryAddress() != null && !request.getDeliveryAddress().isBlank()) {
            isInnerCity = validateInnerCityAddress(request.getDeliveryAddress());
            if (!isInnerCity) {
                throw new IllegalArgumentException("Hệ thống chỉ hỗ trợ giao hàng khu vực nội thành Hà Nội");
            }
        }

        // Kiểm tra tồn kho và tính tiền các món
        List<OrderItemResponse> itemResponses = new ArrayList<>();
        BigDecimal merchandiseSubtotal = BigDecimal.ZERO;

        for (OrderItemRequest itemReq : request.getItems()) {
            Wine wine = wineRepository.findById(itemReq.getWineId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm rượu với ID: " + itemReq.getWineId()));

            if (!Boolean.TRUE.equals(wine.getIsActive())) {
                throw new IllegalArgumentException("Sản phẩm '" + wine.getWineName() + "' hiện không còn kinh doanh");
            }

            // Kiểm tra số lượng tồn kho (E1)
            if (wine.getStockQuantity() < itemReq.getQuantity()) {
                throw new IllegalArgumentException("Sản phẩm '" + wine.getWineName() + "' không đủ số lượng tồn kho. Hiện chỉ còn: " + wine.getStockQuantity());
            }

            BigDecimal lineTotal = wine.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            merchandiseSubtotal = merchandiseSubtotal.add(lineTotal);

            itemResponses.add(OrderItemResponse.builder()
                    .wineId(wine.getWineId())
                    .wineName(wine.getWineName())
                    .imageUrl(wine.getImageUrl())
                    .unitPrice(wine.getPrice())
                    .quantity(itemReq.getQuantity())
                    .subtotal(lineTotal)
                    .vintageYear(wine.getVintageYear())
                    .build());
        }

        BigDecimal vatAmount = merchandiseSubtotal.multiply(VAT_RATE).setScale(0, RoundingMode.HALF_UP);
        BigDecimal totalAmount = merchandiseSubtotal.add(vatAmount).add(SHIPPING_FEE);

        return CheckoutSummaryResponse.builder()
                .deliveryAddress(request.getDeliveryAddress())
                .isInnerCitySupported(isInnerCity)
                .items(itemResponses)
                .merchandiseSubtotal(merchandiseSubtotal)
                .vatAmount(vatAmount)
                .shippingFee(SHIPPING_FEE)
                .totalAmount(totalAmount)
                .build();
    }

    @Override
    @Transactional
    public OrderResponse placeOrder(User customer, PlaceOrderRequest request, HttpServletRequest servletRequest) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Giỏ hàng phải có ít nhất một sản phẩm");
        }

        if (customer == null) {
            throw new IllegalArgumentException("Không xác định được danh tính khách hàng. Vui lòng đăng nhập lại!");
        }

        // 1. Kiểm tra điều kiện tuổi 18+ (PRE-2, BR-01)
        if (customer.getIsOver18() != null && !customer.getIsOver18()) {
            throw new IllegalArgumentException("Khách hàng phải từ 18 tuổi trở lên để mua rượu vang (Quy định BR-01)");
        }

        // 2. Kiểm tra địa chỉ nội thành Hà Nội (BR-02, E2)
        if (!validateInnerCityAddress(request.getDeliveryAddress())) {
            throw new IllegalArgumentException("Địa chỉ giao hàng không hợp lệ. Hệ thống chỉ hỗ trợ giao hàng nội thành Hà Nội");
        }

        // 3. Kiểm tra tồn kho thời gian thực (E1) và tạm giữ tồn kho 15 phút (Soft reservation)
        BigDecimal merchandiseSubtotal = BigDecimal.ZERO;
        List<OrderItemResponse> itemResponses = new ArrayList<>();
        List<PreparedItem> preparedItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            Wine wine = wineRepository.findById(itemReq.getWineId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm rượu với ID: " + itemReq.getWineId()));

            if (!Boolean.TRUE.equals(wine.getIsActive())) {
                throw new IllegalArgumentException("Sản phẩm '" + wine.getWineName() + "' hiện không còn kinh doanh");
            }

            // E1: Kiểm tra đủ tồn kho
            if (wine.getStockQuantity() < itemReq.getQuantity()) {
                throw new IllegalArgumentException("Sản phẩm '" + wine.getWineName() + "' không đủ tồn kho. Hiện còn: " + wine.getStockQuantity());
            }

            BigDecimal lineTotal = wine.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            merchandiseSubtotal = merchandiseSubtotal.add(lineTotal);

            // POST-2: Tạm giữ tồn kho bằng cách trừ số lượng tồn trong 15 phút
            wine.setStockQuantity(wine.getStockQuantity() - itemReq.getQuantity());
            wineRepository.save(wine);

            // UC_2.1.3 BR-06: Tự động gửi email cảnh báo cho Admin khi tồn kho chạm hoặc dưới ngưỡng 5 chai
            if (wine.getStockQuantity() <= 5 && Boolean.TRUE.equals(wine.getIsActive())) {
                orderEmailService.sendLowStockAlertEmail(wine);
            }

            preparedItems.add(new PreparedItem(wine, itemReq.getQuantity(), wine.getPrice(), lineTotal));
        }

        BigDecimal vatAmount = merchandiseSubtotal.multiply(VAT_RATE).setScale(0, RoundingMode.HALF_UP);
        BigDecimal totalAmount = merchandiseSubtotal.add(vatAmount).add(SHIPPING_FEE);

        // 4. POST-1: Tạo đơn hàng mới với trạng thái PENDING
        Order order = new Order();
        order.setCustomer(customer);
        order.setRecipientName(request.getRecipientName().trim());
        order.setRecipientPhone(request.getRecipientPhone().trim());
        order.setDeliveryAddress(request.getDeliveryAddress().trim());
        order.setTotalAmount(totalAmount);
        order.setOrderStatus(OrderStatus.PENDING);
        order.setCreatedAt(LocalDateTime.now());
        Order savedOrder = orderRepository.save(order);

        // 5. Lưu chi tiết đơn hàng (OrderDetails)
        for (PreparedItem prep : preparedItems) {
            OrderDetail orderDetail = new OrderDetail();
            orderDetail.setOrder(savedOrder);
            orderDetail.setWine(prep.wine);
            orderDetail.setQuantity(prep.quantity);
            orderDetail.setUnitPrice(prep.unitPrice);
            orderDetailRepository.save(orderDetail);

            itemResponses.add(OrderItemResponse.builder()
                    .wineId(prep.wine.getWineId())
                    .wineName(prep.wine.getWineName())
                    .imageUrl(prep.wine.getImageUrl())
                    .unitPrice(prep.unitPrice)
                    .quantity(prep.quantity)
                    .subtotal(prep.lineTotal)
                    .vintageYear(prep.wine.getVintageYear())
                    .build());
        }

        // 6. Ghi nhận giao dịch thanh toán (PaymentTransaction)
        PaymentMethod method = (request.getPaymentMethod() != null) ? request.getPaymentMethod() : PaymentMethod.COD;
        PaymentTransaction paymentTransaction = new PaymentTransaction();
        paymentTransaction.setOrder(savedOrder);
        paymentTransaction.setPaymentMethod(method.name());
        paymentTransaction.setPaymentStatus(PaymentStatus.UNPAID);
        paymentTransaction.setCreatedAt(LocalDateTime.now());
        paymentTransactionRepository.save(paymentTransaction);

        // 7. Xóa các sản phẩm đã đặt khỏi giỏ hàng (Cart) của khách hàng (POST-2)
        List<Long> wineIds = request.getItems().stream().map(OrderItemRequest::getWineId).toList();
        cartService.clearPurchasedItems(customer, wineIds);

        // 8. Nếu phương thức là VNPAY: Khởi tạo URL thanh toán VNPay Gateway
        String paymentUrl = null;
        if (method == PaymentMethod.VNPAY) {
            paymentUrl = vnPayService.createPaymentUrl(savedOrder, servletRequest);
        }

        log.info("Đặt hàng thành công! Đơn hàng ID: {}, Phương thức: {}, Khách hàng: {}, Tổng tiền: {} VNĐ",
                savedOrder.getOrderId(), method, customer.getEmail(), totalAmount);

        return OrderResponse.builder()
                .orderId(savedOrder.getOrderId())
                .orderCode(String.format("ORD-%06d", savedOrder.getOrderId()))
                .channelType(OrderChannel.ONLINE)
                .recipientName(savedOrder.getRecipientName())
                .recipientPhone(savedOrder.getRecipientPhone())
                .deliveryAddress(savedOrder.getDeliveryAddress())
                .merchandiseSubtotal(merchandiseSubtotal)
                .vatAmount(vatAmount)
                .shippingFee(SHIPPING_FEE)
                .totalAmount(totalAmount)
                .orderStatus(savedOrder.getOrderStatus())
                .cancelStatus(savedOrder.getCancelStatus())
                .paymentStatus(PaymentStatus.UNPAID)
                .paymentMethod(method)
                .paymentUrl(paymentUrl)
                .createdAt(savedOrder.getCreatedAt())
                .items(itemResponses)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getCustomerOrders(User customer) {
        List<Order> orders = orderRepository.findByCustomerOrderByCreatedAtDesc(customer);
        List<OrderResponse> responses = new ArrayList<>();
        for (Order order : orders) {
            responses.add(mapToOrderResponse(order));
        }
        return responses;
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderDetail(User customer, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (!order.getCustomer().getUserId().equals(customer.getUserId())) {
            throw new IllegalArgumentException("Bạn không có quyền xem thông tin đơn hàng này");
        }

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse getPaymentStatus(User customer, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (!order.getCustomer().getUserId().equals(customer.getUserId())) {
            throw new IllegalArgumentException("Bạn không có quyền xem thông tin thanh toán của đơn hàng này");
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        PaymentStatus paymentStatus = (paymentTx != null) ? paymentTx.getPaymentStatus() : PaymentStatus.UNPAID;
        String bankReceiptCode = (paymentTx != null) ? paymentTx.getBankReceiptCode() : null;

        PaymentMethod paymentMethod = null;
        if (paymentTx != null && paymentTx.getPaymentMethod() != null) {
            try {
                paymentMethod = PaymentMethod.valueOf(paymentTx.getPaymentMethod());
            } catch (Exception ignored) {}
        }

        return PaymentStatusResponse.builder()
                .orderId(order.getOrderId())
                .totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus())
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .bankReceiptCode(bankReceiptCode)
                .isPaid(paymentStatus == PaymentStatus.PAID)
                .createdAt(order.getCreatedAt())
                .build();
    }

    /**
     * Dò chữ 'Hà Nội' hoặc 'Ha Noi' trong chuỗi địa chỉ để xác định giao hàng nội thành
     */
    private boolean validateInnerCityAddress(String address) {
        if (address == null || address.trim().isEmpty()) {
            return false;
        }
        String lower = address.toLowerCase();
        return lower.contains("hà nội") || lower.contains("ha noi");
    }

    private OrderResponse mapToOrderResponse(Order order) {
        List<OrderDetail> details = orderDetailRepository.findByOrder(order);
        List<OrderItemResponse> itemResponses = new ArrayList<>();
        BigDecimal merchandiseSubtotal = BigDecimal.ZERO;

        for (OrderDetail detail : details) {
            BigDecimal lineTotal = detail.getUnitPrice().multiply(BigDecimal.valueOf(detail.getQuantity()));
            merchandiseSubtotal = merchandiseSubtotal.add(lineTotal);

            itemResponses.add(OrderItemResponse.builder()
                    .wineId(detail.getWine().getWineId())
                    .wineName(detail.getWine().getWineName())
                    .imageUrl(detail.getWine().getImageUrl())
                    .unitPrice(detail.getUnitPrice())
                    .quantity(detail.getQuantity())
                    .subtotal(lineTotal)
                    .vintageYear(detail.getWine().getVintageYear())
                    .build());
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        PaymentStatus paymentStatus = (paymentTx != null) ? paymentTx.getPaymentStatus() : PaymentStatus.UNPAID;
        PaymentMethod paymentMethod = null;
        if (paymentTx != null && paymentTx.getPaymentMethod() != null) {
            try {
                paymentMethod = PaymentMethod.valueOf(paymentTx.getPaymentMethod());
            } catch (Exception ignored) {}
        }

        BigDecimal vatAmount = merchandiseSubtotal.multiply(VAT_RATE).setScale(0, RoundingMode.HALF_UP);
        String orderCode = String.format("ORD-%06d", order.getOrderId());

        return OrderResponse.builder()
                .orderId(order.getOrderId())
                .orderCode(orderCode)
                .channelType(order.getChannelType() != null ? order.getChannelType() : OrderChannel.ONLINE)
                .recipientName(order.getRecipientName())
                .recipientPhone(order.getRecipientPhone())
                .deliveryAddress(order.getDeliveryAddress())
                .merchandiseSubtotal(merchandiseSubtotal)
                .vatAmount(vatAmount)
                .shippingFee(order.getChannelType() == OrderChannel.OFFLINE ? BigDecimal.ZERO : SHIPPING_FEE)
                .totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus())
                .cancelStatus(order.getCancelStatus())
                .cancellationReason(order.getCancellationReason())
                .cancelRequestedAt(order.getCancelRequestedAt())
                .approvedAt(order.getApprovedAt())
                .adminNote(order.getAdminNote())
                .shipperId(order.getShipper() != null ? order.getShipper().getUserId() : null)
                .shipperName(order.getShipper() != null ? order.getShipper().getFullName() : null)
                .shipperPhone(order.getShipper() != null ? order.getShipper().getPhoneNumber() : null)
                .assignedAt(order.getAssignedAt())
                .shipperRejectStatus(order.getShipperRejectStatus())
                .shipperRejectReason(order.getShipperRejectReason())
                .shipperRejectRequestedAt(order.getShipperRejectRequestedAt())
                .paymentStatus(paymentStatus)
                .paymentMethod(paymentMethod)
                .completedAt(order.getCompletedAt())
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .build();
    }

    /**
     * POST-2: Hoàn trả số lượng tồn kho (restock) cho các sản phẩm trong đơn hàng
     */
    private void restockOrderItems(Order order) {
        List<OrderDetail> details = orderDetailRepository.findByOrder(order);
        for (OrderDetail detail : details) {
            Wine wine = detail.getWine();
            wine.setStockQuantity(wine.getStockQuantity() + detail.getQuantity());
            wineRepository.save(wine);
            log.info("Hoàn trả kho {} chai '{}' (Tồn mới: {}) cho đơn #{}",
                    detail.getQuantity(), wine.getWineName(), wine.getStockQuantity(), order.getOrderId());
        }
    }

    @Override
    @Transactional
    public void cancelExpiredPendingOrders() {
        // Mốc thời gian 15 phút trước cho đơn Online
        LocalDateTime onlineThreshold = LocalDateTime.now().minusMinutes(15);
        // Mốc thời gian 5 phút trước cho đơn Offline POS tại quầy
        LocalDateTime offlineThreshold = LocalDateTime.now().minusMinutes(5);

        // Lấy tất cả các đơn PENDING tạo trước mốc 5 phút
        List<Order> candidateOrders = orderRepository.findByOrderStatusAndCreatedAtBefore(OrderStatus.PENDING, offlineThreshold);

        if (candidateOrders.isEmpty()) {
            return;
        }

        for (Order order : candidateOrders) {
            boolean isOffline = (order.getChannelType() == OrderChannel.OFFLINE);
            // Nếu là đơn ONLINE nhưng chưa quá 15 phút thì bỏ qua
            if (!isOffline && order.getCreatedAt().isAfter(onlineThreshold)) {
                continue;
            }

            PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
            PaymentStatus paymentStatus = (paymentTx != null) ? paymentTx.getPaymentStatus() : PaymentStatus.UNPAID;

            if (paymentStatus == PaymentStatus.PAID) {
                continue;
            }

            // Chỉ tự động hủy đối với đơn thanh toán online (VNPAY) hoặc đơn tại quầy (VIETQR), không tự động hủy đơn COD
            if (paymentTx != null && PaymentMethod.COD.name().equalsIgnoreCase(paymentTx.getPaymentMethod())) {
                continue;
            }

            // Hoàn trả số lượng tồn kho (restock) cho từng chai rượu trong đơn
            restockOrderItems(order);

            // Chuyển trạng thái đơn sang CANCELLED và cập nhật cancelStatus
            order.setOrderStatus(OrderStatus.CANCELLED);
            order.setCancelStatus(CancelStatus.APPROVED);
            if (isOffline) {
                order.setCancellationReason("Hệ thống tự động hủy đơn tại quầy do quá hạn thanh toán VietQR 5 phút");
            } else {
                order.setCancellationReason("Hệ thống tự động hủy do quá hạn thanh toán 15 phút");
            }
            order.setCancelRequestedAt(LocalDateTime.now());
            orderRepository.save(order);

            log.info("Đơn hàng #{} (Kênh: {}) đã tự động HỦY do quá hạn thanh toán.", order.getOrderId(), order.getChannelType());
        }
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(User customer, Long orderId, CancelOrderRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (!order.getCustomer().getUserId().equals(customer.getUserId())) {
            throw new IllegalArgumentException("Bạn không có quyền thao tác trên đơn hàng này");
        }

        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Đơn hàng này đã được hủy trước đó");
        }

        if (order.getOrderStatus() == OrderStatus.COMPLETED) {
            throw new IllegalArgumentException("Không thể hủy đơn hàng đã hoàn thành");
        }

        if (order.getOrderStatus() == OrderStatus.SHIPPING) {
            throw new IllegalArgumentException("Đơn hàng đang trong quá trình vận chuyển. Quý khách vui lòng liên hệ tổng đài hoặc trao đổi trực tiếp với nhân viên giao hàng để được hỗ trợ (Quy định BR-04)");
        }

        String reason = (request != null && request.getReason() != null) ? request.getReason().trim() : "Khách hàng yêu cầu hủy";

        // Normal Flow: Hủy trực tiếp khi đơn ở trạng thái PENDING
        if (order.getOrderStatus() == OrderStatus.PENDING) {
            order.setOrderStatus(OrderStatus.CANCELLED);
            order.setCancelStatus(CancelStatus.APPROVED);
            order.setCancellationReason(reason);
            order.setCancelRequestedAt(LocalDateTime.now());
            orderRepository.save(order);

            // POST-3: Hoàn lại số lượng tồn kho ngay lập tức
            restockOrderItems(order);

            log.info("Khách hàng {} đã hủy trực tiếp thành công đơn hàng PENDING #{}", customer.getEmail(), orderId);
            return mapToOrderResponse(order);
        }

        // Alternative Flow: Gửi yêu cầu hủy khi đơn ở trạng thái PROCESSING
        if (order.getOrderStatus() == OrderStatus.PROCESSING) {
            if (order.getCancelStatus() == CancelStatus.REQUESTED) {
                throw new IllegalArgumentException("Đơn hàng đã có yêu cầu hủy đang chờ Quản lý cửa hàng xét duyệt");
            }

            order.setCancelStatus(CancelStatus.REQUESTED);
            order.setCancellationReason(reason);
            order.setCancelRequestedAt(LocalDateTime.now());
            orderRepository.save(order);

            log.info("Khách hàng {} đã gửi yêu cầu hủy đơn hàng PROCESSING #{} với lý do: '{}'. Đang chờ Admin duyệt.",
                    customer.getEmail(), orderId, reason);
            return mapToOrderResponse(order);
        }

        throw new IllegalArgumentException("Trạng thái đơn hàng hiện tại không hợp lệ để hủy: " + order.getOrderStatus());
    }

    @Override
    @Transactional
    public OrderResponse resumePayment(User customer, Long orderId, HttpServletRequest servletRequest) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (!order.getCustomer().getUserId().equals(customer.getUserId())) {
            throw new IllegalArgumentException("Bạn không có quyền thực hiện thanh toán cho đơn hàng này");
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        PaymentStatus paymentStatus = (paymentTx != null) ? paymentTx.getPaymentStatus() : PaymentStatus.UNPAID;

        if (paymentStatus == PaymentStatus.PAID) {
            throw new IllegalArgumentException("Đơn hàng này đã được thanh toán thành công, không thể thanh toán lại");
        }

        if (order.getOrderStatus() == OrderStatus.COMPLETED) {
            throw new IllegalArgumentException("Đơn hàng đã hoàn thành");
        }

        if (order.getOrderStatus() == OrderStatus.SHIPPING) {
            throw new IllegalArgumentException("Đơn hàng đang trong quá trình vận chuyển");
        }

        // Trường hợp đơn đã bị CANCELLED (do hết hạn 15 phút hoặc đã hủy trước đó):
        // Đây là flow khôi phục / thanh toán lại: Phải kiểm tra tồn kho thời gian thực (Exception E2)
        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            List<OrderDetail> details = orderDetailRepository.findByOrder(order);

            // Kiểm tra tồn kho từng sản phẩm (E2)
            for (OrderDetail detail : details) {
                Wine wine = detail.getWine();
                if (!Boolean.TRUE.equals(wine.getIsActive())) {
                    throw new IllegalArgumentException("Sản phẩm '" + wine.getWineName() + "' hiện đã ngừng kinh doanh. Quý khách vui lòng tạo đơn mới!");
                }
                if (wine.getStockQuantity() < detail.getQuantity()) {
                    throw new IllegalArgumentException("Sản phẩm '" + wine.getWineName() + "' hiện không đủ số lượng tồn kho (Chỉ còn: " + wine.getStockQuantity() + "). Vui lòng tạo đơn mới với các sản phẩm còn hàng!");
                }
            }

            // Nếu còn đủ hàng, trừ lại tồn kho để giữ chỗ
            for (OrderDetail detail : details) {
                Wine wine = detail.getWine();
                wine.setStockQuantity(wine.getStockQuantity() - detail.getQuantity());
                wineRepository.save(wine);

                // UC_2.1.3 BR-06: Tự động gửi email cảnh báo cho Admin khi tồn kho chạm hoặc dưới ngưỡng 5 chai
                if (wine.getStockQuantity() <= 5 && Boolean.TRUE.equals(wine.getIsActive())) {
                    orderEmailService.sendLowStockAlertEmail(wine);
                }
            }

            // Khôi phục trạng thái đơn hàng sang PENDING
            order.setOrderStatus(OrderStatus.PENDING);
            order.setCancelStatus(CancelStatus.NONE);
            order.setCancellationReason(null);
            order.setCancelRequestedAt(null);
            order.setCreatedAt(LocalDateTime.now()); // Reset mốc 15 phút
            orderRepository.save(order);
        }

        // Tạo URL thanh toán VNPay mới
        String paymentUrl = vnPayService.createPaymentUrl(order, servletRequest);

        // Cập nhật giao dịch thanh toán
        if (paymentTx == null) {
            paymentTx = new PaymentTransaction();
            paymentTx.setOrder(order);
            paymentTx.setPaymentMethod(PaymentMethod.VNPAY.name());
            paymentTx.setPaymentStatus(PaymentStatus.UNPAID);
            paymentTx.setCreatedAt(LocalDateTime.now());
        } else {
            paymentTx.setPaymentMethod(PaymentMethod.VNPAY.name());
            paymentTx.setPaymentStatus(PaymentStatus.UNPAID);
        }
        paymentTransactionRepository.save(paymentTx);

        OrderResponse response = mapToOrderResponse(order);
        response.setPaymentUrl(paymentUrl);
        response.setPaymentMethod(PaymentMethod.VNPAY);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getPendingCancellationOrders() {
        List<Order> orders = orderRepository.findByCancelStatus(CancelStatus.REQUESTED);
        List<OrderResponse> responses = new ArrayList<>();
        for (Order order : orders) {
            responses.add(mapToOrderResponse(order));
        }
        return responses;
    }

    @Override
    @Transactional
    public OrderResponse reviewCancellationRequest(Long orderId, boolean approve, String adminNote) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getCancelStatus() != CancelStatus.REQUESTED) {
            throw new IllegalArgumentException("Đơn hàng này không có yêu cầu hủy nào đang chờ duyệt");
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        boolean isPrepaid = (paymentTx != null && paymentTx.getPaymentStatus() == PaymentStatus.PAID);

        if (approve) {
            order.setOrderStatus(OrderStatus.CANCELLED);
            order.setCancelStatus(CancelStatus.APPROVED);
            order.setAdminNote(adminNote);
            orderRepository.save(order);

            // POST-2: Hoàn trả kho
            restockOrderItems(order);

            // POST-3: Kích hoạt quy trình hoàn tiền cho đơn đã thanh toán online
            if (isPrepaid) {
                vnPayService.refundTransaction(order, adminNote, "Admin");
            }

            log.info("Quản lý đã CHẤP THUẬN yêu cầu hủy đơn hàng #{}. Đã hoàn kho và xử lý hoàn tiền.", orderId);

            // Gửi thông báo cho khách hàng
            orderEmailService.sendCancellationApprovedEmail(order, adminNote, isPrepaid);
        } else {
            order.setCancelStatus(CancelStatus.REJECTED);
            order.setAdminNote(adminNote);
            orderRepository.save(order);
            log.info("Quản lý đã TỪ CHỐI yêu cầu hủy đơn hàng #{}.", orderId);

            // Gửi thông báo từ chối hủy cho khách hàng
            orderEmailService.sendCancellationRejectedEmail(order, adminNote);
        }

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getAdminOrders(OrderStatus status, CancelStatus cancelStatus, boolean all, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Order> orderPage;

        if (status != null) {
            orderPage = orderRepository.findByOrderStatus(status, pageable);
        } else if (cancelStatus != null) {
            orderPage = orderRepository.findByCancelStatus(cancelStatus, pageable);
        } else if (all) {
            orderPage = orderRepository.findAll(pageable);
        } else {
            // Mặc định: Lấy các đơn hàng cần sự chú ý của Quản lý (PENDING hoặc PROCESSING có yêu cầu hủy)
            orderPage = orderRepository.findRequiringAttentionOrders(OrderStatus.PENDING, CancelStatus.REQUESTED, pageable);
        }

        List<OrderResponse> content = orderPage.getContent().stream()
                .map(this::mapToOrderResponse)
                .toList();

        return PageResponse.<OrderResponse>builder()
                .content(content)
                .pageNumber(orderPage.getNumber())
                .pageSize(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .totalPages(orderPage.getTotalPages())
                .isLast(orderPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Map<String, Long> getOrderCounts() {
        java.util.Map<String, Long> counts = new java.util.HashMap<>();
        counts.put("ALL", orderRepository.count());
        counts.put("PENDING", orderRepository.countByOrderStatus(OrderStatus.PENDING));
        counts.put("PROCESSING", orderRepository.countByOrderStatus(OrderStatus.PROCESSING));
        counts.put("SHIPPING", orderRepository.countByOrderStatus(OrderStatus.SHIPPING));
        counts.put("COMPLETED", orderRepository.countByOrderStatus(OrderStatus.COMPLETED));
        counts.put("CANCELLED", orderRepository.countByOrderStatus(OrderStatus.CANCELLED));
        return counts;
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getAdminOrderDetail(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));
        return mapToOrderResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse approveOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getOrderStatus() != OrderStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể phê duyệt đơn hàng đang ở trạng thái Chờ xử lý (PENDING). Trạng thái hiện tại: " + order.getOrderStatus());
        }

        // BR-07: Đơn hàng thanh toán online chỉ được chuyển sang PROCESSING khi đã nhận được xác nhận thanh toán thành công
        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        if (paymentTx != null && PaymentMethod.VNPAY.name().equalsIgnoreCase(paymentTx.getPaymentMethod())) {
            if (paymentTx.getPaymentStatus() != PaymentStatus.PAID) {
                throw new IllegalArgumentException("Đơn hàng thanh toán online chưa hoàn tất giao dịch (Chưa thanh toán), không thể phê duyệt sang trạng thái Đang xử lý theo quy định BR-07");
            }
        }

        order.setOrderStatus(OrderStatus.PROCESSING);
        order.setApprovedAt(LocalDateTime.now());
        orderRepository.save(order);

        log.info("Quản lý đã PHÊ DUYỆT thành công đơn hàng #{}, chuyển trạng thái sang PROCESSING", orderId);

        // Gửi email xác nhận đơn hàng thành công cho khách hàng
        orderEmailService.sendOrderApprovedEmail(order);

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse rejectOrder(Long orderId, RejectOrderRequest request) {
        if (request == null || request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng cung cấp lý do từ chối đơn hàng (Ngoại lệ E2)");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getOrderStatus() != OrderStatus.PENDING) {
            throw new IllegalArgumentException("Chỉ có thể từ chối đơn hàng đang ở trạng thái Chờ xử lý (PENDING). Trạng thái hiện tại: " + order.getOrderStatus());
        }

        String reason = request.getReason().trim();
        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setCancelStatus(CancelStatus.APPROVED);
        order.setCancellationReason(reason);
        order.setAdminNote(reason);
        order.setCancelRequestedAt(LocalDateTime.now());
        orderRepository.save(order);

        // POST-2: Tự động hoàn lại số lượng sản phẩm vào kho
        restockOrderItems(order);

        // POST-3: Kích hoạt quy trình hoàn tiền cho đơn thanh toán online đã trả tiền
        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        boolean isPrepaid = (paymentTx != null && paymentTx.getPaymentStatus() == PaymentStatus.PAID);
        if (isPrepaid) {
            vnPayService.refundTransaction(order, reason, "Admin");
        }

        log.info("Quản lý đã TỪ CHỐI đơn hàng #{} với lý do: '{}'. Đã hoàn kho và xử lý hoàn tiền nếu có.", orderId, reason);

        // Gửi email thông báo từ chối đơn hàng cho khách hàng
        orderEmailService.sendOrderRejectedEmail(order, reason, isPrepaid);

        return mapToOrderResponse(order);
    }

    // =========================================================================
    // UC_2.1.5: CREATE OFFLINE ORDER (BÁN LẺ TẠI QUẦY CHO KHÁCH VÃNG LAI)
    // =========================================================================

    @Override
    @Transactional
    public OfflineOrderResponse createOfflineOrder(CreateOfflineOrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Đơn hàng phải có ít nhất 1 sản phẩm rượu");
        }

        if (request.getPaymentMethod() != PaymentMethod.CASH && request.getPaymentMethod() != PaymentMethod.VIETQR) {
            throw new IllegalArgumentException("Phương thức thanh toán tại quầy chỉ hỗ trợ TIỀN MẶT (CASH) hoặc CHUYỂN KHOẢN (VIETQR)");
        }

        // 1. Kiểm tra tồn kho thời gian thực (E1) và trừ kho ngay lập tức
        BigDecimal merchandiseSubtotal = BigDecimal.ZERO;
        List<OrderItemResponse> itemResponses = new ArrayList<>();
        List<PreparedItem> preparedItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            Wine wine = wineRepository.findById(itemReq.getWineId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm rượu với ID: " + itemReq.getWineId()));

            if (!Boolean.TRUE.equals(wine.getIsActive())) {
                throw new IllegalArgumentException("Sản phẩm '" + wine.getWineName() + "' hiện không còn kinh doanh");
            }

            // E1: Kiểm tra đủ tồn kho
            if (wine.getStockQuantity() < itemReq.getQuantity()) {
                throw new IllegalArgumentException("Sản phẩm '" + wine.getWineName() + "' không đủ tồn kho để bán tại quầy. Hiện còn: " + wine.getStockQuantity());
            }

            BigDecimal lineTotal = wine.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            merchandiseSubtotal = merchandiseSubtotal.add(lineTotal);

            // POST-2: Trừ số lượng tồn kho ngay lập tức
            wine.setStockQuantity(wine.getStockQuantity() - itemReq.getQuantity());
            wineRepository.save(wine);

            // Cảnh báo tồn kho nếu thấp hơn hoặc bằng 5
            if (wine.getStockQuantity() <= 5 && Boolean.TRUE.equals(wine.getIsActive())) {
                orderEmailService.sendLowStockAlertEmail(wine);
            }

            preparedItems.add(new PreparedItem(wine, itemReq.getQuantity(), wine.getPrice(), lineTotal));
        }

        // Tính thuế VAT 10%, phí giao hàng = 0 (BR-03)
        BigDecimal vatAmount = merchandiseSubtotal.multiply(VAT_RATE).setScale(0, RoundingMode.HALF_UP);
        BigDecimal totalAmount = merchandiseSubtotal.add(vatAmount);

        // 2. Xử lý thanh toán Tiền mặt (E2)
        BigDecimal changeAmount = BigDecimal.ZERO;
        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            if (request.getAmountTendered() == null) {
                // Mặc định nhận vừa đủ tiền nếu không nhập số tiền cụ thể
                request.setAmountTendered(totalAmount);
            } else if (request.getAmountTendered().compareTo(totalAmount) < 0) {
                // E2: Tiền khách đưa ít hơn tổng tiền đơn hàng
                throw new IllegalArgumentException("Số tiền khách đưa (" + request.getAmountTendered() + " VNĐ) ít hơn tổng tiền phải trả (" + totalAmount + " VNĐ)");
            }
            changeAmount = request.getAmountTendered().subtract(totalAmount);
        }

        // 3. Khởi tạo đơn hàng OFFLINE cho khách vãng lai
        User guestCustomer = userRepository.findByEmail("guest@urbanwine.com").orElse(null);

        Order order = new Order();
        order.setCustomer(guestCustomer);
        order.setRecipientName("Khách mua tại quầy");
        order.setRecipientPhone("N/A");
        order.setDeliveryAddress("Mua trực tiếp tại quầy Urban Wine");
        order.setTotalAmount(totalAmount);
        order.setChannelType(OrderChannel.OFFLINE);
        order.setAdminNote(request.getNote());
        order.setCreatedAt(LocalDateTime.now());

        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            // POST-1: Thanh toán tiền mặt -> Hoàn tất ngay
            order.setOrderStatus(OrderStatus.COMPLETED);
        } else {
            // Thanh toán VietQR -> Chờ khách quét mã
            order.setOrderStatus(OrderStatus.PENDING);
        }
        Order savedOrder = orderRepository.save(order);

        // 4. Lưu chi tiết OrderDetail
        for (PreparedItem prep : preparedItems) {
            OrderDetail orderDetail = new OrderDetail();
            orderDetail.setOrder(savedOrder);
            orderDetail.setWine(prep.wine);
            orderDetail.setQuantity(prep.quantity);
            orderDetail.setUnitPrice(prep.unitPrice);
            orderDetailRepository.save(orderDetail);

            itemResponses.add(OrderItemResponse.builder()
                    .wineId(prep.wine.getWineId())
                    .wineName(prep.wine.getWineName())
                    .imageUrl(prep.wine.getImageUrl())
                    .unitPrice(prep.unitPrice)
                    .quantity(prep.quantity)
                    .subtotal(prep.lineTotal)
                    .vintageYear(prep.wine.getVintageYear())
                    .build());
        }

        // 5. Lưu PaymentTransaction
        PaymentTransaction paymentTx = new PaymentTransaction();
        paymentTx.setOrder(savedOrder);
        paymentTx.setPaymentMethod(request.getPaymentMethod().name());
        if (request.getPaymentMethod() == PaymentMethod.CASH) {
            paymentTx.setPaymentStatus(PaymentStatus.PAID);
        } else {
            paymentTx.setPaymentStatus(PaymentStatus.UNPAID);
        }
        paymentTx.setCreatedAt(LocalDateTime.now());
        paymentTransactionRepository.save(paymentTx);

        // 6. Sinh mã VietQR nếu là phương thức VIETQR (Alternative Flow)
        String qrCodeUrl = null;
        Integer qrExpiresInSeconds = null;
        if (request.getPaymentMethod() == PaymentMethod.VIETQR) {
            qrCodeUrl = generateVietQrUrl(savedOrder.getOrderId(), totalAmount);
            qrExpiresInSeconds = 300; // 5 phút đếm ngược
        }

        // 7. Tạo nội dung biên lai bán lẻ (Receipt) sẵn sàng in
        String receiptContent = generateReceiptContent(
                savedOrder, itemResponses, merchandiseSubtotal, vatAmount, totalAmount,
                request.getAmountTendered(), changeAmount, request.getPaymentMethod()
        );

        log.info("Tạo đơn hàng tại quầy thành công! ID: #{}, Kênh: OFFLINE, Phương thức: {}, Trạng thái: {}, Tổng tiền: {} VNĐ",
                savedOrder.getOrderId(), request.getPaymentMethod(), savedOrder.getOrderStatus(), totalAmount);

        return OfflineOrderResponse.builder()
                .orderId(savedOrder.getOrderId())
                .orderCode("OFFLINE_" + savedOrder.getOrderId())
                .channelType(OrderChannel.OFFLINE)
                .orderStatus(savedOrder.getOrderStatus())
                .paymentStatus(paymentTx.getPaymentStatus())
                .paymentMethod(request.getPaymentMethod())
                .merchandiseSubtotal(merchandiseSubtotal)
                .vatAmount(vatAmount)
                .shippingFee(BigDecimal.ZERO)
                .totalAmount(totalAmount)
                .amountTendered(request.getAmountTendered())
                .changeAmount(changeAmount)
                .qrCodeUrl(qrCodeUrl)
                .qrExpiresInSeconds(qrExpiresInSeconds)
                .createdAt(savedOrder.getCreatedAt())
                .items(itemResponses)
                .receiptContent(receiptContent)
                .build();
    }

    @Override
    @Transactional
    public OfflineOrderResponse cancelOfflineOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getChannelType() != OrderChannel.OFFLINE) {
            throw new IllegalArgumentException("Chức năng hủy nhanh tại quầy chỉ áp dụng cho đơn hàng OFFLINE");
        }

        if (order.getOrderStatus() == OrderStatus.COMPLETED) {
            throw new IllegalArgumentException("Đơn hàng đã hoàn tất thanh toán, không thể hủy nhanh tại quầy");
        }

        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Đơn hàng này đã được hủy trước đó");
        }

        // Hoàn trả kho ngay lập tức (0s)
        restockOrderItems(order);

        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setCancelStatus(CancelStatus.APPROVED);
        order.setCancellationReason("Nhân viên hủy đơn tại quầy do khách đổi ý hoặc không thể thanh toán");
        order.setCancelRequestedAt(LocalDateTime.now());
        orderRepository.save(order);

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        if (paymentTx != null && paymentTx.getPaymentStatus() == PaymentStatus.UNPAID) {
            paymentTx.setPaymentStatus(PaymentStatus.FAILED);
            paymentTransactionRepository.save(paymentTx);
        }

        log.info("Đã hủy đơn hàng tại quầy #{} và hoàn trả toàn bộ tồn kho thành công.", order.getOrderId());
        return mapToOfflineOrderResponse(order, paymentTx, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public OfflineOrderResponse getOfflineOrderDetail(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getChannelType() != OrderChannel.OFFLINE) {
            throw new IllegalArgumentException("Đơn hàng #" + orderId + " không phải đơn hàng bán lẻ tại quầy (OFFLINE)");
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        return mapToOfflineOrderResponse(order, paymentTx, null, null);
    }

    @Override
    @Transactional
    public OfflineOrderResponse processVietQrWebhook(VietQrWebhookRequest request) {
        Long resolvedOrderId = request.getOrderId();
        if (resolvedOrderId == null && request.getOrderCode() != null) {
            String cleaned = request.getOrderCode().replaceAll("[^0-9]", "");
            if (!cleaned.isEmpty()) {
                resolvedOrderId = Long.parseLong(cleaned);
            }
        }

        if (resolvedOrderId == null) {
            throw new IllegalArgumentException("Không xác định được ID đơn hàng từ thông tin webhook");
        }

        final Long targetOrderId = resolvedOrderId;
        Order order = orderRepository.findById(targetOrderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + targetOrderId));

        if (order.getOrderStatus() == OrderStatus.CANCELLED) {
            throw new IllegalArgumentException("Đơn hàng #" + targetOrderId + " đã bị hủy trước đó do quá hạn hoặc nhân viên đã hủy");
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order)
                .orElseGet(() -> {
                    PaymentTransaction tx = new PaymentTransaction();
                    tx.setOrder(order);
                    tx.setPaymentMethod(PaymentMethod.VIETQR.name());
                    tx.setCreatedAt(LocalDateTime.now());
                    return tx;
                });

        // Cập nhật trạng thái: Nếu là đơn OFFLINE tại quầy -> COMPLETED; Nếu là đơn SHIPPING của Shipper -> giữ nguyên SHIPPING để Shipper bàn giao hàng (UC_2.3.4 Lựa chọn A)
        if (order.getChannelType() == OrderChannel.OFFLINE) {
            order.setOrderStatus(OrderStatus.COMPLETED);
            orderRepository.save(order);
            log.info("Webhook VietQR: Đơn hàng tại quầy #{} đã xác nhận thanh toán thành công qua chuyển khoản ngân hàng!", order.getOrderId());
        } else {
            // Đơn giao hàng của Shipper (UC_2.3.4): Giữ nguyên trạng thái SHIPPING (Lựa chọn A)
            // Bắn thông báo chuông ngay cho Shipper biết tiền đã vào tài khoản
            if (order.getShipper() != null) {
                String notifMsg = String.format("Khách hàng đã thanh toán thành công số tiền %,d VNĐ qua VietQR cho đơn hàng #%d. Vui lòng bàn giao rượu cho khách và xác nhận hoàn tất!",
                        order.getTotalAmount().longValue(), order.getOrderId());
                notificationService.sendNotification(order.getShipper(), "Thanh toán VietQR thành công #" + order.getOrderId(), notifMsg, NotificationType.SYSTEM, order.getOrderId());
            }
            log.info("Webhook VietQR: Đơn hàng giao Shipper #{} đã xác nhận thanh toán thành công! Giữ trạng thái SHIPPING để Shipper bàn giao rượu.", order.getOrderId());
        }

        paymentTx.setPaymentStatus(PaymentStatus.PAID);
        paymentTx.setPaymentMethod(PaymentMethod.VIETQR.name());
        if (request.getReferenceCode() != null) {
            paymentTx.setBankReceiptCode(request.getReferenceCode());
        }
        paymentTransactionRepository.save(paymentTx);

        return mapToOfflineOrderResponse(order, paymentTx, null, null);
    }

    private String generateVietQrUrl(Long orderId, BigDecimal amount) {
        String memo = "WINE" + orderId;
        String bankId = (vietQrBankId != null && !vietQrBankId.isEmpty()) ? vietQrBankId : "MB";
        String accountNo = (vietQrAccountNo != null && !vietQrAccountNo.isEmpty()) ? vietQrAccountNo : "0987654321";
        String accountName = (vietQrAccountName != null && !vietQrAccountName.isEmpty()) ? vietQrAccountName : "URBAN WINE STORE";
        String encodedAccountName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);
        return String.format("https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
                bankId, accountNo, amount.toBigInteger().toString(), memo, encodedAccountName);
    }

    private String generateReceiptContent(Order order, List<OrderItemResponse> items,
                                          BigDecimal subtotal, BigDecimal vat, BigDecimal total,
                                          BigDecimal tendered, BigDecimal change, PaymentMethod method) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        StringBuilder sb = new StringBuilder();
        sb.append("==================================================\n");
        sb.append("                 URBAN WINE STORE                 \n");
        sb.append("          HÓA ĐƠN BÁN LẺ (RETAIL RECEIPT)         \n");
        sb.append("==================================================\n");
        sb.append(String.format("Mã hóa đơn: #OFFLINE-%d\n", order.getOrderId()));
        sb.append("Kênh bán: Bán trực tiếp tại quầy (Takeaway)\n");
        sb.append(String.format("Thời gian: %s\n", order.getCreatedAt() != null ? order.getCreatedAt().format(formatter) : ""));
        sb.append("Khách hàng: Khách vãng lai\n");
        sb.append("--------------------------------------------------\n");
        sb.append(String.format("%-24s %3s %10s %10s\n", "Tên rượu", "SL", "Đơn giá", "Thành tiền"));
        sb.append("--------------------------------------------------\n");

        int index = 1;
        for (OrderItemResponse item : items) {
            String name = item.getWineName();
            if (name.length() > 22) {
                name = name.substring(0, 21) + "..";
            }
            sb.append(String.format("%d. %-21s %3d %,10.0f %,10.0f\n",
                    index++, name, item.getQuantity(), item.getUnitPrice(), item.getSubtotal()));
        }

        sb.append("--------------------------------------------------\n");
        sb.append(String.format("Tiền hàng (Subtotal):               %,14.0f VNĐ\n", subtotal));
        sb.append(String.format("Thuế VAT (10%%):                     %,14.0f VNĐ\n", vat));
        sb.append("Phí vận chuyển:                                  0 VNĐ\n");
        sb.append("--------------------------------------------------\n");
        sb.append(String.format("TỔNG TIỀN THANH TOÁN:               %,14.0f VNĐ\n", total));
        sb.append(String.format("Phương thức: %s\n", method == PaymentMethod.CASH ? "TIỀN MẶT (CASH)" : "CHUYỂN KHOẢN (VIETQR)"));
        if (method == PaymentMethod.CASH && tendered != null) {
            sb.append(String.format("Tiền khách đưa:                     %,14.0f VNĐ\n", tendered));
            sb.append(String.format("Tiền thừa thối lại:                 %,14.0f VNĐ\n", change != null ? change : BigDecimal.ZERO));
        }
        sb.append(String.format("Trạng thái: %s\n", order.getOrderStatus() == OrderStatus.COMPLETED ? "ĐÃ THANH TOÁN" : "CHỜ THANH TOÁN"));
        sb.append("==================================================\n");
        sb.append("  Cảm ơn quý khách! Chúc quý khách ngon miệng!   \n");
        sb.append("==================================================\n");
        return sb.toString();
    }

    private OfflineOrderResponse mapToOfflineOrderResponse(Order order, PaymentTransaction paymentTx, BigDecimal tendered, BigDecimal change) {
        List<OrderDetail> details = orderDetailRepository.findByOrder(order);
        List<OrderItemResponse> itemResponses = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderDetail detail : details) {
            Wine wine = detail.getWine();
            BigDecimal lineTotal = detail.getUnitPrice().multiply(BigDecimal.valueOf(detail.getQuantity()));
            subtotal = subtotal.add(lineTotal);

            itemResponses.add(OrderItemResponse.builder()
                    .wineId(wine.getWineId())
                    .wineName(wine.getWineName())
                    .imageUrl(wine.getImageUrl())
                    .unitPrice(detail.getUnitPrice())
                    .quantity(detail.getQuantity())
                    .subtotal(lineTotal)
                    .vintageYear(wine.getVintageYear())
                    .build());
        }

        BigDecimal vatAmount = subtotal.multiply(VAT_RATE).setScale(0, RoundingMode.HALF_UP);
        PaymentStatus paymentStatus = (paymentTx != null) ? paymentTx.getPaymentStatus() : PaymentStatus.UNPAID;
        PaymentMethod method = PaymentMethod.CASH;
        if (paymentTx != null && paymentTx.getPaymentMethod() != null) {
            try {
                method = PaymentMethod.valueOf(paymentTx.getPaymentMethod());
            } catch (Exception ignored) {}
        }

        String qrUrl = null;
        Integer qrExpires = null;
        if (method == PaymentMethod.VIETQR && order.getOrderStatus() == OrderStatus.PENDING) {
            qrUrl = generateVietQrUrl(order.getOrderId(), order.getTotalAmount());
            qrExpires = 300;
        }

        String receipt = generateReceiptContent(order, itemResponses, subtotal, vatAmount, order.getTotalAmount(), tendered, change, method);

        return OfflineOrderResponse.builder()
                .orderId(order.getOrderId())
                .orderCode("OFFLINE_" + order.getOrderId())
                .channelType(OrderChannel.OFFLINE)
                .orderStatus(order.getOrderStatus())
                .paymentStatus(paymentStatus)
                .paymentMethod(method)
                .merchandiseSubtotal(subtotal)
                .vatAmount(vatAmount)
                .shippingFee(BigDecimal.ZERO)
                .totalAmount(order.getTotalAmount())
                .amountTendered(tendered)
                .changeAmount(change)
                .qrCodeUrl(qrUrl)
                .qrExpiresInSeconds(qrExpires)
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .receiptContent(receipt)
                .build();
    }

    private record PreparedItem(Wine wine, Integer quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}

    // =========================================================================
    // UC_2.1.4: ASSIGN ORDER TO SHIPPER (ĐIỀU PHỐI ĐƠN HÀNG CHO SHIPPER)
    // =========================================================================

    /**
     * UC_2.1.4 Normal Flow - Bước 2 & Ngoại lệ E1:
     * Lấy danh sách nhân viên giao hàng đang trong ca trực (isOnline = true)
     * và thống kê số lượng đơn hàng đang giao hiện tại của từng người.
     */
    @Override
    @Transactional(readOnly = true)
    public List<ShipperWorkloadResponse> getAvailableShippers() {
        List<User> onlineShippers = userRepository.findByRoleAndIsOnlineTrue(Role.ROLE_SHIPPER);
        List<ShipperWorkloadResponse> responses = new ArrayList<>();

        for (User shipper : onlineShippers) {
            long activeOrders = orderRepository.countByShipperAndOrderStatus(shipper, OrderStatus.SHIPPING);
            boolean canAssign = activeOrders < MAX_CONCURRENT_ORDERS_PER_SHIPPER;

            responses.add(ShipperWorkloadResponse.builder()
                    .shipperId(shipper.getUserId())
                    .fullName(shipper.getFullName())
                    .email(shipper.getEmail())
                    .phoneNumber(shipper.getPhoneNumber())
                    .currentActiveOrders(activeOrders)
                    .maxOrders(MAX_CONCURRENT_ORDERS_PER_SHIPPER)
                    .canAssign(canAssign)
                    .isOnline(shipper.getIsOnline())
                    .build());
        }

        return responses;
    }

    /**
     * UC_2.1.4 Normal Flow - Bước 3, 4, 5:
     * Quản lý phân công đơn hàng PROCESSING cho một Shipper đang Online.
     * - PRE-2: Đơn hàng phải đang ở trạng thái PROCESSING.
     * - Ngoại lệ E1: Shipper phải đang Online (isOnline = true).
     * - Ngoại lệ E2: Chặn phân công nếu Shipper đã nhận đủ 5 đơn hàng cùng lúc.
     * - POST-1: Gán shipper_id vào đơn hàng.
     * - POST-2: Cập nhật order_status sang SHIPPING.
     * - POST-3: Gửi thông báo đến tài khoản mobile của Shipper (Lưu bảng Notification + Log).
     */
    @Override
    @Transactional
    public OrderResponse assignShipper(Long orderId, AssignShipperRequest request) {
        if (request == null || request.getShipperId() == null) {
            throw new IllegalArgumentException("Vui lòng chọn nhân viên giao hàng (shipperId)");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        // PRE-2: Đơn hàng phải ở trạng thái PROCESSING (Đã duyệt và sẵn sàng đóng gói giao hàng)
        if (order.getOrderStatus() != OrderStatus.PROCESSING) {
            throw new IllegalArgumentException("Chỉ có thể gán shipper cho đơn hàng đang ở trạng thái Chờ giao hàng (PROCESSING). Trạng thái hiện tại: " + order.getOrderStatus());
        }

        User shipper = userRepository.findById(request.getShipperId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên giao hàng với ID: " + request.getShipperId()));

        if (shipper.getRole() != Role.ROLE_SHIPPER) {
            throw new IllegalArgumentException("Người dùng được chọn không phải là nhân viên giao hàng (ROLE_SHIPPER)");
        }

        // Ngoại lệ E1: Shipper phải đang online trong ca làm việc
        if (!Boolean.TRUE.equals(shipper.getIsOnline())) {
            throw new IllegalArgumentException("Nhân viên giao hàng '" + shipper.getFullName() + "' hiện đang không trong ca trực (Offline). Vui lòng chọn nhân viên đang Online (Ngoại lệ E1)");
        }

        // Ngoại lệ E2: Shipper đã đạt tối đa số đơn cho phép (5 đơn)
        long currentOrders = orderRepository.countByShipperAndOrderStatus(shipper, OrderStatus.SHIPPING);
        if (currentOrders >= MAX_CONCURRENT_ORDERS_PER_SHIPPER) {
            throw new IllegalArgumentException("Shipper '" + shipper.getFullName() + "' đã đạt giới hạn tối đa " + MAX_CONCURRENT_ORDERS_PER_SHIPPER + " đơn hàng đồng thời. Vui lòng chọn nhân viên khác (Ngoại lệ E2)");
        }

        // POST-1: Gán shipper vào đơn hàng
        order.setShipper(shipper);
        // POST-2: Cập nhật trạng thái sang SHIPPING
        order.setOrderStatus(OrderStatus.SHIPPING);
        order.setAssignedAt(LocalDateTime.now());
        if (request.getNote() != null && !request.getNote().isBlank()) {
            order.setAdminNote(request.getNote().trim());
        }
        orderRepository.save(order);

        log.info("Admin đã phân công đơn hàng #{} thành công cho Shipper {} (ID: {})",
                orderId, shipper.getFullName(), shipper.getUserId());

        // POST-3: Gửi thông báo đến tài khoản mobile của Shipper
        String notifMsg = String.format("Bạn vừa được phân công giao đơn hàng #%d. Người nhận: %s (%s). Địa chỉ giao: %s. Tổng tiền thu: %,.0f VNĐ.",
                order.getOrderId(), order.getRecipientName(), order.getRecipientPhone(), order.getDeliveryAddress(), order.getTotalAmount());
        notificationService.sendNotification(shipper, "Nhiệm vụ giao hàng mới #" + order.getOrderId(), notifMsg, NotificationType.ORDER_ASSIGNED, order.getOrderId());

        return mapToOrderResponse(order);
    }

    /**
     * UC_2.1.4 Alternative Flow:
     * Điều phối lại đơn hàng sang một Shipper khác (khi shipper cũ gặp sự cố hoặc cần đổi người).
     * - Chỉ áp dụng cho đơn đang ở trạng thái SHIPPING.
     * - Shipper thay thế phải Online và chưa vượt quá 5 đơn.
     * - Gửi thông báo thu hồi nhiệm vụ cho Shipper cũ (Shipper cũ vẫn online tiếp tục giao các đơn khác).
     * - Gửi thông báo nhiệm vụ mới cho Shipper thay thế.
     */
    @Override
    @Transactional
    public OrderResponse reassignShipper(Long orderId, AssignShipperRequest request) {
        if (request == null || request.getShipperId() == null) {
            throw new IllegalArgumentException("Vui lòng chọn nhân viên giao hàng thay thế (shipperId)");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getOrderStatus() != OrderStatus.SHIPPING) {
            throw new IllegalArgumentException("Chỉ có thể điều phối lại shipper cho đơn hàng đang trong quá trình vận chuyển (SHIPPING). Trạng thái hiện tại: " + order.getOrderStatus());
        }

        User previousShipper = order.getShipper();
        if (previousShipper != null && previousShipper.getUserId().equals(request.getShipperId())) {
            throw new IllegalArgumentException("Shipper được chọn trùng với shipper hiện tại của đơn hàng. Vui lòng chọn shipper thay thế khác!");
        }

        User newShipper = userRepository.findById(request.getShipperId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhân viên giao hàng mới với ID: " + request.getShipperId()));

        if (newShipper.getRole() != Role.ROLE_SHIPPER) {
            throw new IllegalArgumentException("Người dùng được chọn không phải là nhân viên giao hàng");
        }

        if (!Boolean.TRUE.equals(newShipper.getIsOnline())) {
            throw new IllegalArgumentException("Nhân viên giao hàng thay thế '" + newShipper.getFullName() + "' hiện đang không trong ca trực (Offline). Vui lòng chọn nhân viên đang Online (E1)");
        }

        long currentOrders = orderRepository.countByShipperAndOrderStatus(newShipper, OrderStatus.SHIPPING);
        if (currentOrders >= MAX_CONCURRENT_ORDERS_PER_SHIPPER) {
            throw new IllegalArgumentException("Shipper thay thế '" + newShipper.getFullName() + "' đã đạt giới hạn tối đa " + MAX_CONCURRENT_ORDERS_PER_SHIPPER + " đơn hàng. Vui lòng chọn nhân viên khác (E2)");
        }

        // Cập nhật shipper mới cho đơn hàng
        order.setShipper(newShipper);
        order.setAssignedAt(LocalDateTime.now());
        if (request.getNote() != null && !request.getNote().isBlank()) {
            order.setAdminNote(request.getNote().trim());
        }
        orderRepository.save(order);

        log.info("Admin đã điều phối lại đơn hàng #{} từ Shipper {} sang Shipper {}",
                orderId,
                previousShipper != null ? previousShipper.getFullName() : "N/A",
                newShipper.getFullName());

        // Gửi thông báo thu hồi cho Shipper cũ (nếu có)
        if (previousShipper != null) {
            String revokeMsg = String.format("Nhiệm vụ giao đơn hàng #%d đã được điều phối lại cho nhân viên khác. Bạn không cần tiếp tục xử lý đơn này.", order.getOrderId());
            notificationService.sendNotification(previousShipper, "Thu hồi nhiệm vụ giao hàng #" + order.getOrderId(), revokeMsg, NotificationType.ORDER_REASSIGNED, order.getOrderId());
        }

        // Gửi thông báo nhiệm vụ mới cho Shipper mới
        String assignMsg = String.format("Bạn vừa được điều phối nhận lại đơn hàng #%d. Người nhận: %s (%s). Địa chỉ giao: %s. Tổng tiền thu: %,.0f VNĐ.",
                order.getOrderId(), order.getRecipientName(), order.getRecipientPhone(), order.getDeliveryAddress(), order.getTotalAmount());
        notificationService.sendNotification(newShipper, "Nhiệm vụ giao hàng mới #" + order.getOrderId(), assignMsg, NotificationType.ORDER_ASSIGNED, order.getOrderId());

        return mapToOrderResponse(order);
    }

    /**
     * Quy tắc BR-08 (Shipper Order Access):
     * Shipper xem danh sách các đơn hàng được gán cho chính tài khoản của mình.
     */
    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getShipperOrders(User shipper) {
        if (shipper == null || shipper.getRole() != Role.ROLE_SHIPPER) {
            throw new IllegalArgumentException("Bạn không có quyền truy cập danh sách đơn hàng của nhân viên giao hàng");
        }

        List<Order> orders = orderRepository.findByShipperOrderByCreatedAtDesc(shipper);
        return orders.stream().map(this::mapToOrderResponse).toList();
    }

    /**
     * Quy tắc BR-08 (Shipper Order Access):
     * Shipper chỉ được xem chi tiết đơn hàng được gán cho chính tài khoản của mình.
     */
    @Override
    @Transactional(readOnly = true)
    public OrderResponse getShipperOrderDetail(User shipper, Long orderId) {
        if (shipper == null || shipper.getRole() != Role.ROLE_SHIPPER) {
            throw new IllegalArgumentException("Bạn không có quyền truy cập thông tin đơn hàng này");
        }

        Order order = orderRepository.findByOrderIdAndShipper(orderId, shipper)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId + " được phân công cho tài khoản của bạn (Quy tắc BR-08)"));

        return mapToOrderResponse(order);
    }

    // =========================================================================
    // SHIPPER REJECT DELIVERY FLOW (SHIPPER TỪ CHỐI NHẬN ĐƠN / BÁO SỰ CỐ)
    // =========================================================================

    /**
     * 1. Shipper gửi yêu cầu từ chối nhận đơn lên Admin (kèm lý do hỏng xe, sự cố...).
     * - Chỉ áp dụng cho đơn SHIPPING được gán cho chính shipper đó (BR-08).
     * - Đơn chuyển trạng thái shipperRejectStatus = REQUESTED.
     */
    @Override
    @Transactional
    public OrderResponse requestShipperRejectOrder(User shipper, Long orderId, ShipperRejectOrderRequest request) {
        if (request == null || request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng cung cấp lý do từ chối nhận đơn hàng");
        }

        Order order = orderRepository.findByOrderIdAndShipper(orderId, shipper)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId + " được phân công cho tài khoản của bạn (Quy tắc BR-08)"));

        if (order.getOrderStatus() != OrderStatus.SHIPPING) {
            throw new IllegalArgumentException("Chỉ có thể gửi yêu cầu từ chối giao cho đơn hàng đang trong trạng thái SHIPPING. Trạng thái hiện tại: " + order.getOrderStatus());
        }

        if (order.getShipperRejectStatus() == ShipperRejectStatus.REQUESTED) {
            throw new IllegalArgumentException("Đơn hàng này đã có yêu cầu từ chối đang chờ Admin xét duyệt");
        }

        order.setShipperRejectStatus(ShipperRejectStatus.REQUESTED);
        order.setShipperRejectReason(request.getReason().trim());
        order.setShipperRejectRequestedAt(LocalDateTime.now());
        orderRepository.save(order);

        log.info("Shipper {} đã gửi yêu cầu từ chối giao đơn hàng #{} với lý do: '{}'",
                shipper.getFullName(), orderId, request.getReason().trim());

        return mapToOrderResponse(order);
    }

    /**
     * 2. Admin xem danh sách các đơn hàng shipper đang xin từ chối để xử lý khẩn cấp.
     */
    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getPendingShipperRejectOrders() {
        List<Order> orders = orderRepository.findByShipperRejectStatusOrderByShipperRejectRequestedAtDesc(ShipperRejectStatus.REQUESTED);
        return orders.stream().map(this::mapToOrderResponse).toList();
    }

    /**
     * 3. Admin xét duyệt yêu cầu từ chối nhận đơn của Shipper:
     * - TH1 (approved = true): Đồng ý cho rút đơn -> Đơn quay về PROCESSING, gỡ shipper cũ, sẵn sàng gán cho shipper khác.
     *                          Gửi thông báo chấp thuận tới shipper cũ.
     * - TH2 (approved = false): Từ chối yêu cầu -> Đơn giữ nguyên SHIPPING, shipper cũ phải tiếp tục giao.
     *                           Gửi thông báo từ chối kèm lời nhắn tới shipper.
     */
    @Override
    @Transactional
    public OrderResponse reviewShipperRejectOrder(Long orderId, ReviewShipperRejectRequest request) {
        if (request == null || request.getApproved() == null) {
            throw new IllegalArgumentException("Vui lòng xác định quyết định phê duyệt (true: đồng ý rút đơn, false: từ chối)");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getShipperRejectStatus() != ShipperRejectStatus.REQUESTED) {
            throw new IllegalArgumentException("Đơn hàng #" + orderId + " hiện không có yêu cầu từ chối nhận đơn nào đang chờ duyệt");
        }

        User currentShipper = order.getShipper();
        String adminNote = (request.getAdminNote() != null) ? request.getAdminNote().trim() : "";

        if (Boolean.TRUE.equals(request.getApproved())) {
            // TH1: Admin đồng ý cho rút đơn
            order.setOrderStatus(OrderStatus.PROCESSING);
            order.setShipper(null);
            order.setShipperRejectStatus(ShipperRejectStatus.APPROVED);
            order.setAdminNote(adminNote.isEmpty() ? "Admin đã chấp thuận yêu cầu rút đơn của shipper" : adminNote);
            orderRepository.save(order);

            log.info("Admin đã CHẤP THUẬN yêu cầu từ chối giao đơn #{} của Shipper {}",
                    orderId, currentShipper != null ? currentShipper.getFullName() : "N/A");

            // Gửi thông báo đến Shipper
            if (currentShipper != null) {
                String msg = "Admin đã chấp thuận yêu cầu không nhận đơn hàng #" + orderId + " của bạn. Đơn hàng đã được rút lại thành công.";
                notificationService.sendNotification(currentShipper, "Yêu cầu từ chối đơn hàng #" + orderId + " được chấp thuận", msg, NotificationType.ORDER_REASSIGNED, orderId);
            }
        } else {
            // TH2: Admin từ chối yêu cầu, shipper phải tiếp tục giao đơn
            order.setShipperRejectStatus(ShipperRejectStatus.REJECTED);
            order.setAdminNote(adminNote.isEmpty() ? "Admin yêu cầu tiếp tục giao đơn hàng này" : adminNote);
            orderRepository.save(order);

            log.info("Admin đã TỪ CHỐI yêu cầu rút đơn #{} của Shipper {}",
                    orderId, currentShipper != null ? currentShipper.getFullName() : "N/A");

            // Gửi thông báo đến Shipper yêu cầu giao tiếp
            if (currentShipper != null) {
                String msg = "Admin đã từ chối yêu cầu hủy đơn hàng #" + orderId + " của bạn. " + (adminNote.isEmpty() ? "" : "Ghi chú: " + adminNote + ". ") + "Vui lòng tiếp tục giao đơn hàng này.";
                notificationService.sendNotification(currentShipper, "Yêu cầu từ chối đơn hàng #" + orderId + " không được chấp thuận", msg, NotificationType.SYSTEM, orderId);
            }
        }

        return mapToOrderResponse(order);
    }

    // =========================================================================
    // UC_2.3.2: UPDATE DELIVERY STATUS (CẬP NHẬT TRẠNG THÁI GIAO HÀNG CỦA SHIPPER)
    // =========================================================================

    @Override
    @Transactional
    public OrderResponse completeDelivery(User shipper, Long orderId) {
        if (shipper == null) {
            throw new IllegalArgumentException("Thông tin nhân viên giao hàng không hợp lệ");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        // BR-08 & E1: Chỉ shipper được chính thức phân công mới có quyền cập nhật
        if (order.getShipper() == null || !order.getShipper().getUserId().equals(shipper.getUserId())) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId + " được phân công cho tài khoản của bạn (Quy tắc BR-08)");
        }

        // PRE-2: Đơn hàng phải ở trạng thái SHIPPING
        if (order.getOrderStatus() != OrderStatus.SHIPPING) {
            throw new IllegalArgumentException("Chỉ có thể xác nhận hoàn thành cho đơn hàng đang ở trạng thái Đang giao (SHIPPING). Trạng thái hiện tại: " + order.getOrderStatus());
        }

        // BR-09: Tự động quyết toán thanh toán COD -> PAID
        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        if (paymentTx != null && PaymentMethod.COD.name().equalsIgnoreCase(paymentTx.getPaymentMethod())) {
            if (paymentTx.getPaymentStatus() == PaymentStatus.UNPAID) {
                paymentTx.setPaymentStatus(PaymentStatus.PAID);
                paymentTransactionRepository.save(paymentTx);
                log.info("Đơn hàng COD #{} đã được Shipper '{}' thu tiền và cập nhật trạng thái thanh toán sang PAID (BR-09)",
                        orderId, shipper.getFullName());
            }
        }

        // POST-1: Cập nhật orderStatus = COMPLETED, ghi nhận completedAt, tồn kho không đổi
        order.setOrderStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        orderRepository.save(order);

        log.info("Shipper '{}' (ID: {}) đã hoàn thành giao đơn hàng #{}.",
                shipper.getFullName(), shipper.getUserId(), orderId);

        // Gửi thông báo cho Store Manager / Admin
        List<User> admins = userRepository.findByRole(Role.ROLE_ADMIN);
        String adminNotifMsg = String.format("Đơn hàng #%d đã được Shipper %s giao thành công cho khách hàng.",
                orderId, shipper.getFullName());
        for (User admin : admins) {
            notificationService.sendNotification(admin, "Đơn hàng #" + orderId + " giao thành công", adminNotifMsg, NotificationType.DELIVERY_COMPLETED, orderId);
        }

        // Gửi thông báo cho Shipper
        notificationService.sendNotification(shipper, "Giao hàng thành công #" + orderId,
                "Bạn đã hoàn thành giao đơn hàng #" + orderId + ". Cảm ơn bạn!", NotificationType.DELIVERY_COMPLETED, orderId);

        // Gửi email cho khách hàng
        orderEmailService.sendDeliverySuccessEmail(order);

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse failDelivery(User shipper, Long orderId, com.urbanwine.sell_wine_express.dto.request.FailDeliveryRequest request) {
        if (shipper == null) {
            throw new IllegalArgumentException("Thông tin nhân viên giao hàng không hợp lệ");
        }

        if (request == null || request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Lý do giao hàng thất bại không được để trống (Quy tắc E2)");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        // BR-08 & E1: Chỉ shipper được chính thức phân công mới có quyền cập nhật
        if (order.getShipper() == null || !order.getShipper().getUserId().equals(shipper.getUserId())) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId + " được phân công cho tài khoản của bạn (Quy tắc BR-08)");
        }

        // PRE-2: Đơn hàng phải ở trạng thái SHIPPING
        if (order.getOrderStatus() != OrderStatus.SHIPPING) {
            throw new IllegalArgumentException("Chỉ có thể báo giao thất bại cho đơn hàng đang ở trạng thái Đang giao (SHIPPING). Trạng thái hiện tại: " + order.getOrderStatus());
        }

        // BR-04 & POST-2: Cập nhật orderStatus = CANCELLED, lưu lý do thất bại
        String reason = request.getReason().trim();
        order.setOrderStatus(OrderStatus.CANCELLED);
        order.setCancellationReason("Giao hàng thất bại: " + reason);
        order.setCancelStatus(CancelStatus.APPROVED);
        order.setCancelRequestedAt(LocalDateTime.now());
        orderRepository.save(order);

        // POST-2: Tự động hoàn trả sản phẩm về kho (restock)
        restockOrderItems(order);

        // POST-2 & Alt Flow 5: Kiểm tra hoàn tiền nếu là đơn trả trước online
        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        boolean isPrepaid = (paymentTx != null && paymentTx.getPaymentStatus() == PaymentStatus.PAID);
        if (isPrepaid) {
            vnPayService.refundTransaction(order, "Giao hàng thất bại: " + reason, "Shipper: " + shipper.getFullName());
            log.info("Kích hoạt hoàn tiền VNPAY cho đơn hàng #{} bị giao thất bại", orderId);
        }

        log.warn("Shipper '{}' (ID: {}) báo GIAO THẤT BẠI đơn hàng #{}. Lý do: '{}'. Đã hủy đơn và hoàn kho.",
                shipper.getFullName(), shipper.getUserId(), orderId, reason);

        // Gửi thông báo cho Store Manager / Admin
        List<User> admins = userRepository.findByRole(Role.ROLE_ADMIN);
        String adminNotifMsg = String.format("Shipper %s báo giao hàng thất bại đơn hàng #%d. Lý do: %s. Hàng đã được tự động hoàn kho.",
                shipper.getFullName(), orderId, reason);
        for (User admin : admins) {
            notificationService.sendNotification(admin, "Giao thất bại đơn hàng #" + orderId, adminNotifMsg, NotificationType.DELIVERY_FAILED, orderId);
        }

        // Gửi thông báo cho Shipper
        notificationService.sendNotification(shipper, "Đã ghi nhận giao thất bại #" + orderId,
                "Đơn hàng #" + orderId + " đã được cập nhật giao thất bại và hoàn trả về kho.", NotificationType.DELIVERY_FAILED, orderId);

        // Gửi email cho khách hàng
        orderEmailService.sendDeliveryFailedEmail(order, reason, isPrepaid);

        return mapToOrderResponse(order);
    }

    // =========================================================================
    // UC_2.3.4: DISPLAY PAYMENT METHOD (HIỂN THỊ VIETQR ĐỘNG CHO SHIPPER THU TIỀN TẠI CHỖ)
    // =========================================================================

    @Override
    @Transactional
    public com.urbanwine.sell_wine_express.dto.respone.ShipperVietQrResponse generateShipperVietQr(User shipper, Long orderId) {
        if (shipper == null) {
            throw new IllegalArgumentException("Thông tin nhân viên giao hàng không hợp lệ");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        // BR-08 & PRE-2: Kiểm tra đơn hàng có được phân công cho shipper này không
        if (order.getShipper() == null || !order.getShipper().getUserId().equals(shipper.getUserId())) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId + " được phân công cho tài khoản của bạn (Quy tắc BR-08)");
        }

        // PRE-2: Đơn hàng phải đang ở trạng thái SHIPPING
        if (order.getOrderStatus() != OrderStatus.SHIPPING) {
            throw new IllegalArgumentException("Chỉ có thể tạo mã thanh toán VietQR cho đơn hàng đang ở trạng thái Đang giao (SHIPPING). Trạng thái hiện tại: " + order.getOrderStatus());
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order)
                .orElseGet(() -> {
                    PaymentTransaction tx = new PaymentTransaction();
                    tx.setOrder(order);
                    tx.setPaymentMethod(PaymentMethod.COD.name());
                    tx.setPaymentStatus(PaymentStatus.UNPAID);
                    tx.setCreatedAt(LocalDateTime.now());
                    return paymentTransactionRepository.save(tx);
                });

        // Ngoại lệ E1: Đơn hàng đã được thanh toán online trước (số tiền cần thu là 0)
        if (paymentTx.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalArgumentException("Đơn hàng #" + orderId + " đã được thanh toán từ trước (Số tiền cần thu: 0 VNĐ). Vui lòng bàn giao hàng cho khách mà không cần thu thêm tiền (Quy tắc E1)");
        }

        // Sinh link mã VietQR động chuẩn Napas 247
        String qrUrl = generateVietQrUrl(order.getOrderId(), order.getTotalAmount());
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);
        long expiresInSeconds = 900L;

        // Cập nhật phương thức sang VIETQR
        paymentTx.setPaymentMethod(PaymentMethod.VIETQR.name());
        paymentTransactionRepository.save(paymentTx);

        log.info("Shipper '{}' (ID: {}) đã tạo mã VietQR động cho đơn hàng #{}, số tiền thu: {} VNĐ",
                shipper.getFullName(), shipper.getUserId(), orderId, order.getTotalAmount());

        return com.urbanwine.sell_wine_express.dto.respone.ShipperVietQrResponse.builder()
                .orderId(order.getOrderId())
                .orderCode(String.format("ORD-%06d", order.getOrderId()))
                .amountToCollect(order.getTotalAmount())
                .bankId(vietQrBankId != null ? vietQrBankId : "MB")
                .accountNo(vietQrAccountNo != null ? vietQrAccountNo : "0987654321")
                .accountName(vietQrAccountName != null ? vietQrAccountName : "URBAN WINE STORE")
                .transferMemo("WINE" + order.getOrderId())
                .qrCodeUrl(qrUrl)
                .paymentStatus(paymentTx.getPaymentStatus())
                .expiresAt(expiresAt)
                .expiresInSeconds(expiresInSeconds)
                .message("Vui lòng hướng dẫn khách hàng mở App Ngân hàng quét mã VietQR để thanh toán đúng số tiền.")
                .build();
    }

    @Override
    @Transactional
    public OrderResponse cancelShipperVietQr(User shipper, Long orderId) {
        if (shipper == null) {
            throw new IllegalArgumentException("Thông tin nhân viên giao hàng không hợp lệ");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        // BR-08: Kiểm tra quyền truy cập đơn của shipper
        if (order.getShipper() == null || !order.getShipper().getUserId().equals(shipper.getUserId())) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId + " được phân công cho tài khoản của bạn (Quy tắc BR-08)");
        }

        if (order.getOrderStatus() != OrderStatus.SHIPPING) {
            throw new IllegalArgumentException("Chỉ có thể chuyển đổi phương thức thanh toán cho đơn hàng đang ở trạng thái Đang giao (SHIPPING)");
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        if (paymentTx != null && paymentTx.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalArgumentException("Đơn hàng #" + orderId + " đã được thanh toán thành công qua chuyển khoản, không thể hủy phiên thanh toán QR");
        }

        if (paymentTx != null) {
            paymentTx.setPaymentMethod(PaymentMethod.COD.name());
            paymentTransactionRepository.save(paymentTx);
        }

        log.info("Shipper '{}' đã hủy phiên thanh toán VietQR cho đơn #{}, chuyển về thu tiền mặt trực tiếp (Alternative Flow)",
                shipper.getFullName(), orderId);

        return mapToOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse getShipperPaymentStatus(User shipper, Long orderId) {
        if (shipper == null) {
            throw new IllegalArgumentException("Thông tin nhân viên giao hàng không hợp lệ");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId));

        // BR-08: Kiểm tra quyền truy cập
        if (order.getShipper() == null || !order.getShipper().getUserId().equals(shipper.getUserId())) {
            throw new IllegalArgumentException("Không tìm thấy đơn hàng #" + orderId + " được phân công cho tài khoản của bạn (Quy tắc BR-08)");
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
        PaymentStatus status = (paymentTx != null) ? paymentTx.getPaymentStatus() : PaymentStatus.UNPAID;
        PaymentMethod enumMethod = PaymentMethod.COD;
        if (paymentTx != null && paymentTx.getPaymentMethod() != null) {
            try {
                enumMethod = PaymentMethod.valueOf(paymentTx.getPaymentMethod());
            } catch (Exception ignored) {}
        }

        String message = (status == PaymentStatus.PAID)
                ? "Thanh toán thành công! Khách hàng đã chuyển tiền xong, bạn có thể bàn giao rượu."
                : "Đang chờ khách hàng quét mã và xác nhận chuyển khoản ngân hàng...";

        return com.urbanwine.sell_wine_express.dto.respone.PaymentStatusResponse.builder()
                .orderId(order.getOrderId())
                .orderCode(String.format("ORD-%06d", order.getOrderId()))
                .totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus())
                .paymentStatus(status)
                .paymentMethod(enumMethod)
                .isPaid(status == PaymentStatus.PAID)
                .bankReceiptCode(paymentTx != null ? paymentTx.getBankReceiptCode() : null)
                .message(message)
                .createdAt(order.getCreatedAt())
                .build();
    }
}


