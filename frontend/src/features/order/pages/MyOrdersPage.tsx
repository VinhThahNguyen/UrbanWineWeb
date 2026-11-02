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
import { websocketService } from '@/realtime/websocketService';
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
  const [cancelReason, setCancelReason] = useState<string>('I want to change order details');
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
      setErrorMsg(err?.response?.data?.message || 'Unable to load orders from the server.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Lắng nghe cập nhật realtime từ WebSocket để tự động reload và cập nhật trạng thái đơn hàng ngay lập tức
    const unsubscribe = websocketService.subscribe((msg) => {
      console.log('Realtime order update received in MyOrdersPage:', msg);
      if (msg.orderId) {
        setOrders((prev) =>
          prev.map((order) => {
            if (order.orderId === msg.orderId) {
              let updatedStatus = order.orderStatus;
              if (msg.type === 'ORDER_REJECTED') updatedStatus = 'CANCELLED';
              else if (msg.type === 'ORDER_APPROVED') updatedStatus = 'PROCESSING';
              else if (msg.type === 'ORDER_SHIPPING') updatedStatus = 'SHIPPING';
              return {
                ...order,
                orderStatus: updatedStatus,
                cancellationReason: msg.reason || order.cancellationReason,
              };
            }
            return order;
          })
        );
      }
      fetchOrders();
    });

    return () => {
      unsubscribe();
    };
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
      alert(err?.response?.data?.message || 'Unable to cancel order. Please try again.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Quick preset reasons
  const presetReasons = [
    'I want to change order details',
    'Ordered wrong quantity',
    'Want to change payment method',
    'Found a better price',
    'Other reason',
  ];

  const displayName = currentUser?.fullName || 'Customer';

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
          <button className="orders-cart-btn" onClick={onViewCart} title="View cart">
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="orders-cart-badge">{cartCount}</span>}
          </button>

          {/* User Profile Badge */}
          <div className="orders-user-pill static-pill" title="Customer Account">
            <span>Hello, <strong>{displayName}</strong></span>
            <span className="orders-user-badge-red">CU</span>
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
              <h3 className="empty-state-title">Connecting to server...</h3>
              <p className="empty-state-desc">Loading your orders from Urban Wine Express.</p>
            </div>
          ) : errorMsg ? (
            <div className="orders-empty-state">
              <AlertCircle size={40} className="empty-state-icon" style={{ color: '#ef4444' }} />
              <h3 className="empty-state-title">{errorMsg}</h3>
              <p className="empty-state-desc">Please sign in or check your connection.</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="orders-empty-state">
              <AlertCircle size={40} className="empty-state-icon" />
              <h3 className="empty-state-title">No orders yet</h3>
              <p className="empty-state-desc">
                No orders found in this section. Explore our Wine Cellar to place an order.
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
                          setCancelReason('I want to change order details');
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
                          setCancelReason('Need urgent change, requesting assistance');
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
                      <div className="order-cancelled-block" style={{ textAlign: 'right' }}>
                        <span className="text-stock-restored">
                          Order cancelled · Stock restored
                        </span>
                        {(order.cancellationReason || (order as any).adminNote) && (
                          <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '4px', fontStyle: 'italic' }}>
                            Reason: &ldquo;{order.cancellationReason || (order as any).adminNote}&rdquo;
                          </div>
                        )}
                      </div>
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
                  ? 'Cancel Order'
                  : 'Request Order Cancellation'}
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
                ? `You are cancelling order ${cancellingOrder.orderCode}. Items will be returned to stock immediately.`
                : `Order ${cancellingOrder.orderCode} is being prepared at our cellar. Your request will be sent to the store manager for review.`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '0.78rem', color: '#8b857d', fontWeight: 600 }}>
                SELECT OR ENTER CANCELLATION REASON:
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
                placeholder="Enter detailed reason..."
              />
            </div>

            <div className="modal-footer-luxury">
              <button
                className="btn-secondary-luxury"
                onClick={() => setCancellingOrder(null)}
                disabled={isSubmittingCancel}
              >
                Close
              </button>
              <button
                className="btn-danger-luxury"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
              >
                {isSubmittingCancel
                  ? 'Processing...'
                  : cancellingOrder.orderStatus === 'PENDING'
                  ? 'Confirm Cancel'
                  : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
