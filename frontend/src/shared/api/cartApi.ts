import { apiClient } from './client';

export interface BackendCartItem {
  cartItemId: number;
  wineId: number;
  wineName: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  stockQuantity?: number;
  itemSubtotal: number;
}

export interface BackendCartResponse {
  cartId: number;
  items: BackendCartItem[];
  totalItems: number;
  cartSubtotal: number;
}

export const cartApi = {
  /**
   * Lấy toàn bộ giỏ hàng của user hiện tại từ Database
   */
  getCart: async (): Promise<BackendCartResponse> => {
    const res = await apiClient.get<BackendCartResponse>('/cart');
    return res.data;
  },

  /**
   * Thêm sản phẩm vào giỏ hàng trong Database
   */
  addItem: async (wineId: number, quantity: number): Promise<BackendCartResponse> => {
    const res = await apiClient.post<BackendCartResponse>('/cart/items', { wineId, quantity });
    return res.data;
  },

  /**
   * Cập nhật số lượng sản phẩm trong Database
   */
  updateQuantity: async (cartItemId: number, quantity: number): Promise<BackendCartResponse> => {
    const res = await apiClient.put<BackendCartResponse>(`/cart/items/${cartItemId}`, { quantity });
    return res.data;
  },

  /**
   * Xóa sản phẩm khỏi giỏ hàng trong Database
   */
  removeItem: async (cartItemId: number): Promise<BackendCartResponse> => {
    const res = await apiClient.delete<BackendCartResponse>(`/cart/items/${cartItemId}`);
    return res.data;
  },
};
