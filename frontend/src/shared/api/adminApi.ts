import { apiClient } from './client';

export interface AdminOrderSummary {
  orderId: number;
  orderCode: string;
  recipientName: string;
  totalAmount: number;
  orderStatus: 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
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
  // Lấy danh sách đơn hàng cho Admin
  getAdminOrders: async (page = 0, size = 10, status?: string) => {
    try {
      const response = await apiClient.get('/admin/orders', {
        params: { page, size, ...(status ? { status } : {}) },
      });
      return response.data;
    } catch (error) {
      console.warn('Backend /admin/orders returned error, using fallback state:', error);
      return null;
    }
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
