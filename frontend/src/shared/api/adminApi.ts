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
  customerId?: number;
  customerEmail?: string;
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

export interface ShipperWorkloadItem {
  shipperId: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  currentActiveOrders: number;
  maxOrders: number;
  canAssign: boolean;
  isOnline: boolean;
}

export interface WineAdminResponse {
  wineId: number;
  wineName: string;
  wineryName: string;
  categoryId: number;
  categoryName: string;
  origin: string;
  grapeVariety: string;
  vintageYear?: number;
  description: string;
  price: number;
  abv: number;
  stockQuantity: number;
  imageUrl: string;
  isActive: boolean;
  isOutOfStock: boolean;
}

export interface CategoryItem {
  categoryId: number;
  categoryName: string;
  description?: string;
}

export interface WineCreatePayload {
  wineName: string;
  wineryName: string;
  categoryId: number;
  origin: string;
  grapeVariety: string;
  vintageYear?: number | null;
  description: string;
  price: number;
  abv: number;
  stockQuantity: number;
  imageUrl: string;
}

export interface WineUpdatePayload {
  wineName: string;
  wineryName: string;
  categoryId: number;
  origin: string;
  grapeVariety: string;
  vintageYear?: number | null;
  description: string;
  price: number;
  abv: number;
  addedStockQuantity?: number;
  imageUrl?: string;
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
    const response = await apiClient.post(`/admin/orders/${orderId}/reject`, {
      reason: rejectionReason,
      rejectionReason: rejectionReason,
    });
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

  // Lấy danh sách Shipper đang trực tuyến (Online) từ cơ sở dữ liệu
  getAvailableShippers: async (): Promise<ShipperWorkloadItem[]> => {
    try {
      const response = await apiClient.get('/admin/orders/available-shippers');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn('Lỗi khi tải danh sách shipper khả dụng:', error);
      return [];
    }
  },

  // Phân công đơn hàng PROCESSING cho Shipper (Chuyển sang SHIPPING)
  assignShipper: async (orderId: number, shipperId: number, note?: string) => {
    const response = await apiClient.post(`/admin/orders/${orderId}/assign-shipper`, {
      shipperId,
      note,
    });
    return response.data;
  },

  // Điều phối lại sang Shipper khác
  reassignShipper: async (orderId: number, shipperId: number, note?: string) => {
    const response = await apiClient.post(`/admin/orders/${orderId}/reassign-shipper`, {
      shipperId,
      note,
    });
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

  // Lấy toàn bộ danh mục rượu từ database (/api/categories)
  getAllCategories: async (): Promise<CategoryItem[]> => {
    try {
      const response = await apiClient.get('/categories');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn('Lỗi khi tải danh mục rượu từ database:', error);
      return [];
    }
  },

  // Lấy danh sách rượu cho Admin với đầy đủ bộ lọc (UC_2.1.1)
  getAdminWines: async (params?: {
    keyword?: string;
    categoryId?: number;
    isActive?: boolean;
    page?: number;
    size?: number;
  }) => {
    const { keyword, categoryId, isActive, page = 0, size = 20 } = params || {};
    const response = await apiClient.get('/admin/wines', {
      params: {
        page,
        size,
        ...(keyword ? { keyword } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    return response.data;
  },

  // Xem chi tiết một sản phẩm rượu trong catalog của Admin
  getWineDetail: async (wineId: number): Promise<WineAdminResponse> => {
    const response = await apiClient.get(`/admin/wines/${wineId}`);
    return response.data;
  },

  // Thêm mới sản phẩm rượu vào danh mục (UC_2.1.1 Alt Flow 1)
  createWine: async (payload: WineCreatePayload): Promise<WineAdminResponse> => {
    const response = await apiClient.post('/admin/wines', payload);
    return response.data;
  },

  // Cập nhật thông tin sản phẩm rượu (UC_2.1.1 Normal Flow 4)
  updateWine: async (wineId: number, payload: WineUpdatePayload): Promise<WineAdminResponse> => {
    const response = await apiClient.put(`/admin/wines/${wineId}`, payload);
    return response.data;
  },

  // Bật/tắt trạng thái kinh doanh của sản phẩm rượu (Active <-> Inactive)
  toggleWineStatus: async (wineId: number): Promise<WineAdminResponse> => {
    const response = await apiClient.patch(`/admin/wines/${wineId}/toggle-status`);
    return response.data;
  },
};
