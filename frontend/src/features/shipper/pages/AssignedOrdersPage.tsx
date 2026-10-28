import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Pin, 
  ChevronRight, 
  Package, 
  ClipboardList,
  Home as HomeIcon,
  User as UserIcon,
  Signal,
  Wifi,
  BatteryMedium
} from 'lucide-react';
import { ShipperOrder } from '../types/shipper';
import { shipperService } from '../services/shipperService';

interface AssignedOrdersPageProps {
  onBackToHome: () => void;
  onSelectOrder: (orderId: number) => void;
  onNavigateToProfile: () => void;
}

export const AssignedOrdersPage: React.FC<AssignedOrdersPageProps> = ({
  onBackToHome,
  onSelectOrder,
  onNavigateToProfile,
}) => {
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pinnedId, setPinnedId] = useState<number | null>(shipperService.getPinnedOrderId());

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await shipperService.getMyOrders();
      setOrders(data || []);
    } catch (e) {
      console.error('Failed to load shipper orders', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  const activeOrders = orders.filter((o) => o.orderStatus === 'SHIPPING');
  const otherOrders = orders.filter((o) => o.orderStatus !== 'SHIPPING');

  return (
    <div className="shipper-viewport-container">
      <div className="shipper-app-frame">
        {/* Status Bar */}
        <div className="shipper-status-bar">
          <span>9:41</span>
          <div className="shipper-status-island" />
          <div className="shipper-status-icons">
            <Signal size={13} />
            <Wifi size={13} />
            <BatteryMedium size={14} />
          </div>
        </div>

        {/* Topbar */}
        <div className="shipper-detail-topbar">
          <button type="button" className="shipper-back-btn" onClick={onBackToHome}>
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Content */}
        <div className="shipper-content-scroll" style={{ paddingBottom: '5.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 className="shipper-detail-title">Assigned Orders ({orders.length})</h2>
            <p className="shipper-greeting-sub">Your route. Your rhythm. Pin a delivery to make it your next stop.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.5rem', fontSize: '0.72rem', color: '#22c55e', fontWeight: 600 }}>
              <span className="shipper-duty-dot" />
              <span>{activeOrders.length} ACTIVE DELIVERIES</span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: '#d4af37' }}>
              <span>Đang tải danh sách đơn hàng...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="shipper-empty-delivery">
              <ClipboardList size={38} className="shipper-empty-icon" />
              <div className="shipper-empty-title">Chưa có đơn hàng nào được phân công</div>
              <div className="shipper-empty-sub">Hãy chờ Quản lý cửa hàng điều phối đơn mới cho bạn.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {orders.map((order, idx) => {
                const isPinned = pinnedId === order.orderId;
                const isShipping = order.orderStatus === 'SHIPPING';

                return (
                  <div
                    key={order.orderId}
                    className={`shipper-order-list-card ${isPinned ? 'pinned' : ''}`}
                    onClick={() => onSelectOrder(order.orderId)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="shipper-list-num">{String(idx + 1).padStart(2, '0')}</span>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                          #{order.orderCode}
                        </span>
                      </div>

                      {isShipping && (
                        <button
                          type="button"
                          className="shipper-pin-icon-btn"
                          onClick={(e) => handleTogglePin(order.orderId, e)}
                          title={isPinned ? 'Bỏ ghim' : 'Ghim đơn ưu tiên này'}
                        >
                          <Pin size={16} fill={isPinned ? '#d4af37' : 'none'} color="#d4af37" />
                        </button>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span className="shipper-badge-status" style={{ fontSize: '0.62rem' }}>
                        <span className="shipper-badge-status-dot" />
                        {order.orderStatus === 'SHIPPING' ? 'DELIVERING NOW' : order.orderStatus}
                      </span>
                    </div>

                    {/* Address */}
                    <div className="shipper-address-row" style={{ marginBottom: '0.65rem' }}>
                      <MapPin size={14} className="shipper-address-icon" />
                      <div className="shipper-address-text" style={{ fontSize: '0.78rem' }}>
                        {order.deliveryAddress}
                      </div>
                    </div>

                    {/* Amount & Method */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d4af37' }}>
                        {order.paymentMethod === 'COD' 
                          ? `COD: ${formatCurrency(order.totalAmount)}`
                          : 'Prepaid Online (0đ)'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: '#9ca3af' }}>
                        <span>View Details</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <nav className="shipper-bottom-nav">
          <button type="button" className="shipper-nav-item" onClick={onBackToHome}>
            <HomeIcon size={19} />
            <span>Home</span>
          </button>
          <button type="button" className="shipper-nav-item active">
            <Package size={19} />
            <span>Orders</span>
          </button>
          <button type="button" className="shipper-nav-item" onClick={onNavigateToProfile}>
            <UserIcon size={19} />
            <span>Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
