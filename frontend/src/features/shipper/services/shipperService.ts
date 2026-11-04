import { apiClient } from '@/shared/api/client';
import { ShipperOrder, ShipperNotification } from '../types/shipper';

const PINNED_ORDER_STORAGE_KEY = 'urbanwine_shipper_pinned_order_id';

export const shipperService = {
  // 1. Get assigned orders for shipper
  async getMyOrders(): Promise<ShipperOrder[]> {
    const res = await apiClient.get<ShipperOrder[]>('/shipper/orders');
    return res.data;
  },

  // 2. Get order detail
  async getOrderDetail(orderId: number): Promise<ShipperOrder> {
    const res = await apiClient.get<ShipperOrder>(`/shipper/orders/${orderId}`);
    return res.data;
  },

  // 3. Get shipper notifications
  async getNotifications(): Promise<ShipperNotification[]> {
    const res = await apiClient.get<ShipperNotification[]>('/shipper/notifications');
    return res.data;
  },

  // 4. Mark notification as read
  async markNotificationRead(notificationId: number): Promise<void> {
    await apiClient.patch(`/shipper/notifications/${notificationId}/read`);
  },

  // 5. Shipper completes delivery (COD cash or prepaid order)
  async completeDelivery(orderId: number): Promise<ShipperOrder> {
    const res = await apiClient.post<ShipperOrder>(`/shipper/orders/${orderId}/complete`);
    return res.data;
  },

  // 6. Shipper reports failed delivery (cannot contact customer / refused)
  async failDelivery(orderId: number, reason: string): Promise<ShipperOrder> {
    const res = await apiClient.post<ShipperOrder>(`/shipper/orders/${orderId}/fail`, { reason });
    return res.data;
  },

  // 7. Request order reassignment to another shipper (Request Reassign Modal)
  async requestRejectOrder(orderId: number, reason: string): Promise<ShipperOrder> {
    const res = await apiClient.post<ShipperOrder>(`/shipper/orders/${orderId}/request-reject`, { reason });
    return res.data;
  },

  // 8. Generate dynamic VietQR code for on-site payment
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

  // 9. Cancel VietQR and revert to cash payment
  async cancelVietQr(orderId: number): Promise<ShipperOrder> {
    const res = await apiClient.post<ShipperOrder>(`/shipper/orders/${orderId}/cancel-qr`);
    return res.data;
  },

  // 10. Polling check VietQR payment status
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
  // PINNED ORDER LOGIC
  // Priority:
  // 1. Manually pinned by Shipper (stored in localStorage)
  // 2. If unpinned or completed -> automatically choose the latest SHIPPING order
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

    // If no pin or pinned order is no longer SHIPPING, pick the first one
    return activeDeliveries[0];
  },
};
