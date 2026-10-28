import { apiClient } from '@/shared/api/client';
import { ShipperOrder, ShipperNotification } from '../types/shipper';

const PINNED_ORDER_STORAGE_KEY = 'urbanwine_shipper_pinned_order_id';

export const shipperService = {
  // 1. Lấy danh sách đơn hàng được gán cho shipper
  async getMyOrders(): Promise<ShipperOrder[]> {
    const res = await apiClient.get<ShipperOrder[]>('/shipper/orders');
    return res.data;
  },

  // 2. Lấy chi tiết một đơn hàng
  async getOrderDetail(orderId: number): Promise<ShipperOrder> {
    const res = await apiClient.get<ShipperOrder>(`/shipper/orders/${orderId}`);
    return res.data;
  },

  // 3. Lấy thông báo của shipper
  async getNotifications(): Promise<ShipperNotification[]> {
    const res = await apiClient.get<ShipperNotification[]>('/shipper/notifications');
    return res.data;
  },

  // 4. Đánh dấu đã đọc thông báo
  async markNotificationRead(notificationId: number): Promise<void> {
    await apiClient.patch(`/shipper/notifications/${notificationId}/read`);
  },

  // 5. Shipper xác nhận giao hàng thành công (hoàn tất tiền mặt COD hoặc đơn trả trước)
  async completeDelivery(orderId: number): Promise<ShipperOrder> {
    const res = await apiClient.post<ShipperOrder>(`/shipper/orders/${orderId}/complete`);
    return res.data;
  },

  // 6. Shipper báo cáo giao hàng thất bại (khách boom/không liên lạc được)
  async failDelivery(orderId: number, reason: string): Promise<ShipperOrder> {
    const res = await apiClient.post<ShipperOrder>(`/shipper/orders/${orderId}/fail`, { reason });
    return res.data;
  },

  // 7. Báo sự cố gán lại đơn cho shipper khác (Request Reassign Modal 5.9)
  async requestRejectOrder(orderId: number, reason: string): Promise<ShipperOrder> {
    const res = await apiClient.post<ShipperOrder>(`/shipper/orders/${orderId}/request-reject`, { reason });
    return res.data;
  },

  // 8. Tạo mã VietQR động thu tiền tại chỗ
  async generateVietQr(orderId: number): Promise<{
    orderId: number;
    orderCode: string;
    amountToCollect: number;
    bankId: string;
    accountNo: string;
    accountName: string;
    transferMemo: string;
    qrCodeUrl: string;
    paymentStatus: string;
    expiresInSeconds: number;
    message: string;
  }> {
    const res = await apiClient.post(`/shipper/orders/${orderId}/generate-qr`);
    return res.data;
  },

  // 9. Hủy mã VietQR quay về thu tiền mặt
  async cancelVietQr(orderId: number): Promise<ShipperOrder> {
    const res = await apiClient.post<ShipperOrder>(`/shipper/orders/${orderId}/cancel-qr`);
    return res.data;
  },

  // 10. Polling kiểm tra trạng thái thanh toán VietQR
  async getPaymentStatus(orderId: number): Promise<{
    orderId: number;
    orderCode: string;
    isPaid: boolean;
    paymentStatus: string;
    message: string;
  }> {
    const res = await apiClient.get(`/shipper/orders/${orderId}/payment-status`);
    return res.data;
  },

  // =========================================================================
  // LOGIC GHIM ĐƠN HÀNG THÔNG MINH (PINNED ORDER)
  // Ưu tiên:
  // 1. Đơn hàng mà Shipper tự tay Ghim (lưu ở localStorage)
  // 2. Nếu chưa ghim hoặc đơn ghim đã hoàn tất -> Tự động chọn đơn SHIPPING mới nhất
  // =========================================================================
  getPinnedOrderId(): number | null {
    const val = localStorage.getItem(PINNED_ORDER_STORAGE_KEY);
    return val ? Number(val) : null;
  },

  setPinnedOrderId(orderId: number | null): void {
    if (orderId === null) {
      localStorage.removeItem(PINNED_ORDER_STORAGE_KEY);
    } else {
      localStorage.setItem(PINNED_ORDER_STORAGE_KEY, String(orderId));
    }
  },

  resolveNextDelivery(orders: ShipperOrder[]): ShipperOrder | null {
    const activeDeliveries = orders.filter((o) => o.orderStatus === 'SHIPPING');
    if (activeDeliveries.length === 0) return null;

    const pinnedId = this.getPinnedOrderId();
    if (pinnedId) {
      const pinnedOrder = activeDeliveries.find((o) => o.orderId === pinnedId);
      if (pinnedOrder) return pinnedOrder;
    }

    // Nếu không có ghim hoặc đơn đã ghim không còn ở trạng thái SHIPPING, lấy đơn đầu tiên
    return activeDeliveries[0];
  },
};
