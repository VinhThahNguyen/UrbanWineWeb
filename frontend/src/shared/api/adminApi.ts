import { apiClient } from './client';

export interface AdminOrderItemDetail {
  orderDetailId: number;
  wineId: number;
  wineName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  itemSubtotal: number;
}

export interface AdminOrderSummary {
  orderId: number;
  orderCode: string;
  recipientName: string;
  recipientPhone?: string;
  deliveryAddress?: string;
  totalAmount: number;
  merchandiseSubtotal?: number;
  vatAmount?: number;
  shippingFee?: number;
  orderStatus: 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
  cancelStatus?: string;
  cancellationReason?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  shipperName?: string;
  shipperPhone?: string;
  items?: AdminOrderItemDetail[];
}

export interface AdminOrderCounts {
  ALL: number;
  PENDING: number;
  PROCESSING: number;
  SHIPPING: number;
  COMPLETED: number;
  CANCELLED: number;
}

export interface LowStockAlertItem {
  wineId: number;
  wineName: string;
  categoryName: string;
  storageLocation: string;
  stockQuantity: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  revenueGrowthPercent: number;
  activeOrders: number;
  pendingOrdersCount: number;
  lowStockItemsCount: number;
  criticalStockCount: number;
  registeredCustomers: number;
  newCustomersThisWeek: number;
}

export const adminApi = {
  // Lấy danh sách đơn hàng thực tế từ database cho Admin
  getAdminOrders: async (page = 0, size = 20, status?: string, all = false) => {
    const response = await apiClient.get('/admin/orders', {
      params: { page, size, ...(status ? { status } : {}), ...(all ? { all: true } : {}) },
    });
    return response.data;
  },

  // Lấy số lượng đơn hàng theo từng trạng thái từ database
  getOrderCounts: async (): Promise<AdminOrderCounts> => {
    const response = await apiClient.get('/admin/orders/counts');
    return response.data;
  },

  // Lấy chi tiết toàn bộ đơn hàng
  getAdminOrderDetail: async (orderId: number): Promise<AdminOrderSummary> => {
    const response = await apiClient.get(`/admin/orders/${orderId}`);
    return response.data;
  },

  // Từ chối đơn hàng kèm lý do
  rejectOrder: async (orderId: number, rejectionReason: string) => {
    const response = await apiClient.post(`/admin/orders/${orderId}/reject`, { rejectionReason });
    return response.data;
  },

  // Lấy cảnh báo tồn kho thấp cho Admin
  getStockAlerts: async (page = 0, size = 10, keyword?: string) => {
    try {
      const response = await apiClient.get('/admin/wines/stock-alerts', {
        params: { page, size, ...(keyword ? { keyword } : {}) },
      });
      return response.data;
    } catch (error) {
      console.warn('Backend /admin/wines/stock-alerts returned error, using fallback state:', error);
      return null;
    }
  },

  // Tạo đơn hàng offline tại quầy (+ Quick Order)
  createOfflineOrder: async (orderData: any) => {
    const response = await apiClient.post('/admin/orders/offline', orderData);
    return response.data;
  },

  // Phê duyệt đơn hàng
  approveOrder: async (orderId: number) => {
    const response = await apiClient.post(`/admin/orders/${orderId}/approve`);
    return response.data;
  },

  // Lấy danh mục rượu quản trị để chọn rượu khi tạo đơn nhanh
  getAdminWineCatalog: async (page = 0, size = 50) => {
    try {
      const response = await apiClient.get('/admin/wines', {
        params: { page, size, isActive: true },
      });
      return response.data;
    } catch (error) {
      console.warn('Backend /admin/wines returned error:', error);
      return null;
    }
  },
};
