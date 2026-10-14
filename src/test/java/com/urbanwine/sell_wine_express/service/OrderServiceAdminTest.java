package com.urbanwine.sell_wine_express.service;

import com.urbanwine.sell_wine_express.dto.request.RejectOrderRequest;
import com.urbanwine.sell_wine_express.dto.respone.OrderResponse;
import com.urbanwine.sell_wine_express.dto.respone.PageResponse;
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
}
