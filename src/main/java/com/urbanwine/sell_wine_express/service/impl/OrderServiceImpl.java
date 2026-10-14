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

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final WineRepository wineRepository;
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final CartService cartService;
    private final VnPayService vnPayService;
    private final OrderEmailService orderEmailService;

    // Phí ship nội thành cố định 30.000 VNĐ
    public static final BigDecimal SHIPPING_FEE = new BigDecimal("30000");
    // Thuế VAT 10%
    public static final BigDecimal VAT_RATE = new BigDecimal("0.10");

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
                .recipientName(order.getRecipientName())
                .recipientPhone(order.getRecipientPhone())
                .deliveryAddress(order.getDeliveryAddress())
                .merchandiseSubtotal(merchandiseSubtotal)
                .vatAmount(vatAmount)
                .shippingFee(SHIPPING_FEE)
                .totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus())
                .cancelStatus(order.getCancelStatus())
                .cancellationReason(order.getCancellationReason())
                .cancelRequestedAt(order.getCancelRequestedAt())
                .approvedAt(order.getApprovedAt())
                .adminNote(order.getAdminNote())
                .paymentStatus(paymentStatus)
                .paymentMethod(paymentMethod)
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
        // Mốc thời gian 15 phút trước
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(15);
        List<Order> expiredOrders = orderRepository.findByOrderStatusAndCreatedAtBefore(OrderStatus.PENDING, threshold);

        if (expiredOrders.isEmpty()) {
            return;
        }

        log.info("Tìm thấy {} đơn hàng PENDING quá hạn 15 phút cần hủy và hoàn kho.", expiredOrders.size());

        for (Order order : expiredOrders) {
            // 1. Kiểm tra trạng thái thanh toán và phương thức
            PaymentTransaction paymentTx = paymentTransactionRepository.findByOrder(order).orElse(null);
            PaymentStatus paymentStatus = (paymentTx != null) ? paymentTx.getPaymentStatus() : PaymentStatus.UNPAID;

            if (paymentStatus == PaymentStatus.PAID) {
                continue;
            }

            // Chỉ tự động hủy đối với đơn thanh toán online (VNPAY), không tự động hủy đơn COD
            if (paymentTx != null && PaymentMethod.COD.name().equalsIgnoreCase(paymentTx.getPaymentMethod())) {
                continue;
            }

            // 2. Hoàn trả số lượng tồn kho (restock) cho từng chai rượu trong đơn
            restockOrderItems(order);

            // 3. Chuyển trạng thái đơn sang CANCELLED và cập nhật cancelStatus
            order.setOrderStatus(OrderStatus.CANCELLED);
            order.setCancelStatus(CancelStatus.APPROVED);
            order.setCancellationReason("Hệ thống tự động hủy do quá hạn thanh toán 15 phút");
            order.setCancelRequestedAt(LocalDateTime.now());
            orderRepository.save(order);

            log.info("Đơn hàng #{} đã tự động HỦY do quá hạn 15 phút chưa thanh toán.", order.getOrderId());
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
    public PageResponse<OrderResponse> getAdminOrders(OrderStatus status, CancelStatus cancelStatus, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Order> orderPage;

        if (status != null) {
            orderPage = orderRepository.findByOrderStatus(status, pageable);
        } else if (cancelStatus != null) {
            orderPage = orderRepository.findByCancelStatus(cancelStatus, pageable);
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

    private record PreparedItem(Wine wine, Integer quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}
}
