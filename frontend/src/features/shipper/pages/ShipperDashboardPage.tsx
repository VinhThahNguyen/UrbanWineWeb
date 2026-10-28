import React, { useEffect, useState, useMemo } from 'react';
import { 
  Bell, 
  Phone, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Coins, 
  ClipboardList, 
  Home as HomeIcon, 
  Package, 
  User as UserIcon,
  Pin,
  Wine,
  Sparkles,
  Wifi,
  Signal,
  BatteryMedium
} from 'lucide-react';
import { ShipperOrder, ShipperNotification, ShiftStats } from '../types/shipper';
import { shipperService } from '../services/shipperService';
import { ShipperConfirmModal, ShipperToastType } from '../components/ShipperConfirmModal';
import '../styles/shipper.css';

interface ShipperDashboardPageProps {
  onNavigateToDetail?: (orderId: number) => void;
  onNavigateToOrders?: () => void;
  onNavigateToProfile?: () => void;
}

export const ShipperDashboardPage: React.FC<ShipperDashboardPageProps> = ({
  onNavigateToDetail,
  onNavigateToOrders,
  onNavigateToProfile,
}) => {
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [notifications, setNotifications] = useState<ShipperNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pinnedId, setPinnedId] = useState<number | null>(shipperService.getPinnedOrderId());
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Custom modal thông báo
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    type: ShipperToastType;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'INFO',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Tải thông tin shipper & danh sách đơn hàng thực tế từ backend
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('urbanwine_user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.error('Failed to parse current user', e);
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersData, notifsData] = await Promise.all([
          shipperService.getMyOrders(),
          shipperService.getNotifications().catch(() => [] as ShipperNotification[]),
        ]);
        setOrders(ordersData || []);
        setNotifications(notifsData || []);
      } catch (err) {
        console.error('Error fetching shipper data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Xác định đơn hàng ưu tiên tiếp theo (Đã Ghim hoặc Đơn SHIPPING mới nhất)
  const nextDelivery = useMemo(() => {
    return shipperService.resolveNextDelivery(orders);
  }, [orders, pinnedId]);

  // Đếm đơn đang chờ trong hàng đợi
  const queuedOrdersCount = useMemo(() => {
    const shippingOrders = orders.filter((o) => o.orderStatus === 'SHIPPING');
    return nextDelivery ? Math.max(0, shippingOrders.length - 1) : shippingOrders.length;
  }, [orders, nextDelivery]);

  // Tính toán số liệu thống kê ca trực trong ngày (Completed, Pending, COD collected)
  const stats: ShiftStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    let completed = 0;
    let pending = 0;
    let codAmount = 0;

    orders.forEach((o) => {
      // Đơn đang giao
      if (o.orderStatus === 'SHIPPING') {
        pending += 1;
      }
      // Đơn đã hoàn tất hôm nay
      if (o.orderStatus === 'COMPLETED') {
        const orderDate = (o.completedAt || o.createdAt || '').slice(0, 10);
        if (orderDate === today) {
          completed += 1;
          if (o.paymentMethod === 'COD') {
            codAmount += (o.totalAmount || 0);
          }
        }
      }
    });

    return {
      completedCount: completed,
      pendingCount: pending,
      codCollectedAmount: codAmount,
    };
  }, [orders]);

  // Xử lý bật/tắt ghim đơn hàng
  const handleTogglePin = (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinnedId === orderId) {
      shipperService.setPinnedOrderId(null);
      setPinnedId(null);
    } else {
      shipperService.setPinnedOrderId(orderId);
      setPinnedId(orderId);
    }
  };

  // Format tiền tệ Việt Nam (VNĐ hoặc triệu VNĐ)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  const formatShortMillion = (val: number) => {
    if (val === 0) return '0đ';
    const mil = val / 1_000_000;
    return `${mil.toFixed(2)}Mđ`;
  };

  // Lấy tên người dùng hiển thị
  const shipperName = currentUser?.fullName || currentUser?.name || 'Shipper';

  // Số lượng thông báo chưa đọc
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="shipper-viewport-container">
      <div className="shipper-app-frame">
        {/* Status Bar mô phỏng smartphone */}
        <div className="shipper-status-bar">
          <span>9:41</span>
          <div className="shipper-status-island" />
          <div className="shipper-status-icons">
            <Signal size={13} />
            <Wifi size={13} />
            <BatteryMedium size={14} />
          </div>
        </div>

        {/* Brand Header */}
        <div className="shipper-brand-header">
          <button 
            type="button" 
            className="shipper-brand-avatar-btn" 
            onClick={onNavigateToProfile}
            title="Trang cá nhân của bạn"
          >
            <div className="shipper-brand-avatar-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserIcon size={22} color="#d4af37" />
            </div>
          </button>

          <div className="shipper-brand-center">
            <div className="shipper-brand-name">URBAN WINE</div>
            <div className="shipper-brand-sub">COURIER DISPATCH</div>
          </div>

          <button 
            type="button" 
            className="shipper-bell-btn" 
            title="Thông báo"
            onClick={() => {
              setCustomAlert({
                isOpen: true,
                type: 'INFO',
                title: 'Hộp thư thông báo',
                message: unreadNotifCount > 0 
                  ? `Bạn có ${unreadNotifCount} thông báo điều phối mới từ Quản trị viên cửa hàng!` 
                  : 'Hiện tại bạn chưa có thông báo mới nào.',
                onConfirm: () => {},
              });
            }}
          >
            <Bell size={18} />
            {unreadNotifCount > 0 && <span className="shipper-bell-badge" />}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="shipper-content-scroll">
          {/* Lời chào & Ngày hiện tại */}
          <div className="shipper-greeting-section">
            <div className="shipper-date-label">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 className="shipper-greeting-title">
              Xin chào, <span>{shipperName}.</span>
            </h1>
            <p className="shipper-greeting-sub">A little care. An exceptional delivery.</p>
          </div>

          {/* Trạng thái ca trực thực tế (isOnline: Sẵn sàng nhận đơn) */}
          <div className="shipper-duty-card">
            <div className="shipper-duty-left">
              <span className="shipper-duty-dot" />
              <span className="shipper-duty-text">Đang trực tuyến: Sẵn sàng nhận đơn</span>
            </div>
            <div className="shipper-duty-right">
              <Sparkles size={14} color="#d4af37" />
              <span>Hệ thống phân luồng</span>
            </div>
          </div>

          {/* Section: Your next delivery */}
          <div className="shipper-section-head">
            <span className="shipper-section-title">Your next delivery</span>
            <span className="shipper-priority-tag">
              {pinnedId && nextDelivery?.orderId === pinnedId ? '★ PINNED BY YOU' : 'PRIORITY 01'}
            </span>
          </div>

          {nextDelivery ? (
            <div className="shipper-next-card">
              <div className="shipper-card-top">
                <span className="shipper-badge-status">
                  <span className="shipper-badge-status-dot" />
                  OUT FOR DELIVERY
                </span>

                <button
                  type="button"
                  className="shipper-pin-icon-btn"
                  onClick={(e) => handleTogglePin(nextDelivery.orderId, e)}
                  title={pinnedId === nextDelivery.orderId ? 'Bỏ ghim đơn này' : 'Ghim đơn hàng ưu tiên này lên đầu'}
                >
                  <Pin 
                    size={17} 
                    fill={pinnedId === nextDelivery.orderId ? '#d4af37' : 'none'} 
                    color="#d4af37" 
                  />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="shipper-order-code">#{nextDelivery.orderCode}</span>
                <span className="shipper-collection-type">
                  {nextDelivery.paymentMethod === 'COD' ? 'COD COLLECTION' : 'PREPAID ONLINE'}
                </span>
              </div>

              <div className="shipper-total-amount">
                {nextDelivery.paymentMethod === 'COD' 
                  ? formatCurrency(nextDelivery.totalAmount) 
                  : '0đ (Đã thanh toán)'}
              </div>

              <div className="shipper-divider" />

              {/* Thông tin người nhận & nút gọi nhanh */}
              <div className="shipper-info-row">
                <div className="shipper-info-left">
                  <span>{nextDelivery.recipientName}</span>
                </div>
                <div className="shipper-phone-action">
                  <span>{nextDelivery.recipientPhone}</span>
                  <a 
                    href={`tel:${nextDelivery.recipientPhone}`} 
                    className="shipper-call-circle"
                    title="Gọi ngay cho người nhận"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={14} />
                  </a>
                </div>
              </div>

              {/* Địa chỉ giao */}
              <div className="shipper-address-row">
                <MapPin size={16} className="shipper-address-icon" />
                <div>
                  <div className="shipper-address-text">{nextDelivery.deliveryAddress}</div>
                </div>
              </div>

              {/* Thông tin kiện hàng rượu vang */}
              <div className="shipper-wine-preview-box">
                <div className="shipper-wine-img-box">
                  {nextDelivery.items && nextDelivery.items[0]?.wineImageUrl ? (
                    <img 
                      src={nextDelivery.items[0].wineImageUrl} 
                      alt="Wine bottle" 
                      className="shipper-wine-img" 
                    />
                  ) : (
                    <Wine size={20} color="#d4af37" />
                  )}
                </div>
                <div className="shipper-wine-details">
                  <div className="shipper-wine-name">
                    {nextDelivery.items?.[0]?.wineName || 'Vang hảo hạng'}
                  </div>
                  <div className="shipper-wine-sub">
                    <span>{nextDelivery.items?.reduce((sum, it) => sum + it.quantity, 0) || 1} chai</span>
                    <span>•</span>
                    <span className="shipper-wine-care-tag">Handle with care</span>
                  </div>
                </div>
              </div>

              {/* Nút to Open Delivery Task */}
              <button
                type="button"
                className="shipper-action-btn-primary"
                onClick={() => onNavigateToDetail?.(nextDelivery.orderId)}
              >
                <span>OPEN DELIVERY TASK</span>
                <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <div className="shipper-empty-delivery">
              <ClipboardList size={38} className="shipper-empty-icon" />
              <div className="shipper-empty-title">Không có đơn hàng nào đang giao</div>
              <div className="shipper-empty-sub">
                Các đơn hàng mới được điều phối sẽ tự động xuất hiện tại đây.
              </div>
            </div>
          )}

          {/* Section: Today's Shift Overview */}
          <div className="shipper-section-head">
            <span className="shipper-section-title">Today's shift</span>
            <span className="shipper-priority-tag">LIVE OVERVIEW</span>
          </div>

          <div className="shipper-stats-grid">
            <div className="shipper-stat-box">
              <div className="shipper-stat-header">
                <CheckCircle2 size={16} color="#22c55e" />
              </div>
              <div className="shipper-stat-value">
                {stats.completedCount} <span>orders</span>
              </div>
              <div className="shipper-stat-label">Completed</div>
            </div>

            <div className="shipper-stat-box">
              <div className="shipper-stat-header">
                <Clock size={16} color="#e5be3e" />
              </div>
              <div className="shipper-stat-value">
                {stats.pendingCount} <span>orders</span>
              </div>
              <div className="shipper-stat-label">Pending</div>
            </div>

            <div className="shipper-stat-box">
              <div className="shipper-stat-header">
                <Coins size={16} color="#d4af37" />
              </div>
              <div className="shipper-stat-value">
                {formatShortMillion(stats.codCollectedAmount)}
              </div>
              <div className="shipper-stat-label">COD collected</div>
            </div>
          </div>

          {/* Assigned Orders Queue Shortcut */}
          <div 
            className="shipper-queue-card"
            onClick={onNavigateToOrders}
          >
            <div className="shipper-queue-left">
              <div className="shipper-queue-icon-wrap">
                <Package size={18} />
              </div>
              <div>
                <div className="shipper-queue-title">Assigned Orders Queue</div>
                <div className="shipper-queue-sub">
                  {queuedOrdersCount > 0 
                    ? `${queuedOrdersCount} đơn đang xếp hàng chờ bạn giao tiếp`
                    : 'Không còn đơn nào chờ trong hàng đợi'}
                </div>
              </div>
            </div>
            <ArrowRight size={18} className="shipper-queue-arrow" />
          </div>

          {/* Slogan */}
          <div className="shipper-brand-slogan">
            PREMIUM WINE • PERSONAL CARE
          </div>
        </div>

        {/* Bottom Navigation */}
        <nav className="shipper-bottom-nav">
          <button type="button" className="shipper-nav-item active">
            <HomeIcon size={19} />
            <span>Home</span>
          </button>
          <button type="button" className="shipper-nav-item" onClick={onNavigateToOrders}>
            <Package size={19} />
            <span>Orders</span>
          </button>
          <button type="button" className="shipper-nav-item" onClick={onNavigateToProfile}>
            <UserIcon size={19} />
            <span>Profile</span>
          </button>
        </nav>

        {/* Custom Confirmation Popup Modal */}
        <ShipperConfirmModal
          isOpen={customAlert.isOpen}
          type={customAlert.type}
          title={customAlert.title}
          message={customAlert.message}
          onConfirm={customAlert.onConfirm}
          onClose={() => setCustomAlert((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
};
