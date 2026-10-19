package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.AssignShipperRequest;
import com.urbanwine.sell_wine_express.dto.request.RejectOrderRequest;
import com.urbanwine.sell_wine_express.dto.request.ReviewShipperRejectRequest;
import com.urbanwine.sell_wine_express.dto.request.ShipperRejectOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
import com.urbanwine.sell_wine_express.dto.respone.ShipperWorkloadResponse;
import com.urbanwine.sell_wine_express.enums.NotificationType;
import com.urbanwine.sell_wine_express.enums.ShipperRejectStatus;
import com.urbanwine.sell_wine_express.entity.Order;
import com.urbanwine.sell_wine_express.entity.OrderDetail;
import com.urbanwine.sell_wine_express.entity.PaymentTransaction;
import com.urbanwine.sell_wine_express.entity.User;
import com.urbanwine.sell_wine_express.entity.Wine;
import com.urbanwine.sell_wine_express.enums.CancelStatus;
import com.urbanwine.sell_wine_express.enums.OrderStatus;
import com.urbanwine.sell_wine_express.enums.PaymentMethod;
import com.urbanwine.sell_wine_express.enums.PaymentStatus;
import com.urbanwine.sell_wine_express.enums.Role;
import com.urbanwine.sell_wine_express.repository.OrderDetailRepository;
import com.urbanwine.sell_wine_express.repository.OrderRepository;
import com.urbanwine.sell_wine_express.repository.PaymentTransactionRepository;
import com.urbanwine.sell_wine_express.repository.UserRepository;
import com.urbanwine.sell_wine_express.repository.WineRepository;
import com.urbanwine.sell_wine_express.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceAdminTest {

    @Mock
    private WineRepository wineRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderDetailRepository orderDetailRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private CartService cartService;

    @Mock
    private VnPayService vnPayService;

    @Mock
    private OrderEmailService orderEmailService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User testCustomer;
    private Order pendingOrder;
    private Wine testWine;
    private OrderDetail testOrderDetail;
    private PaymentTransaction codTransaction;
    private PaymentTransaction vnPayPaidTransaction;
    private PaymentTransaction vnPayUnpaidTransaction;

    @BeforeEach
    void setUp() {
        testCustomer = User.builder()
                .userId(1L)
                .email("customer@gmail.com")
                .fullName("Nguyen Van A")
                .phoneNumber("0912345678")
                .role(Role.ROLE_CUSTOMER)
                .isOver18(true)
                .isActive(true)
                .build();

        testWine = Wine.builder()
                .wineId(10L)
                .wineName("Chateau Margaux 2015")
                .price(new BigDecimal("2500000"))
                .stockQuantity(15)
                .isActive(true)
                .build();

        pendingOrder = new Order();
        pendingOrder.setOrderId(101L);
        pendingOrder.setCustomer(testCustomer);
        pendingOrder.setRecipientName("Nguyen Van A");
        pendingOrder.setRecipientPhone("0912345678");
        pendingOrder.setDeliveryAddress("123 Phố Huế, Hoàn Kiếm, Hà Nội");
        pendingOrder.setTotalAmount(new BigDecimal("2780000"));
        pendingOrder.setOrderStatus(OrderStatus.PENDING);
        pendingOrder.setCancelStatus(CancelStatus.NONE);
        pendingOrder.setCreatedAt(LocalDateTime.now());

        testOrderDetail = new OrderDetail();
        testOrderDetail.setOrderDetailId(1L);
        testOrderDetail.setOrder(pendingOrder);
        testOrderDetail.setWine(testWine);
        testOrderDetail.setQuantity(2);
        testOrderDetail.setUnitPrice(new BigDecimal("2500000"));

        codTransaction = new PaymentTransaction();
        codTransaction.setTransactionId(1L);
        codTransaction.setOrder(pendingOrder);
        codTransaction.setPaymentMethod(PaymentMethod.COD.name());
        codTransaction.setPaymentStatus(PaymentStatus.UNPAID);

        vnPayPaidTransaction = new PaymentTransaction();
        vnPayPaidTransaction.setTransactionId(2L);
        vnPayPaidTransaction.setOrder(pendingOrder);
        vnPayPaidTransaction.setPaymentMethod(PaymentMethod.VNPAY.name());
        vnPayPaidTransaction.setPaymentStatus(PaymentStatus.PAID);
        vnPayPaidTransaction.setBankReceiptCode("VNP12345678");

        vnPayUnpaidTransaction = new PaymentTransaction();
        vnPayUnpaidTransaction.setTransactionId(3L);
        vnPayUnpaidTransaction.setOrder(pendingOrder);
        vnPayUnpaidTransaction.setPaymentMethod(PaymentMethod.VNPAY.name());
        vnPayUnpaidTransaction.setPaymentStatus(PaymentStatus.UNPAID);
    }

    // =========================================================================
    // NORMAL FLOW: PHÊ DUYỆT ĐƠN HÀNG (Approve Pending Order)
    // =========================================================================

    @Test
    @DisplayName("Normal Flow - Duyệt đơn COD thành công: Chuyển sang PROCESSING, ghi nhận approvedAt và gửi email")
    void approveOrder_COD_Success() {
        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(codTransaction));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(pendingOrder)).thenReturn(List.of(testOrderDetail));

        OrderResponse response = orderService.approveOrder(101L);

        assertNotNull(response);
        assertEquals(OrderStatus.PROCESSING, response.getOrderStatus());
        assertNotNull(response.getApprovedAt());
        verify(orderRepository).save(pendingOrder);
        verify(orderEmailService).sendOrderApprovedEmail(pendingOrder);
    }

    @Test
    @DisplayName("Normal Flow & BR-07 - Duyệt đơn VNPAY đã thanh toán (PAID) thành công")
    void approveOrder_VNPAY_Paid_Success() {
        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(vnPayPaidTransaction));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(pendingOrder)).thenReturn(List.of(testOrderDetail));

        OrderResponse response = orderService.approveOrder(101L);

        assertNotNull(response);
        assertEquals(OrderStatus.PROCESSING, response.getOrderStatus());
        assertNotNull(response.getApprovedAt());
        verify(orderRepository).save(pendingOrder);
        verify(orderEmailService).sendOrderApprovedEmail(pendingOrder);
    }

    @Test
    @DisplayName("BR-07 Ràng buộc thanh toán - Duyệt đơn VNPAY chưa thanh toán (UNPAID) bị từ chối")
    void approveOrder_VNPAY_Unpaid_ThrowsException() {
        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(vnPayUnpaidTransaction));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.approveOrder(101L));

        assertTrue(ex.getMessage().contains("chưa hoàn tất giao dịch"));
        assertTrue(ex.getMessage().contains("BR-07"));
        verify(orderRepository, never()).save(any(Order.class));
        verify(orderEmailService, never()).sendOrderApprovedEmail(any(Order.class));
    }

    @Test
    @DisplayName("Ràng buộc trạng thái - Không thể duyệt đơn hàng không ở trạng thái PENDING")
    void approveOrder_NotPending_ThrowsException() {
        pendingOrder.setOrderStatus(OrderStatus.PROCESSING);
        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.approveOrder(101L));

        assertTrue(ex.getMessage().contains("Chỉ có thể phê duyệt đơn hàng đang ở trạng thái Chờ xử lý"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    // =========================================================================
    // ALTERNATIVE FLOW 1: TỪ CHỐI ĐƠN HÀNG KÈM LÝ DO (Reject Order)
    // =========================================================================

    @Test
    @DisplayName("Alt Flow 1 & POST-2 - Từ chối đơn COD: Hoàn trả số lượng vào tồn kho và gửi email thông báo")
    void rejectOrder_COD_Success() {
        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));
        when(orderDetailRepository.findByOrder(pendingOrder)).thenReturn(List.of(testOrderDetail));
        when(wineRepository.save(any(Wine.class))).thenAnswer(i -> i.getArgument(0));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(codTransaction));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        RejectOrderRequest request = new RejectOrderRequest("Không liên lạc được với người nhận sau 3 cuộc gọi");
        OrderResponse response = orderService.rejectOrder(101L, request);

        assertEquals(OrderStatus.CANCELLED, response.getOrderStatus());
        assertEquals("Không liên lạc được với người nhận sau 3 cuộc gọi", response.getAdminNote());
        // Ban đầu kho 15 + hoàn trả 2 chai = 17 chai (POST-2)
        assertEquals(17, testWine.getStockQuantity());
        verify(wineRepository).save(testWine);
        verify(vnPayService, never()).refundTransaction(any(), any(), any());
        verify(orderEmailService).sendOrderRejectedEmail(eq(pendingOrder), eq("Không liên lạc được với người nhận sau 3 cuộc gọi"), eq(false));
    }

    @Test
    @DisplayName("Alt Flow 1 & POST-3 - Từ chối đơn VNPAY đã thanh toán: Tự động hoàn kho và kích hoạt hoàn tiền")
    void rejectOrder_VNPAY_Prepaid_TriggersRefund() {
        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));
        when(orderDetailRepository.findByOrder(pendingOrder)).thenReturn(List.of(testOrderDetail));
        when(wineRepository.save(any(Wine.class))).thenAnswer(i -> i.getArgument(0));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(vnPayPaidTransaction));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        RejectOrderRequest request = new RejectOrderRequest("Sản phẩm bị nứt vỏ hộp trong kho, không thể giao");
        OrderResponse response = orderService.rejectOrder(101L, request);

        assertEquals(OrderStatus.CANCELLED, response.getOrderStatus());
        assertEquals(17, testWine.getStockQuantity());
        // Kích hoạt hoàn tiền tự động qua VNPay (POST-3)
        verify(vnPayService).refundTransaction(eq(pendingOrder), eq("Sản phẩm bị nứt vỏ hộp trong kho, không thể giao"), eq("Admin"));
        verify(orderEmailService).sendOrderRejectedEmail(eq(pendingOrder), eq("Sản phẩm bị nứt vỏ hộp trong kho, không thể giao"), eq(true));
    }

    @Test
    @DisplayName("Exception E2 - Từ chối đơn hàng mà không có lý do bị chặn")
    void rejectOrder_MissingReason_ThrowsException() {
        RejectOrderRequest requestEmpty = new RejectOrderRequest("   ");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.rejectOrder(101L, requestEmpty));

        assertTrue(ex.getMessage().contains("Ngoại lệ E2"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    // =========================================================================
    // ALTERNATIVE FLOW 2: XÉT DUYỆT YÊU CẦU HỦY CỦA KHÁCH (Review Cancellation)
    // =========================================================================

    @Test
    @DisplayName("Alt Flow 2.3a - Chấp thuận yêu cầu hủy đơn PROCESSING: Chuyển CANCELLED, hoàn kho, hoàn tiền và gửi email")
    void reviewCancellationRequest_Approve_Success() {
        pendingOrder.setOrderStatus(OrderStatus.PROCESSING);
        pendingOrder.setCancelStatus(CancelStatus.REQUESTED);
        pendingOrder.setCancellationReason("Khách bận công tác đột xuất");

        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(vnPayPaidTransaction));
        when(orderDetailRepository.findByOrder(pendingOrder)).thenReturn(List.of(testOrderDetail));
        when(wineRepository.save(any(Wine.class))).thenAnswer(i -> i.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        OrderResponse response = orderService.reviewCancellationRequest(101L, true, "Đồng ý hỗ trợ hủy trước khi giao cho shipper");

        assertEquals(OrderStatus.CANCELLED, response.getOrderStatus());
        assertEquals(CancelStatus.APPROVED, response.getCancelStatus());
        assertEquals("Đồng ý hỗ trợ hủy trước khi giao cho shipper", response.getAdminNote());
        assertEquals(17, testWine.getStockQuantity());
        verify(vnPayService).refundTransaction(eq(pendingOrder), eq("Đồng ý hỗ trợ hủy trước khi giao cho shipper"), eq("Admin"));
        verify(orderEmailService).sendCancellationApprovedEmail(eq(pendingOrder), eq("Đồng ý hỗ trợ hủy trước khi giao cho shipper"), eq(true));
    }

    @Test
    @DisplayName("Alt Flow 2.3b - Từ chối yêu cầu hủy đơn PROCESSING: Giữ nguyên PROCESSING và gửi email từ chối")
    void reviewCancellationRequest_Reject_RetainsProcessing() {
        pendingOrder.setOrderStatus(OrderStatus.PROCESSING);
        pendingOrder.setCancelStatus(CancelStatus.REQUESTED);
        pendingOrder.setCancellationReason("Khách muốn đổi ý");

        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(codTransaction));
        when(orderDetailRepository.findByOrder(pendingOrder)).thenReturn(List.of(testOrderDetail));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        OrderResponse response = orderService.reviewCancellationRequest(101L, false, "Đơn hàng đã đóng gói niêm phong và bàn giao cho shipper");

        assertEquals(OrderStatus.PROCESSING, response.getOrderStatus());
        assertEquals(CancelStatus.REJECTED, response.getCancelStatus());
        assertEquals("Đơn hàng đã đóng gói niêm phong và bàn giao cho shipper", response.getAdminNote());
        // Không hoàn kho
        verify(wineRepository, never()).save(any(Wine.class));
        verify(orderEmailService).sendCancellationRejectedEmail(eq(pendingOrder), eq("Đơn hàng đã đóng gói niêm phong và bàn giao cho shipper"));
    }

    // =========================================================================
    // DANH SÁCH & CHI TIẾT ĐƠN HÀNG DÀNH CHO ADMIN
    // =========================================================================

    @Test
    @DisplayName("Normal Flow Bước 1 & 2 - Admin xem danh sách đơn PENDING kèm phân trang")
    void getAdminOrders_FilterPending_Success() {
        PageImpl<Order> page = new PageImpl<>(List.of(pendingOrder));
        when(orderRepository.findByOrderStatus(eq(OrderStatus.PENDING), any(Pageable.class))).thenReturn(page);
        when(orderDetailRepository.findByOrder(pendingOrder)).thenReturn(List.of(testOrderDetail));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(codTransaction));

        PageResponse<OrderResponse> response = orderService.getAdminOrders(OrderStatus.PENDING, null, 0, 10);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("ORD-000101", response.getContent().get(0).getOrderCode());
        assertEquals(OrderStatus.PENDING, response.getContent().get(0).getOrderStatus());
    }

    @Test
    @DisplayName("Normal Flow Bước 3 & 4 - Admin xem chi tiết toàn bộ thông tin đơn hàng")
    void getAdminOrderDetail_Success() {
        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));
        when(orderDetailRepository.findByOrder(pendingOrder)).thenReturn(List.of(testOrderDetail));
        when(paymentTransactionRepository.findByOrder(pendingOrder)).thenReturn(Optional.of(codTransaction));

        OrderResponse response = orderService.getAdminOrderDetail(101L);

        assertNotNull(response);
        assertEquals(101L, response.getOrderId());
        assertEquals("123 Phố Huế, Hoàn Kiếm, Hà Nội", response.getDeliveryAddress());
        assertEquals(1, response.getItems().size());
        assertEquals("Chateau Margaux 2015", response.getItems().get(0).getWineName());
    }

    // =========================================================================
    // UC_2.1.4: ASSIGN ORDER TO SHIPPER TESTS
    // =========================================================================

    @Test
    @DisplayName("UC_2.1.4 Normal Flow - Admin gán đơn hàng PROCESSING thành công cho Shipper đang Online")
    void assignShipper_Success() {
        Order processingOrder = new Order();
        processingOrder.setOrderId(200L);
        processingOrder.setOrderStatus(OrderStatus.PROCESSING);
        processingOrder.setCustomer(testCustomer);
        processingOrder.setRecipientName("Nguyen Van B");
        processingOrder.setRecipientPhone("0988776655");
        processingOrder.setDeliveryAddress("456 Kim Ma, Ba Dinh, Ha Noi");
        processingOrder.setTotalAmount(new BigDecimal("2230000"));

        User onlineShipper = User.builder()
                .userId(10L)
                .fullName("Shipper One")
                .email("shipper1@urbanwine.com")
                .phoneNumber("0911111111")
                .role(Role.ROLE_SHIPPER)
                .isActive(true)
                .isOnline(true)
                .build();

        when(orderRepository.findById(200L)).thenReturn(Optional.of(processingOrder));
        when(userRepository.findById(10L)).thenReturn(Optional.of(onlineShipper));
        when(orderRepository.countByShipperAndOrderStatus(onlineShipper, OrderStatus.SHIPPING)).thenReturn(2L);
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(processingOrder)).thenReturn(List.of());
        when(paymentTransactionRepository.findByOrder(processingOrder)).thenReturn(Optional.empty());

        AssignShipperRequest request = AssignShipperRequest.builder()
                .shipperId(10L)
                .note("Giao truoc 18h")
                .build();

        OrderResponse response = orderService.assignShipper(200L, request);

        assertNotNull(response);
        assertEquals(OrderStatus.SHIPPING, response.getOrderStatus());
        assertEquals(10L, response.getShipperId());
        assertEquals("Shipper One", response.getShipperName());
        assertNotNull(response.getAssignedAt());

        verify(notificationService).sendNotification(
                eq(onlineShipper),
                contains("Nhiệm vụ giao hàng mới"),
                anyString(),
                eq(NotificationType.ORDER_ASSIGNED),
                eq(200L)
        );
    }

    @Test
    @DisplayName("UC_2.1.4 PRE-2 Vi phạm: Đơn hàng không ở trạng thái PROCESSING -> Báo lỗi")
    void assignShipper_OrderNotProcessing_ThrowsException() {
        when(orderRepository.findById(101L)).thenReturn(Optional.of(pendingOrder));

        AssignShipperRequest request = AssignShipperRequest.builder().shipperId(10L).build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.assignShipper(101L, request));

        assertTrue(ex.getMessage().contains("PROCESSING"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("UC_2.1.4 Ngoại lệ E1: Shipper đang Offline (không trong ca trực) -> Chặn phân công")
    void assignShipper_ShipperOffline_ThrowsExceptionE1() {
        Order processingOrder = new Order();
        processingOrder.setOrderId(200L);
        processingOrder.setOrderStatus(OrderStatus.PROCESSING);

        User offlineShipper = User.builder()
                .userId(10L)
                .fullName("Shipper Offline")
                .role(Role.ROLE_SHIPPER)
                .isOnline(false)
                .build();

        when(orderRepository.findById(200L)).thenReturn(Optional.of(processingOrder));
        when(userRepository.findById(10L)).thenReturn(Optional.of(offlineShipper));

        AssignShipperRequest request = AssignShipperRequest.builder().shipperId(10L).build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.assignShipper(200L, request));

        assertTrue(ex.getMessage().contains("E1"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("UC_2.1.4 Ngoại lệ E2: Shipper đã nhận đủ 5 đơn SHIPPING cùng lúc -> Chặn phân công")
    void assignShipper_ShipperMaxLimitReached_ThrowsExceptionE2() {
        Order processingOrder = new Order();
        processingOrder.setOrderId(200L);
        processingOrder.setOrderStatus(OrderStatus.PROCESSING);

        User busyShipper = User.builder()
                .userId(10L)
                .fullName("Shipper Busy")
                .role(Role.ROLE_SHIPPER)
                .isOnline(true)
                .build();

        when(orderRepository.findById(200L)).thenReturn(Optional.of(processingOrder));
        when(userRepository.findById(10L)).thenReturn(Optional.of(busyShipper));
        when(orderRepository.countByShipperAndOrderStatus(busyShipper, OrderStatus.SHIPPING)).thenReturn(5L);

        AssignShipperRequest request = AssignShipperRequest.builder().shipperId(10L).build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.assignShipper(200L, request));

        assertTrue(ex.getMessage().contains("E2"));
        assertTrue(ex.getMessage().contains("tối đa 5 đơn"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("UC_2.1.4 Alternative Flow - Điều phối lại đơn hàng sang Shipper khác")
    void reassignShipper_Success() {
        User oldShipper = User.builder()
                .userId(10L)
                .fullName("Old Shipper")
                .role(Role.ROLE_SHIPPER)
                .isOnline(true)
                .build();

        User newShipper = User.builder()
                .userId(20L)
                .fullName("New Shipper")
                .role(Role.ROLE_SHIPPER)
                .isOnline(true)
                .build();

        Order shippingOrder = new Order();
        shippingOrder.setOrderId(300L);
        shippingOrder.setOrderStatus(OrderStatus.SHIPPING);
        shippingOrder.setShipper(oldShipper);
        shippingOrder.setCustomer(testCustomer);
        shippingOrder.setRecipientName("Nguyen Van C");
        shippingOrder.setRecipientPhone("0988776655");
        shippingOrder.setDeliveryAddress("789 Pho Hue, Ha Noi");
        shippingOrder.setTotalAmount(new BigDecimal("1500000"));

        when(orderRepository.findById(300L)).thenReturn(Optional.of(shippingOrder));
        when(userRepository.findById(20L)).thenReturn(Optional.of(newShipper));
        when(orderRepository.countByShipperAndOrderStatus(newShipper, OrderStatus.SHIPPING)).thenReturn(1L);
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(shippingOrder)).thenReturn(List.of());
        when(paymentTransactionRepository.findByOrder(shippingOrder)).thenReturn(Optional.empty());

        AssignShipperRequest request = AssignShipperRequest.builder().shipperId(20L).build();
        OrderResponse response = orderService.reassignShipper(300L, request);

        assertNotNull(response);
        assertEquals(20L, response.getShipperId());
        assertEquals("New Shipper", response.getShipperName());

        // Verify sends revocation to old shipper and assignment to new shipper
        verify(notificationService).sendNotification(
                eq(oldShipper),
                contains("Thu hồi nhiệm vụ"),
                anyString(),
                eq(NotificationType.ORDER_REASSIGNED),
                eq(300L)
        );
        verify(notificationService).sendNotification(
                eq(newShipper),
                contains("Nhiệm vụ giao hàng mới"),
                anyString(),
                eq(NotificationType.ORDER_ASSIGNED),
                eq(300L)
        );
    }

    @Test
    @DisplayName("UC_2.1.4 Lấy danh sách Shipper Online kèm tải công việc")
    void getAvailableShippers_Success() {
        User s1 = User.builder().userId(1L).fullName("Shipper 1").role(Role.ROLE_SHIPPER).isOnline(true).build();
        User s2 = User.builder().userId(2L).fullName("Shipper 2").role(Role.ROLE_SHIPPER).isOnline(true).build();

        when(userRepository.findByRoleAndIsOnlineTrue(Role.ROLE_SHIPPER)).thenReturn(List.of(s1, s2));
        when(orderRepository.countByShipperAndOrderStatus(s1, OrderStatus.SHIPPING)).thenReturn(3L);
        when(orderRepository.countByShipperAndOrderStatus(s2, OrderStatus.SHIPPING)).thenReturn(5L);

        List<ShipperWorkloadResponse> result = orderService.getAvailableShippers();

        assertEquals(2, result.size());
        assertEquals(3L, result.get(0).getCurrentActiveOrders());
        assertTrue(result.get(0).isCanAssign());
        assertEquals(5L, result.get(1).getCurrentActiveOrders());
        assertFalse(result.get(1).isCanAssign());
    }

    @Test
    @DisplayName("Quy tắc BR-08: Shipper chỉ xem được đơn hàng được phân công cho chính mình")
    void getShipperOrderDetail_BR08_Success() {
        User currentShipper = User.builder().userId(10L).role(Role.ROLE_SHIPPER).build();
        Order order = new Order();
        order.setOrderId(500L);
        order.setShipper(currentShipper);
        order.setCustomer(testCustomer);
        order.setTotalAmount(new BigDecimal("1000000"));

        when(orderRepository.findByOrderIdAndShipper(500L, currentShipper)).thenReturn(Optional.of(order));
        when(orderDetailRepository.findByOrder(order)).thenReturn(List.of());
        when(paymentTransactionRepository.findByOrder(order)).thenReturn(Optional.empty());

        OrderResponse res = orderService.getShipperOrderDetail(currentShipper, 500L);
        assertNotNull(res);
        assertEquals(500L, res.getOrderId());
    }

    // =========================================================================
    // SHIPPER REJECT ORDER FLOW TESTS
    // =========================================================================

    @Test
    @DisplayName("Shipper gửi yêu cầu từ chối nhận đơn thành công khi gặp sự cố")
    void requestShipperRejectOrder_Success() {
        User currentShipper = User.builder().userId(10L).fullName("Shipper A").role(Role.ROLE_SHIPPER).build();
        Order order = new Order();
        order.setOrderId(600L);
        order.setShipper(currentShipper);
        order.setOrderStatus(OrderStatus.SHIPPING);
        order.setCustomer(testCustomer);
        order.setShipperRejectStatus(ShipperRejectStatus.NONE);

        when(orderRepository.findByOrderIdAndShipper(600L, currentShipper)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(order)).thenReturn(List.of());
        when(paymentTransactionRepository.findByOrder(order)).thenReturn(Optional.empty());

        ShipperRejectOrderRequest req = ShipperRejectOrderRequest.builder().reason("Xe hỏng dọc đường").build();
        OrderResponse res = orderService.requestShipperRejectOrder(currentShipper, 600L, req);

        assertNotNull(res);
        assertEquals(ShipperRejectStatus.REQUESTED, res.getShipperRejectStatus());
        assertEquals("Xe hỏng dọc đường", res.getShipperRejectReason());
    }

    @Test
    @DisplayName("Admin xét duyệt chấp thuận (TH1): Rút đơn về PROCESSING, gỡ shipper, thông báo chấp thuận")
    void reviewShipperRejectOrder_Approve_Success() {
        User currentShipper = User.builder().userId(10L).fullName("Shipper A").role(Role.ROLE_SHIPPER).build();
        Order order = new Order();
        order.setOrderId(601L);
        order.setShipper(currentShipper);
        order.setOrderStatus(OrderStatus.SHIPPING);
        order.setCustomer(testCustomer);
        order.setShipperRejectStatus(ShipperRejectStatus.REQUESTED);

        when(orderRepository.findById(601L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(order)).thenReturn(List.of());
        when(paymentTransactionRepository.findByOrder(order)).thenReturn(Optional.empty());

        ReviewShipperRejectRequest req = ReviewShipperRejectRequest.builder()
                .approved(true)
                .adminNote("Đồng ý rút đơn do sự cố xe cộ")
                .build();

        OrderResponse res = orderService.reviewShipperRejectOrder(601L, req);

        assertNotNull(res);
        assertEquals(OrderStatus.PROCESSING, res.getOrderStatus());
        assertNull(res.getShipperId()); // Shipper đã được gỡ ra
        assertEquals(ShipperRejectStatus.APPROVED, res.getShipperRejectStatus());

        verify(notificationService).sendNotification(
                eq(currentShipper),
                contains("chấp thuận"),
                anyString(),
                eq(NotificationType.ORDER_REASSIGNED),
                eq(601L)
        );
    }

    @Test
    @DisplayName("Admin xét duyệt từ chối (TH2): Đơn giữ nguyên SHIPPING, shipper tiếp tục giao, thông báo từ chối")
    void reviewShipperRejectOrder_Reject_Success() {
        User currentShipper = User.builder().userId(10L).fullName("Shipper A").role(Role.ROLE_SHIPPER).build();
        Order order = new Order();
        order.setOrderId(602L);
        order.setShipper(currentShipper);
        order.setOrderStatus(OrderStatus.SHIPPING);
        order.setCustomer(testCustomer);
        order.setShipperRejectStatus(ShipperRejectStatus.REQUESTED);

        when(orderRepository.findById(602L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(order)).thenReturn(List.of());
        when(paymentTransactionRepository.findByOrder(order)).thenReturn(Optional.empty());

        ReviewShipperRejectRequest req = ReviewShipperRejectRequest.builder()
                .approved(false)
                .adminNote("Sự cố nhẹ, vui lòng tiếp tục giao")
                .build();

        OrderResponse res = orderService.reviewShipperRejectOrder(602L, req);

        assertNotNull(res);
        assertEquals(OrderStatus.SHIPPING, res.getOrderStatus());
        assertEquals(10L, res.getShipperId()); // Shipper vẫn được giữ nguyên
        assertEquals(ShipperRejectStatus.REJECTED, res.getShipperRejectStatus());

        verify(notificationService).sendNotification(
                eq(currentShipper),
                contains("không được chấp thuận"),
                anyString(),
                eq(NotificationType.SYSTEM),
                eq(602L)
        );
    }

    // =========================================================================
    // UC_2.3.2 UPDATE DELIVERY STATUS TESTS
    // =========================================================================

    @Test
    @DisplayName("UC_2.3.2 Normal Flow: Shipper xác nhận giao thành công đơn COD -> COMPLETED, PAID, lưu completedAt, gửi thông báo & email")
    void completeDelivery_Success_COD() {
        User currentShipper = User.builder().userId(10L).fullName("Nguyễn Văn Giao").role(Role.ROLE_SHIPPER).build();
        User adminUser = User.builder().userId(1L).fullName("Admin Manager").role(Role.ROLE_ADMIN).build();

        Order order = new Order();
        order.setOrderId(701L);
        order.setShipper(currentShipper);
        order.setOrderStatus(OrderStatus.SHIPPING);
        order.setCustomer(testCustomer);
        order.setTotalAmount(new BigDecimal("250000"));

        PaymentTransaction codTx = new PaymentTransaction();
        codTx.setOrder(order);
        codTx.setPaymentMethod(PaymentMethod.COD.name());
        codTx.setPaymentStatus(PaymentStatus.UNPAID);

        when(orderRepository.findById(701L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(paymentTransactionRepository.findByOrder(order)).thenReturn(Optional.of(codTx));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(order)).thenReturn(List.of());
        when(userRepository.findByRole(Role.ROLE_ADMIN)).thenReturn(List.of(adminUser));

        OrderResponse res = orderService.completeDelivery(currentShipper, 701L);

        assertNotNull(res);
        assertEquals(OrderStatus.COMPLETED, res.getOrderStatus());
        assertNotNull(res.getCompletedAt());
        assertEquals(PaymentStatus.PAID, codTx.getPaymentStatus());

        // Kiểm tra thông báo bắn cho Admin và Shipper
        verify(notificationService).sendNotification(
                eq(adminUser),
                contains("giao thành công"),
                anyString(),
                eq(NotificationType.DELIVERY_COMPLETED),
                eq(701L)
        );
        verify(notificationService).sendNotification(
                eq(currentShipper),
                contains("Giao hàng thành công"),
                anyString(),
                eq(NotificationType.DELIVERY_COMPLETED),
                eq(701L)
        );

        // Kiểm tra email xác nhận cho khách hàng
        verify(orderEmailService).sendDeliverySuccessEmail(order);
    }

    @Test
    @DisplayName("UC_2.3.2 Exception E1 / BR-08: Shipper khác cố gắng xác nhận hoàn thành đơn không thuộc về mình -> Bị chặn")
    void completeDelivery_Exception_NotAssignedShipper() {
        User shipper1 = User.builder().userId(10L).fullName("Shipper 1").role(Role.ROLE_SHIPPER).build();
        User shipper2 = User.builder().userId(20L).fullName("Shipper 2").role(Role.ROLE_SHIPPER).build();

        Order order = new Order();
        order.setOrderId(702L);
        order.setShipper(shipper1);
        order.setOrderStatus(OrderStatus.SHIPPING);

        when(orderRepository.findById(702L)).thenReturn(Optional.of(order));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                orderService.completeDelivery(shipper2, 702L));

        assertTrue(ex.getMessage().contains("Quy tắc BR-08"));
    }

    @Test
    @DisplayName("UC_2.3.2 Alternative Flow: Báo giao thất bại -> CANCELLED, hoàn kho, lưu lý do và thông báo")
    void failDelivery_Success_RestockAndCancel() {
        User currentShipper = User.builder().userId(10L).fullName("Nguyễn Văn Giao").role(Role.ROLE_SHIPPER).build();
        User adminUser = User.builder().userId(1L).fullName("Admin Manager").role(Role.ROLE_ADMIN).build();

        Wine wine = new Wine();
        wine.setWineId(1L);
        wine.setWineName("Vang Đỏ");
        wine.setStockQuantity(10);

        Order order = new Order();
        order.setOrderId(703L);
        order.setShipper(currentShipper);
        order.setOrderStatus(OrderStatus.SHIPPING);
        order.setCustomer(testCustomer);
        order.setTotalAmount(new BigDecimal("500000"));

        OrderDetail detail = new OrderDetail();
        detail.setOrder(order);
        detail.setWine(wine);
        detail.setQuantity(2);
        detail.setUnitPrice(new BigDecimal("250000"));

        when(orderRepository.findById(703L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));
        when(orderDetailRepository.findByOrder(order)).thenReturn(List.of(detail));
        when(wineRepository.save(any(Wine.class))).thenAnswer(i -> i.getArgument(0));
        when(paymentTransactionRepository.findByOrder(order)).thenReturn(Optional.empty());
        when(userRepository.findByRole(Role.ROLE_ADMIN)).thenReturn(List.of(adminUser));

        com.urbanwine.sell_wine_express.dto.request.FailDeliveryRequest req =
                com.urbanwine.sell_wine_express.dto.request.FailDeliveryRequest.builder()
                        .reason("Khách không nghe máy sau 3 lần gọi")
                        .build();

        OrderResponse res = orderService.failDelivery(currentShipper, 703L, req);

        assertNotNull(res);
        assertEquals(OrderStatus.CANCELLED, res.getOrderStatus());
        assertTrue(res.getCancellationReason().contains("Khách không nghe máy"));
        assertEquals(12, wine.getStockQuantity()); // Hoàn kho 10 + 2 = 12

        // Kiểm tra thông báo bắn cho Admin và Shipper
        verify(notificationService).sendNotification(
                eq(adminUser),
                contains("Giao thất bại"),
                anyString(),
                eq(NotificationType.DELIVERY_FAILED),
                eq(703L)
        );

        // Kiểm tra gửi email cho khách
        verify(orderEmailService).sendDeliveryFailedEmail(eq(order), eq("Khách không nghe máy sau 3 lần gọi"), eq(false));
    }

    @Test
    @DisplayName("UC_2.3.2 Exception E2: Báo giao thất bại nhưng bỏ trống lý do -> Bị chặn")
    void failDelivery_Exception_MissingReason() {
        User currentShipper = User.builder().userId(10L).fullName("Nguyễn Văn Giao").role(Role.ROLE_SHIPPER).build();

        com.urbanwine.sell_wine_express.dto.request.FailDeliveryRequest req =
                com.urbanwine.sell_wine_express.dto.request.FailDeliveryRequest.builder()
                        .reason("   ") // Trống
                        .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                orderService.failDelivery(currentShipper, 704L, req));

        assertTrue(ex.getMessage().contains("Quy tắc E2"));
    }
}

