import React, { useState, useEffect, useMemo } from 'react';
import {
  Wine as WineIcon,
  Search,
  ShoppingBag,
  User as UserIcon,
  Phone,
  MapPin,
  X,
  PhoneCall,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Order, OrderStatus, orderApi } from '@/shared/api/orderApi';
import './MyOrdersPage.css';

interface MyOrdersPageProps {
  currentUser?: any;
  cartCount?: number;
  onBackToCellar: () => void;
  onViewCart: () => void;
  onLogout?: () => void;
}

type TabType = 'ALL' | 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({
  currentUser,
  cartCount = 2,
  onBackToCellar,
  onViewCart,
  onLogout,
}) => {
  // Orders list state from backend database
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Cancel Modal state
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Tôi muốn thay đổi thông tin đơn hàng');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Load orders from backend API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await orderApi.getMyOrders();
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching orders from backend:', err);
      setErrorMsg(err?.response?.data?.message || 'Không thể tải danh sách đơn hàng từ máy chủ.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Format currency: 18.730.000₫
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  // Tab counters calculated dynamically
  const counts = useMemo(() => {
    return {
      ALL: orders.length,
      PENDING: orders.filter((o) => o.orderStatus === 'PENDING').length,
      PROCESSING: orders.filter((o) => o.orderStatus === 'PROCESSING').length,
      SHIPPING: orders.filter((o) => o.orderStatus === 'SHIPPING').length,
      COMPLETED: orders.filter((o) => o.orderStatus === 'COMPLETED').length,
      CANCELLED: orders.filter((o) => o.orderStatus === 'CANCELLED').length,
    };
  }, [orders]);

  // Filtered orders by active tab and search keyword
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter by tab
      if (activeTab !== 'ALL' && order.orderStatus !== activeTab) {
        return false;
      }
      // Filter by search keyword
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchesCode = order.orderCode.toLowerCase().includes(query);
        const matchesRecipient = order.recipientName.toLowerCase().includes(query);
        const matchesItems = order.items.some((it) => it.wineName.toLowerCase().includes(query));
        if (!matchesCode && !matchesRecipient && !matchesItems) return false;
      }
      return true;
    });
  }, [orders, activeTab, searchKeyword]);

  // Handle Cancel Order / Request Cancellation submit with Backend API
  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsSubmittingCancel(true);
    try {
      const updatedOrder = await orderApi.cancelOrder(cancellingOrder.orderId, cancelReason);
      setOrders((prev) =>
        prev.map((order) =>
          order.orderId === cancellingOrder.orderId ? updatedOrder : order
        )
      );
      setCancellingOrder(null);
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      alert(err?.response?.data?.message || 'Không thể thực hiện hủy đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Quick preset reasons
  const presetReasons = [
    'Tôi muốn thay đổi thông tin đơn hàng',
    'Đặt nhầm số lượng chai',
    'Muốn đổi phương thức thanh toán',
    'Tìm thấy giá ưu đãi hơn',
    'Lý do khác',
  ];

  const displayName = currentUser?.fullName || 'Thế Vinh';

  return (
    <div className="my-orders-container">
      {/* 1. TOP HEADER BAR */}
      <header className="orders-header">
        <div className="orders-header-left">
          {/* Brand Logo */}
          <div className="orders-brand" onClick={onBackToCellar}>
            <WineIcon size={24} className="orders-brand-icon" />
            <div className="orders-brand-titles">
              <span className="orders-brand-main">Urban Wine</span>
              <span className="orders-brand-sub">EXPRESS</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="orders-search-wrapper">
            <Search size={15} className="orders-search-icon" />
            <input
              type="text"
              placeholder="Vintage, region, winery..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="orders-search-input"
            />
          </div>
        </div>

        {/* Right Nav */}
        <div className="orders-header-right">
          <div className="orders-nav-tabs">
            <button className="orders-nav-pill" onClick={onBackToCellar}>
              Cellar
            </button>
            <button className="orders-nav-pill" onClick={onViewCart}>
              Cart
            </button>
            <button className="orders-nav-pill active">
              My Orders
            </button>
          </div>

          {/* Cart Icon */}
          <button className="orders-cart-btn" onClick={onViewCart} title="Xem giỏ hàng">
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="orders-cart-badge">{cartCount}</span>}
          </button>

          {/* User Profile Badge */}
          <div className="orders-user-pill static-pill" title="Tài khoản Khách hàng">
            <span>Xin chào, <strong>{displayName}</strong></span>
            <span className="orders-user-badge-red">TV</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN ORDERS BODY */}
      <main className="my-orders-main">
        {/* Title Section */}
        <div className="orders-title-section">
          <h1 className="orders-title">My Orders</h1>
          <p className="orders-subtitle">Track and manage your Urban Wine Express orders</p>
        </div>

        {/* 3. STATUS FILTER PILLS CONTAINER */}
        <div className="orders-filter-bar">
          <button
            className={`filter-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All Orders
            <span className="filter-count-badge">{counts.ALL}</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('PENDING')}
          >
            Pending
            <span className="filter-count-badge">{counts.PENDING}</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'PROCESSING' ? 'active' : ''}`}
            onClick={() => setActiveTab('PROCESSING')}
          >
            Processing
            <span className="filter-count-badge">{counts.PROCESSING}</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'SHIPPING' ? 'active' : ''}`}
            onClick={() => setActiveTab('SHIPPING')}
          >
            Out for Delivery
            <span className="filter-count-badge">{counts.SHIPPING}</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setActiveTab('COMPLETED')}
          >
            Completed
            <span className="filter-count-badge">{counts.COMPLETED}</span>
          </button>
          <button
            className={`filter-tab-btn ${activeTab === 'CANCELLED' ? 'active' : ''}`}
            onClick={() => setActiveTab('CANCELLED')}
          >
            Cancelled
            <span className="filter-count-badge">{counts.CANCELLED}</span>
          </button>
        </div>

        {/* 4. ORDERS LIST */}
        <div className="orders-list">
          {loading ? (
            <div className="orders-empty-state">
              <div className="spinner-pulse" style={{ width: 18, height: 18, marginBottom: 12 }}></div>
              <h3 className="empty-state-title">Đang kết nối cơ sở dữ liệu...</h3>
              <p className="empty-state-desc">Đang tải danh sách đơn hàng thực tế từ máy chủ Urban Wine Express.</p>
            </div>
          ) : errorMsg ? (
            <div className="orders-empty-state">
              <AlertCircle size={40} className="empty-state-icon" style={{ color: '#ef4444' }} />
              <h3 className="empty-state-title">{errorMsg}</h3>
              <p className="empty-state-desc">Quý khách vui lòng đăng nhập hoặc kiểm tra kết nối máy chủ.</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="orders-empty-state">
              <AlertCircle size={40} className="empty-state-icon" />
              <h3 className="empty-state-title">Chưa có đơn hàng nào</h3>
              <p className="empty-state-desc">
                Không tìm thấy đơn hàng nào trong mục này trên hệ thống. Quý khách có thể ghé thăm Hầm rượu để đặt hàng.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const totalBottles = order.items.reduce((sum, it) => sum + (it.quantity || 1), 0);

              return (
                <div key={order.orderId} className="order-card">
                  {/* Top Order Card Header */}
                  <div className="order-card-header">
                    <div className="order-header-left">
                      <span className="order-code-badge">{order.orderCode}</span>
                      <span className="order-created-time">{order.createdAt}</span>
                      <span className="order-bottle-count">{totalBottles} bottles</span>
                    </div>

                    <div className="order-header-right">
                      <span className="order-total-price">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <span className={`order-status-badge ${order.orderStatus.toLowerCase()}`}>
                        {order.orderStatus}
                      </span>
                    </div>
                  </div>

                  {/* Order Body: 2 Columns */}
                  <div className="order-card-body">
                    {/* Left Column: ITEMS ORDERED */}
                    <div className="order-col-section">
                      <div className="order-col-title">ITEMS ORDERED</div>
                      <div className="order-items-list">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-item-row">
                            <img
                              src={
                                item.imageUrl ||
                                'https://images.unsplash.com/photo-1558001373-a36c53d3957f?w=300&auto=format&fit=crop&q=80'
                              }
                              alt={item.wineName}
                              className="order-item-thumb"
                            />
                            <div className="order-item-info">
                              <span className="order-item-name">{item.wineName}</span>
                              <span className="order-item-meta">
                                {item.vintageYear || 2018} · {item.quantity} bottles
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: DELIVERY INFO */}
                    <div className="order-col-section">
                      <div className="order-col-title">DELIVERY INFO</div>
                      <div className="delivery-info-box">
                        <div className="delivery-row">
                          <UserIcon size={14} className="delivery-icon-user" />
                          <span className="delivery-name">{order.recipientName}</span>
                        </div>
                        <div className="delivery-row">
                          <Phone size={14} className="delivery-icon-phone" />
                          <span>{order.recipientPhone}</span>
                        </div>
                        <div className="delivery-row">
                          <MapPin size={14} className="delivery-icon-pin" />
                          <span>{order.deliveryAddress}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Progression Banner */}
                  {order.orderStatus === 'PROCESSING' && (
                    <div className="order-status-banner">
                      <span className="status-dot-purple"></span>
                      <span>Your order is being prepared at our cellar</span>
                    </div>
                  )}

                  {order.orderStatus === 'SHIPPING' && (
                    <div className="order-status-banner">
                      <span className="status-dot-purple"></span>
                      <span>Your wine is on the way — estimated delivery within 90 minutes</span>
                    </div>
                  )}

                  {/* Order Card Actions */}
                  <div className="order-card-actions">
                    {/* Status: PENDING -> Cancel Order button */}
                    {order.orderStatus === 'PENDING' && (
                      <button
                        className="btn-cancel-order"
                        onClick={() => {
                          setCancellingOrder(order);
                          setCancelReason('Tôi muốn thay đổi thông tin đơn hàng');
                        }}
                      >
                        CANCEL ORDER
                      </button>
                    )}

                    {/* Status: PROCESSING -> Request Cancellation button */}
                    {order.orderStatus === 'PROCESSING' && (
                      <button
                        className="btn-request-cancel"
                        onClick={() => {
                          setCancellingOrder(order);
                          setCancelReason('Đơn hàng cần điều chỉnh gấp, xin nhờ hỗ trợ');
                        }}
                      >
                        REQUEST CANCELLATION
                      </button>
                    )}

                    {/* Status: SHIPPING -> Call Store Hotline */}
                    {order.orderStatus === 'SHIPPING' && (
                      <a href="tel:19008888" className="btn-call-hotline">
                        <PhoneCall size={14} />
                        <span>Call Store Hotline</span>
                      </a>
                    )}

                    {/* Status: COMPLETED -> Delivered badge */}
                    {order.orderStatus === 'COMPLETED' && (
                      <div className="badge-delivered-done">
                        <Check size={14} style={{ display: 'inline', marginRight: 4 }} />
                        Delivered
                      </div>
                    )}

                    {/* Status: CANCELLED -> Stock restored note */}
                    {order.orderStatus === 'CANCELLED' && (
                      <span className="text-stock-restored">
                        Order cancelled · Stock restored
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 5. LUXURY CANCEL CONFIRMATION MODAL */}
      {cancellingOrder && (
        <div className="modal-overlay" onClick={() => setCancellingOrder(null)}>
          <div className="modal-content-luxury" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-luxury">
              <h3 className="modal-title-luxury">
                {cancellingOrder.orderStatus === 'PENDING'
                  ? 'Hủy Đơn Hàng'
                  : 'Gửi Yêu Cầu Hủy Đơn'}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setCancellingOrder(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#c7c2b8', lineHeight: 1.5 }}>
              {cancellingOrder.orderStatus === 'PENDING'
                ? `Bạn đang thao tác hủy trực tiếp đơn hàng ${cancellingOrder.orderCode}. Số lượng rượu sẽ được hoàn trả lại kho ngay lập tức.`
                : `Đơn hàng ${cancellingOrder.orderCode} đang được chuẩn bị tại hầm rượu. Yêu cầu của bạn sẽ được chuyển đến Quản lý cửa hàng xét duyệt.`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.78rem', color: '#8b857d', fontWeight: 600 }}>
                CHỌN HOẶC NHẬP LÝ DO HỦY:
              </label>
              <div className="cancel-reason-presets">
                {presetReasons.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`reason-preset-chip ${cancelReason === preset ? 'active' : ''}`}
                    onClick={() => setCancelReason(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                className="cancel-reason-textarea"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
              />
            </div>

            <div className="modal-footer-luxury">
              <button
                className="btn-secondary-luxury"
                onClick={() => setCancellingOrder(null)}
                disabled={isSubmittingCancel}
              >
                Đóng
              </button>
              <button
                className="btn-danger-luxury"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
              >
                {isSubmittingCancel
                  ? 'Đang xử lý...'
                  : cancellingOrder.orderStatus === 'PENDING'
                  ? 'Xác nhận hủy đơn'
                  : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
