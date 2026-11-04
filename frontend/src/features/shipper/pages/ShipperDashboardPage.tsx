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

  // Custom notification modal
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

  // Load shipper info & real orders from backend
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

  // Determine next priority delivery (Pinned or newest SHIPPING order)
  const nextDelivery = useMemo(() => {
    return shipperService.resolveNextDelivery(orders);
  }, [orders, pinnedId]);

  // Count orders waiting in queue
  const queuedOrdersCount = useMemo(() => {
    const shippingOrders = orders.filter((o) => o.orderStatus === 'SHIPPING');
    return nextDelivery ? Math.max(0, shippingOrders.length - 1) : shippingOrders.length;
  }, [orders, nextDelivery]);

  // Calculate shift stats (Completed, Pending, COD collected)
  const stats: ShiftStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    let completed = 0;
    let pending = 0;
    let codAmount = 0;

    orders.forEach((o) => {
      // Active delivery
      if (o.orderStatus === 'SHIPPING') {
        pending += 1;
      }
      // Completed delivery today
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

  // Handle pin/unpin order
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

  // Format VND Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + '₫';
  };

  const formatShortMillion = (val: number) => {
    if (val === 0) return '0₫';
    const mil = val / 1_000_000;
    return `${mil.toFixed(2)}M₫`;
  };

  // Get display name
  const shipperName = currentUser?.fullName || currentUser?.name || 'Shipper';

  // Unread notification count
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="shipper-viewport-container">
      <div className="shipper-app-frame">
        {/* Smartphone Status Bar */}
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
            title="Your profile"
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
            title="Notifications"
            onClick={() => {
              setCustomAlert({
                isOpen: true,
                type: 'INFO',
                title: 'Notifications',
                message: unreadNotifCount > 0 
                  ? `You have ${unreadNotifCount} new dispatch notifications!` 
                  : 'No new notifications.',
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
          {/* Greeting & Date */}
          <div className="shipper-greeting-section">
            <div className="shipper-date-label">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 className="shipper-greeting-title">
              Hello, <span>{shipperName}.</span>
            </h1>
            <p className="shipper-greeting-sub">A little care. An exceptional delivery.</p>
          </div>

          {/* Duty status */}
          <div className="shipper-duty-card">
            <div className="shipper-duty-left">
              <span className="shipper-duty-dot" />
              <span className="shipper-duty-text">Online: Ready for orders</span>
            </div>
            <div className="shipper-duty-right">
              <Sparkles size={14} color="#d4af37" />
              <span>Dispatch Active</span>
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
                  title={pinnedId === nextDelivery.orderId ? 'Unpin this order' : 'Pin this delivery to top'}
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
                  : '0₫ (Prepaid)'}
              </div>

              <div className="shipper-divider" />

              {/* Recipient info & quick call */}
              <div className="shipper-info-row">
                <div className="shipper-info-left">
                  <span>{nextDelivery.recipientName}</span>
                </div>
                <div className="shipper-phone-action">
                  <span>{nextDelivery.recipientPhone}</span>
                  <a 
                    href={`tel:${nextDelivery.recipientPhone}`} 
                    className="shipper-call-circle"
                    title="Call customer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={14} />
                  </a>
                </div>
              </div>

              {/* Delivery address */}
              <div className="shipper-address-row">
                <MapPin size={16} className="shipper-address-icon" />
                <div>
                  <div className="shipper-address-text">{nextDelivery.deliveryAddress}</div>
                </div>
              </div>

              {/* Wine bottles summary */}
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
                    {nextDelivery.items?.[0]?.wineName || 'Fine Wine'}
                  </div>
                  <div className="shipper-wine-sub">
                    <span>{nextDelivery.items?.reduce((sum, it) => sum + it.quantity, 0) || 1} bottles</span>
                    <span>•</span>
                    <span className="shipper-wine-care-tag">Handle with care</span>
                  </div>
                </div>
              </div>

              {/* Button to Open Delivery Task */}
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
              <div className="shipper-empty-title">No deliveries in progress</div>
              <div className="shipper-empty-sub">
                New assigned orders will appear here automatically.
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
                    ? `${queuedOrdersCount} orders waiting in queue` 
                    : 'No orders waiting in queue'}
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
