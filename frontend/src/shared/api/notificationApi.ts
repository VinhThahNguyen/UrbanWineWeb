import { apiClient } from './client';

export interface AppNotification {
  notificationId: number;
  title: string;
  message: string;
  type: 'ORDER_REJECTED' | 'ORDER_APPROVED' | 'ORDER_SHIPPING' | 'ORDER_STATUS_CHANGED' | 'PAYMENT_SUCCESS' | 'GENERAL' | string;
  orderId?: number;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  getNotifications: async (): Promise<AppNotification[]> => {
    const res = await apiClient.get<AppNotification[]>('/notifications');
    return res.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
