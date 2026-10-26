import { apiClient } from './client';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
export type CancelStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED';

export interface OrderItem {
  wineId: number;
  wineName: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  vintageYear?: number;
}

export interface Order {
  orderId: number;
  orderCode: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  merchandiseSubtotal: number;
  vatAmount: number;
  shippingFee: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  cancelStatus: CancelStatus;
  cancellationReason?: string;
  cancelRequestedAt?: string;
  createdAt: string;
  paymentMethod?: string;
  paymentUrl?: string;
  items: OrderItem[];
}

export interface CheckoutSummaryRequest {
  deliveryAddress: string;
  items: { wineId: number; quantity: number }[];
}

export interface CheckoutSummaryResponse {
  merchandiseSubtotal: number;
  vatAmount: number;
  shippingFee: number;
  totalAmount: number;
  items: OrderItem[];
}

export interface PlaceOrderRequest {
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryNote?: string;
  paymentMethod: 'COD' | 'VNPAY' | 'VIETQR';
  items: { wineId: number; quantity: number }[];
}

export interface PaymentStatusResponse {
  orderId: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  amount: number;
}

export const orderApi = {
  // Lấy danh sách lịch sử đơn hàng của khách hàng từ Backend
  async getMyOrders(): Promise<Order[]> {
    const response = await apiClient.get<Order[]>('/orders/my-orders');
    return response.data || [];
  },

  // Chi tiết đơn hàng từ Backend
  async getOrderDetail(orderId: number): Promise<Order> {
    const response = await apiClient.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  // Hủy đơn hàng hoặc gửi yêu cầu hủy sang Backend
  async cancelOrder(orderId: number, reason: string): Promise<Order> {
    const response = await apiClient.post<Order>(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  // Xem trước tóm tắt đơn hàng (tính tiền hàng, VAT 10%, ship 30k) từ Backend
  async calculateCheckoutSummary(request: CheckoutSummaryRequest): Promise<CheckoutSummaryResponse> {
    const response = await apiClient.post<CheckoutSummaryResponse>('/orders/checkout-summary', request);
    return response.data;
  },

  // Đặt hàng (Place Order) qua Backend
  async placeOrder(request: PlaceOrderRequest): Promise<Order> {
    const response = await apiClient.post<Order>('/orders/place-order', request);
    return response.data;
  },

  // Kiểm tra trạng thái thanh toán đơn hàng (polling) từ Backend
  async getPaymentStatus(orderId: number): Promise<PaymentStatusResponse> {
    const response = await apiClient.get<PaymentStatusResponse>(`/orders/${orderId}/payment-status`);
    return response.data;
  },

  // Tiếp tục thanh toán (Resume Payment) qua Backend
  async resumePayment(orderId: number): Promise<Order> {
    const response = await apiClient.post<Order>(`/orders/${orderId}/resume-payment`);
    return response.data;
  },
};
