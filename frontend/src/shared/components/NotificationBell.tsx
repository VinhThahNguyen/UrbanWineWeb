import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, XCircle, CheckCircle2, Truck, Info, Clock, ExternalLink } from 'lucide-react';
import { notificationApi, AppNotification } from '@/shared/api/notificationApi';
import { websocketService } from '@/realtime/websocketService';
import './NotificationBell.css';

interface NotificationBellProps {
  currentUser?: any;
  onViewOrder?: (orderId?: number) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser, onViewOrder }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tải danh sách thông báo từ API khi đã đăng nhập
  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.warn('Không thể tải danh sách thông báo:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    loadNotifications();

    // Kết nối WebSocket với email của user
    const email = currentUser.email || currentUser.username;
    websocketService.connect(email);

    // Lắng nghe thông báo Realtime từ WebSocket
    const unsubscribe = websocketService.subscribe((msg) => {
      // Nếu message thuộc về user này (hoặc broadcast)
      const newNotif: AppNotification = {
        notificationId: Date.now(),
        title: msg.title || 'Thông báo đơn hàng',
        message: msg.reason ? `${msg.message} (Lý do: "${msg.reason}")` : msg.message,
        type: msg.type,
        orderId: msg.orderId,
        isRead: false,
        createdAt: msg.timestamp || new Date().toISOString(),
      };

      // Đẩy thông báo mới lên đầu danh sách
      setNotifications((prev) => [newNotif, ...prev]);

      // Hiển thị Toast thông báo nổi góc màn hình
      setToastNotification(newNotif);
      setTimeout(() => {
        setToastNotification((curr) => (curr?.notificationId === newNotif.notificationId ? null : curr));
      }, 7000);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.email, currentUser?.id]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (notif: AppNotification) => {
    if (notif.isRead) return;
    try {
      if (notif.notificationId > 1000000000000) {
        // Tạm thời ID realtime client-side
      } else {
        await notificationApi.markAsRead(notif.notificationId);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notif.notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.warn('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.warn('Error marking all as read:', err);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const handleItemClick = (notif: AppNotification) => {
    handleMarkAsRead(notif);
    setIsOpen(false);
    if (onViewOrder && notif.orderId) {
      onViewOrder(notif.orderId);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return 'Vừa xong';
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'ORDER_REJECTED':
        return <XCircle size={18} className="notif-icon-danger" />;
      case 'ORDER_APPROVED':
        return <CheckCircle2 size={18} className="notif-icon-success" />;
      case 'ORDER_SHIPPING':
        return <Truck size={18} className="notif-icon-shipping" />;
      default:
        return <Info size={18} className="notif-icon-info" />;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Thông báo đơn hàng"
        aria-label="Thông báo"
      >
        <Bell size={20} className={unreadCount > 0 ? 'bell-ringing' : ''} />
        {unreadCount > 0 && (
          <span className="notification-count-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Realtime Toast Pop-up */}
      {toastNotification && (
        <div className="realtime-toast-alert" onClick={() => handleItemClick(toastNotification)}>
          <div className="toast-icon-wrap">
            {getNotifIcon(toastNotification.type)}
          </div>
          <div className="toast-body">
            <div className="toast-title">{toastNotification.title}</div>
            <div className="toast-message">{toastNotification.message}</div>
            <div className="toast-hint">Nhấn để xem chi tiết đơn hàng</div>
          </div>
          <button
            className="toast-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setToastNotification(null);
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="notification-dropdown-menu">
          <div className="dropdown-header">
            <div className="dropdown-title-row">
              <span className="dropdown-title">Thông báo của bạn</span>
              {unreadCount > 0 && (
                <span className="dropdown-unread-pill">{unreadCount} mới</span>
              )}
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                className="btn-mark-all-read"
                onClick={handleMarkAllAsRead}
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck size={14} />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          <div className="dropdown-content-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <Bell size={32} className="empty-bell-icon" />
                <p className="empty-notif-title">Chưa có thông báo nào</p>
                <p className="empty-notif-sub">
                  Khi đơn hàng của bạn được duyệt, giao hàng hoặc bị từ chối, thông báo sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.notificationId}
                  className={`notif-item-row ${!item.isRead ? 'unread' : ''} notif-type-${item.type?.toLowerCase()}`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="notif-item-icon">{getNotifIcon(item.type)}</div>
                  <div className="notif-item-content">
                    <div className="notif-item-top">
                      <span className="notif-item-title">{item.title}</span>
                      <span className="notif-item-time">
                        <Clock size={11} /> {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="notif-item-msg">{item.message}</p>
                    {item.orderId && (
                      <span className="notif-item-action-link">
                        Xem đơn hàng #{item.orderId} <ExternalLink size={11} />
                      </span>
                    )}
                  </div>
                  {!item.isRead && <div className="unread-dot-badge" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
