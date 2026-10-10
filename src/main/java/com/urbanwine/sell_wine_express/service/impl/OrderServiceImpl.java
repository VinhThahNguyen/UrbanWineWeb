package com.urbanwine.sell_wine_express.service.impl;

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
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.PaymentMethod;
import com.urbanwine.sell_wine_express.enums.PaymentStatus;
import com.urbanwine.sell_wine_express.repository.OrderDetailRepository;
import com.urbanwine.sell_wine_express.repository.OrderRepository;
import com.urbanwine.sell_wine_express.repository.PaymentTransactionRepository;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import com.urbanwine.sell_wine_express.service.CartService;
import com.urbanwine.sell_wine_express.service.OrderService;
import com.urbanwine.sell_wine_express.service.VnPayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
                .recipientName(savedOrder.getRecipientName())
                .recipientPhone(savedOrder.getRecipientPhone())
                .deliveryAddress(savedOrder.getDeliveryAddress())
                .merchandiseSubtotal(merchandiseSubtotal)
                .vatAmount(vatAmount)
                .shippingFee(SHIPPING_FEE)
                .totalAmount(totalAmount)
                .orderStatus(savedOrder.getOrderStatus())
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

        return OrderResponse.builder()
                .orderId(order.getOrderId())
                .recipientName(order.getRecipientName())
                .recipientPhone(order.getRecipientPhone())
                .deliveryAddress(order.getDeliveryAddress())
                .merchandiseSubtotal(merchandiseSubtotal)
                .vatAmount(vatAmount)
                .shippingFee(SHIPPING_FEE)
                .totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus())
                .paymentStatus(paymentStatus)
                .paymentMethod(paymentMethod)
                .createdAt(order.getCreatedAt())
                .items(itemResponses)
                .build();
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
            // 1. Kiểm tra trạng thái thanh toán (chỉ hủy nếu chưa thanh toán)
            PaymentStatus paymentStatus = paymentTransactionRepository.findByOrder(order)
                    .map(PaymentTransaction::getPaymentStatus)
                    .orElse(PaymentStatus.UNPAID);

            if (paymentStatus == PaymentStatus.PAID) {
                continue;
            }

            // 2. Hoàn trả số lượng tồn kho (restock) cho từng chai rượu trong đơn
            List<OrderDetail> details = orderDetailRepository.findByOrder(order);
            for (OrderDetail detail : details) {
                Wine wine = detail.getWine();
                int restoredStock = wine.getStockQuantity() + detail.getQuantity();
                wine.setStockQuantity(restoredStock);
                wineRepository.save(wine);

                log.info("Đã hoàn kho lại {} chai '{}' (Tồn kho mới: {}) cho đơn #{}",
                        detail.getQuantity(), wine.getWineName(), restoredStock, order.getOrderId());
            }

            // 3. Chuyển trạng thái đơn sang CANCELLED
            order.setOrderStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);

            log.info("Đơn hàng #{} đã tự động HỦY do quá hạn 15 phút chưa thanh toán.", order.getOrderId());
        }
    }

    private record PreparedItem(Wine wine, Integer quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}
}
