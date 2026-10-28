export interface ShipperOrderItem {
  itemId: number;
  wineId: number;
  wineName: string;
  wineImageUrl?: string;
  vintage?: string;
  volume?: string;
  alcoholPercentage?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ShipperOrder {
  orderId: number;
  orderCode: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  merchandiseSubtotal: number;
  vatAmount: number;
  shippingFee: number;
  totalAmount: number;
  orderStatus: 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
  cancelStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  shipperId?: number;
  shipperName?: string;
  shipperPhone?: string;
  assignedAt?: string;
  shipperRejectStatus?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED';
  shipperRejectReason?: string;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  paymentMethod: 'COD' | 'VNPAY' | 'VIETQR';
  completedAt?: string;
  createdAt: string;
  items: ShipperOrderItem[];
}

export interface ShipperNotification {
  notificationId: number;
  title: string;
  message: string;
  type: string;
  orderId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface ShiftStats {
  completedCount: number;
  pendingCount: number;
  codCollectedAmount: number;
}
