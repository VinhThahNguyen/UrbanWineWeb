import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Check,
  CheckCircle2,
  Package,
  Calendar,
  User,
  CreditCard,
  MapPin,
  Clock,
  ArrowRight,
  Truck,
  AlertTriangle
} from 'lucide-react';
import { adminApi, AdminOrderSummary, AdminOrderCounts, ShipperWorkloadItem } from '@/shared/api/adminApi';
import './AdminOrderManagement.css';

interface AdminOrderManagementProps {
  onOpenNewOrder: () => void;
  searchKeyword?: string;
}

type OrderStatusFilter = 'ALL' | 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

export const AdminOrderManagement: React.FC<AdminOrderManagementProps> = ({
  onOpenNewOrder,
  searchKeyword = '',
}) => {
  // Selected Filter Tab
  const [selectedStatus, setSelectedStatus] = useState<OrderStatusFilter>('ALL');

  // Real Database Data States (Strictly 0 Hardcoded / Mock Data)
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [counts, setCounts] = useState<AdminOrderCounts>({
    ALL: 0,
    PENDING: 0,
    PROCESSING: 0,
    SHIPPING: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  });

  // UI Status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderSummary | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Shipper Assignment State (UC_2.1.4)
  const [shippers, setShippers] = useState<ShipperWorkloadItem[]>([]);
  const [isLoadingShippers, setIsLoadingShippers] = useState<boolean>(false);
  const [selectedShipperId, setSelectedShipperId] = useState<number | null>(null);
  const [isAssigningShipper, setIsAssigningShipper] = useState<boolean>(false);

  // Reject Order Modal State
  const [rejectModalOrder, setRejectModalOrder] = useState<AdminOrderSummary | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectReasonError, setRejectReasonError] = useState<string | null>(null);

  // Action Feedback Popup Modal State (success / error)
  const [actionPopup, setActionPopup] = useState<{
    type: 'success' | 'error';
    title: string;
    message?: string;
    targetTab?: OrderStatusFilter;
  } | null>(null);

  const COMMON_REJECT_REASONS = [
    'Out of stock',
    'Unable to contact recipient by phone',
    'Delivery address is outside service area',
    'Customer requested cancellation',
    'Invalid or fake order information',
  ];

  // 1. Fetch Counts from Database
  const fetchCounts = useCallback(async () => {
    try {
      const countsData = await adminApi.getOrderCounts();
      if (countsData) {
        setCounts(countsData);
      }
    } catch (err) {
      console.warn('Error fetching order statistics from database:', err);
    }
  }, []);

  // 2. Fetch Orders from Database according to selected tab
  const fetchOrders = useCallback(async (status: OrderStatusFilter) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const isAll = status === 'ALL';
      const statusParam = isAll ? undefined : status;
      const res = await adminApi.getAdminOrders(0, 100, statusParam, isAll);

      if (res && Array.isArray(res.content)) {
        setOrders(res.content);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error('Error fetching orders from database:', err);
      setFetchError('Unable to connect to database server. Please check backend service.');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial and reactive fetch on tab change
  useEffect(() => {
    fetchCounts();
    fetchOrders(selectedStatus);
  }, [selectedStatus, fetchCounts, fetchOrders]);

  // Refresh all data
  const handleRefresh = () => {
    fetchCounts();
    fetchOrders(selectedStatus);
  };

  // Format VND Currency
  const formatVnd = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0₫';
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  // Format Order Date matching UI: "01 Oct 2026"
  const formatOrderDate = (dateStr?: string) => {
    if (!dateStr) return 'Just created';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Map payment method to user-friendly text
  const formatPaymentMethod = (method?: string) => {
    if (!method) return 'N/A';
    const upper = method.toUpperCase();
    if (upper === 'BANK_TRANSFER' || upper === 'TRANSFER') return 'Bank Transfer';
    if (upper === 'COD' || upper === 'CASH') return 'Cash on Delivery';
    if (upper === 'MOMO') return 'MoMo Wallet';
    if (upper === 'VNPAY') return 'VNPay Gateway';
    if (upper === 'VIETQR') return 'VietQR';
    return method;
  };

  // Format Order Code to have # prefix
  const formatOrderCode = (code?: string, id?: number) => {
    if (code) {
      return code.startsWith('#') ? code : `#${code}`;
    }
    return `#UWE-${id || '0000'}`;
  };

  // Render Status Badge matching luxury design
  const renderStatusBadge = (status: string) => {
    const s = status ? status.toUpperCase() : 'PENDING';
    switch (s) {
      case 'PENDING':
        return <span className="status-pill pill-pending">PENDING</span>;
      case 'PROCESSING':
        return <span className="status-pill pill-processing">PROCESSING</span>;
      case 'SHIPPING':
        return <span className="status-pill pill-shipping">SHIPPING</span>;
      case 'COMPLETED':
        return <span className="status-pill pill-completed">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="status-pill pill-cancelled">CANCELLED</span>;
      default:
        return <span className="status-pill">{status}</span>;
    }
  };

  // Filter orders by search keyword (if provided from parent search bar)
  const displayedOrders = useMemo(() => {
    if (!searchKeyword.trim()) return orders;
    const q = searchKeyword.toLowerCase();
    return orders.filter((order) => {
      const codeMatch = order.orderCode?.toLowerCase().includes(q);
      const nameMatch = order.recipientName?.toLowerCase().includes(q);
      const phoneMatch = order.recipientPhone?.toLowerCase().includes(q);
      const statusMatch = order.orderStatus?.toLowerCase().includes(q);
      return codeMatch || nameMatch || phoneMatch || statusMatch;
    });
  }, [orders, searchKeyword]);

  // Open Order Detail Modal
  const handleOpenDetail = async (orderSummary: AdminOrderSummary) => {
    setSelectedOrder(orderSummary);
    setIsLoadingDetail(true);
    setActionSuccessMsg(null);
    setShippers([]);
    setSelectedShipperId(null);

    // If order is PROCESSING or SHIPPING, automatically load online shippers from database
    if (orderSummary.orderStatus === 'PROCESSING' || orderSummary.orderStatus === 'SHIPPING') {
      setIsLoadingShippers(true);
      adminApi.getAvailableShippers()
        .then((list) => {
          setShippers(list);
          const firstAssignable = list.find((s) => s.canAssign) || list[0];
          if (firstAssignable) {
            setSelectedShipperId(firstAssignable.shipperId);
          }
        })
        .catch((err) => {
          console.warn('Unable to load online shippers list:', err);
          setShippers([]);
        })
        .finally(() => {
          setIsLoadingShippers(false);
        });
    }

    try {
      const detail = await adminApi.getAdminOrderDetail(orderSummary.orderId);
      if (detail) {
        setSelectedOrder(detail);
      }
    } catch (err) {
      console.warn('Unable to load full order details, showing summary data:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Assign Order to Shipper (UC_2.1.4: PROCESSING -> SHIPPING)
  const handleAssignShipper = async (orderId: number) => {
    if (!selectedShipperId) {
      alert('Please select an online delivery shipper');
      return;
    }
    const chosen = shippers.find((s) => s.shipperId === selectedShipperId);
    if (!chosen) return;

    if (!window.confirm(`Assign this order to Shipper '${chosen.fullName}'? The order status will become SHIPPING (Out for Delivery).`)) {
      return;
    }

    setIsAssigningShipper(true);
    try {
      const updated = await adminApi.assignShipper(orderId, selectedShipperId);
      setActionSuccessMsg(`Order successfully assigned to Shipper '${chosen.fullName}'!`);

      if (updated) {
        setSelectedOrder(updated);
      } else {
        setSelectedOrder((prev) => prev ? {
          ...prev,
          orderStatus: 'SHIPPING',
          shipperName: chosen.fullName,
          shipperPhone: chosen.phoneNumber,
        } : null);
      }

      fetchCounts();
      fetchOrders(selectedStatus);

      setTimeout(() => {
        setActionSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to assign Shipper to this order. Please try again.';
      alert(`Error: ${msg}`);
    } finally {
      setIsAssigningShipper(false);
    }
  };

  // Close Action Popup & switch to target tab to show updated order immediately
  const handleCloseActionPopup = () => {
    if (actionPopup?.type === 'success' && actionPopup.targetTab) {
      const tabToGo = actionPopup.targetTab;
      setSelectedStatus(tabToGo);
      fetchCounts();
      fetchOrders(tabToGo);
    }
    setActionPopup(null);
  };

  // Approve Order
  const handleApprove = async (orderId: number) => {
    setIsProcessingAction(true);
    try {
      await adminApi.approveOrder(orderId);
      
      // Close order detail modal immediately
      setSelectedOrder(null);
      
      // Update UI state immediately (Optimistic UI)
      setOrders((prev) =>
        selectedStatus === 'ALL'
          ? prev.map((o) => (o.orderId === orderId ? { ...o, orderStatus: 'PROCESSING' } : o))
          : prev.filter((o) => o.orderId !== orderId)
      );
      setCounts((prev) => ({
        ...prev,
        PENDING: Math.max(0, prev.PENDING - 1),
        PROCESSING: prev.PROCESSING + 1,
      }));

      setActionPopup({
        type: 'success',
        title: 'Approved successfully',
        targetTab: 'PROCESSING',
      });

      fetchCounts();
      fetchOrders(selectedStatus);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        'Unable to approve order. Please check again.';
      setActionPopup({
        type: 'error',
        title: 'Approval failed',
        message: errorMsg,
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (order: AdminOrderSummary) => {
    setRejectModalOrder(order);
    setRejectReason('');
    setRejectReasonError(null);
  };

  // Confirm Reject Order
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalOrder) return;
    if (!rejectReason.trim()) {
      setRejectReasonError('Please enter or select a rejection reason.');
      return;
    }

    setIsProcessingAction(true);
    setRejectReasonError(null);
    const targetOrderId = rejectModalOrder.orderId;
    const reasonText = rejectReason.trim();

    try {
      await adminApi.rejectOrder(targetOrderId, reasonText);

      // Close both reject reason modal and order detail modal immediately
      setRejectModalOrder(null);
      setSelectedOrder(null);

      // Update UI state immediately (Optimistic UI)
      setOrders((prev) =>
        selectedStatus === 'ALL'
          ? prev.map((o) =>
              o.orderId === targetOrderId
                ? { ...o, orderStatus: 'CANCELLED', cancellationReason: reasonText }
                : o
            )
          : prev.filter((o) => o.orderId !== targetOrderId)
      );
      setCounts((prev) => ({
        ...prev,
        PENDING: Math.max(0, prev.PENDING - 1),
        CANCELLED: prev.CANCELLED + 1,
      }));

      // Show small popup notification for successful rejection
      setActionPopup({
        type: 'success',
        title: 'Rejected successfully',
        targetTab: 'CANCELLED',
      });

      // Reload from server to ensure sync
      fetchCounts();
      fetchOrders(selectedStatus);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        (err?.response?.data?.errors ? Object.values(err.response.data.errors)[0] : null) ||
        'Unable to reject order. Please try again.';

      const errStr = String(errorMsg);
      // If server order has already transitioned to CANCELLED
      if (errStr.includes('CANCELLED') || errStr.includes('Trạng thái hiện tại') || errStr.includes('đã ở trạng thái')) {
        setRejectModalOrder(null);
        setSelectedOrder(null);
        setOrders((prev) =>
          selectedStatus === 'ALL'
            ? prev.map((o) =>
                o.orderId === targetOrderId
                  ? { ...o, orderStatus: 'CANCELLED', cancellationReason: reasonText }
                  : o
              )
            : prev.filter((o) => o.orderId !== targetOrderId)
        );
        setCounts((prev) => ({
          ...prev,
          PENDING: Math.max(0, prev.PENDING - 1),
          CANCELLED: prev.CANCELLED + 1,
        }));
        setActionPopup({
          type: 'success',
          title: 'Rejected successfully',
          targetTab: 'CANCELLED',
        });
        fetchCounts();
        fetchOrders(selectedStatus);
        return;
      }

      setRejectModalOrder(null);
      setActionPopup({
        type: 'error',
        title: 'Rejection failed',
        message: errStr,
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="order-mgmt-container">
      {/* 1. Header with Title, Counts & New Order button */}
      <div className="order-mgmt-header">
        <div className="order-mgmt-title-group">
          <h1 className="order-mgmt-heading">Order Management</h1>
          <p className="order-mgmt-subheading">
            <strong>{counts.ALL}</strong> total orders · <strong>{counts.PENDING}</strong> pending approval
          </p>
        </div>

        <button
          type="button"
          className="btn-new-order"
          onClick={onOpenNewOrder}
          title="Create in-store quick order (+ Quick Order)"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>+ Quick Order</span>
        </button>
      </div>

      {/* 2. Status Filter Tabs */}
      <div className="order-mgmt-tabs-bar">
        <button
          type="button"
          className={`order-tab-btn ${selectedStatus === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('ALL')}
        >
          <span className="tab-name">All</span>
          <span className="tab-badge">{counts.ALL}</span>
        </button>

        <button
          type="button"
          data-status="PENDING"
          className={`order-tab-btn ${selectedStatus === 'PENDING' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('PENDING')}
        >
          <span className="tab-name">PENDING</span>
          <span className="tab-badge">{counts.PENDING}</span>
        </button>

        <button
          type="button"
          data-status="PROCESSING"
          className={`order-tab-btn ${selectedStatus === 'PROCESSING' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('PROCESSING')}
        >
          <span className="tab-name">PROCESSING</span>
          <span className="tab-badge">{counts.PROCESSING}</span>
        </button>

        <button
          type="button"
          data-status="SHIPPING"
          className={`order-tab-btn ${selectedStatus === 'SHIPPING' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('SHIPPING')}
        >
          <span className="tab-name">SHIPPING</span>
          <span className="tab-badge">{counts.SHIPPING}</span>
        </button>

        <button
          type="button"
          data-status="COMPLETED"
          className={`order-tab-btn ${selectedStatus === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('COMPLETED')}
        >
          <span className="tab-name">COMPLETED</span>
          <span className="tab-badge">{counts.COMPLETED}</span>
        </button>

        <button
          type="button"
          data-status="CANCELLED"
          className={`order-tab-btn ${selectedStatus === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('CANCELLED')}
        >
          <span className="tab-name">CANCELLED</span>
          <span className="tab-badge">{counts.CANCELLED}</span>
        </button>
      </div>

      {/* 3. Orders Table Surface */}
      <div className="order-mgmt-table-surface">
        <div className="order-mgmt-table-wrapper">
          <table className="order-mgmt-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>TOTAL AMOUNT</th>
                <th>PAYMENT METHOD</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="order-notice-box">
                      <Loader2 size={32} className="spin-icon order-notice-icon" />
                      <p className="order-notice-text">Loading orders from database...</p>
                    </div>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7}>
                    <div className="order-notice-box">
                      <AlertCircle size={36} color="#ef4444" />
                      <p className="order-notice-text">{fetchError}</p>
                      <button
                        type="button"
                        className="order-notice-retry-btn"
                        onClick={handleRefresh}
                      >
                        <RefreshCw size={14} /> Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="order-notice-box">
                      <Package size={40} className="order-notice-icon" />
                      <p className="order-notice-text">
                        {searchKeyword.trim()
                          ? `No orders found matching "${searchKeyword}".`
                          : selectedStatus === 'ALL'
                          ? 'No orders found in the database.'
                          : `No orders with status ${selectedStatus}.`}
                      </p>
                      <p className="order-notice-subtext">
                        All data is queried in real time from the database.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedOrders.map((order) => (
                  <tr key={order.orderId} className="order-mgmt-row">
                    {/* 1. ORDER ID */}
                    <td className="cell-order-id">
                      {formatOrderCode(order.orderCode, order.orderId)}
                    </td>

                    {/* 2. CUSTOMER */}
                    <td>
                      <div className="cell-customer">
                        <span className="customer-name">
                          {order.recipientName || 'Walk-in Customer'}
                        </span>
                        <span className="customer-phone">
                          {order.recipientPhone || 'No phone number'}
                        </span>
                      </div>
                    </td>

                    {/* 3. DATE */}
                    <td className="cell-date">
                      {formatOrderDate(order.createdAt)}
                    </td>

                    {/* 4. TOTAL AMOUNT */}
                    <td className="cell-amount">
                      {formatVnd(order.totalAmount)}
                    </td>

                    {/* 5. PAYMENT METHOD */}
                    <td className="cell-payment">
                      {formatPaymentMethod(order.paymentMethod)}
                    </td>

                    {/* 6. STATUS */}
                    <td>
                      {renderStatusBadge(order.orderStatus)}
                    </td>

                    {/* 7. ACTION */}
                    <td>
                      <button
                        type="button"
                        className="btn-view-order"
                        onClick={() => handleOpenDetail(order)}
                        title="View order details"
                      >
                        <span>View</span>
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Order Detail Modal */}
      {selectedOrder && (
        <div className="order-detail-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="order-detail-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="order-detail-header">
              <div className="order-detail-header-left">
                <span className="order-detail-code">
                  {formatOrderCode(selectedOrder.orderCode, selectedOrder.orderId)}
                </span>
                {renderStatusBadge(selectedOrder.orderStatus)}
              </div>
              <button
                type="button"
                className="order-detail-close"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="order-detail-body">
              {actionSuccessMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px' }}>
                  <CheckCircle2 size={20} />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {/* Customer Info */}
              <div>
                <h4 className="detail-section-title">Customer & Delivery Information</h4>
                <div className="detail-info-grid">
                  <div className="detail-info-item">
                    <span className="detail-info-label">Recipient</span>
                    <span className="detail-info-val">{selectedOrder.recipientName || 'N/A'}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-info-label">Phone Number</span>
                    <span className="detail-info-val">{selectedOrder.recipientPhone || 'N/A'}</span>
                  </div>
                  <div className="detail-info-item" style={{ gridColumn: 'span 2' }}>
                    <span className="detail-info-label">Delivery Address</span>
                    <span className="detail-info-val">{selectedOrder.deliveryAddress || 'Pick up at counter / No address'}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-info-label">Order Date</span>
                    <span className="detail-info-val">{formatOrderDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-info-label">Payment Method</span>
                    <span className="detail-info-val">{formatPaymentMethod(selectedOrder.paymentMethod)}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="detail-section-title">Items List ({selectedOrder.items?.length || 0})</h4>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <table className="detail-items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'center' }}>Quantity</th>
                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.orderDetailId || item.wineId}>
                          <td>{item.wineName}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{formatVnd(item.unitPrice)}</td>
                          <td style={{ textAlign: 'right', color: '#e5a93c', fontWeight: 600 }}>
                            {formatVnd(item.itemSubtotal || item.unitPrice * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#8a8279', fontSize: '0.84rem', margin: 0 }}>
                    {isLoadingDetail ? 'Loading item list...' : 'No item information available.'}
                  </p>
                )}
              </div>

              {/* Financial Summary */}
              <div className="detail-financial-box">
                {selectedOrder.merchandiseSubtotal !== undefined && (
                  <div className="detail-financial-row">
                    <span>Items Subtotal:</span>
                    <span>{formatVnd(selectedOrder.merchandiseSubtotal)}</span>
                  </div>
                )}
                {selectedOrder.shippingFee !== undefined && (
                  <div className="detail-financial-row">
                    <span>Shipping Fee:</span>
                    <span>{formatVnd(selectedOrder.shippingFee)}</span>
                  </div>
                )}
                <div className="detail-financial-total">
                  <span>Total Amount:</span>
                  <strong>{formatVnd(selectedOrder.totalAmount)}</strong>
                </div>
              </div>

              {/* Shipper Assignment Section (UC_2.1.4: PROCESSING -> SHIPPING) */}
              {selectedOrder.orderStatus === 'PROCESSING' && (
                <div className="detail-shipper-section">
                  <div className="detail-shipper-header">
                    <Truck size={18} className="detail-shipper-icon" />
                    <h4 className="detail-section-title" style={{ margin: 0 }}>Assign Delivery Shipper</h4>
                  </div>

                  {isLoadingShippers ? (
                    <div className="shipper-loading-box">
                      <Loader2 className="spinner-rotate" size={18} />
                      <span>Checking online shippers from system...</span>
                    </div>
                  ) : shippers.length === 0 ? (
                    <div className="shipper-empty-alert">
                      <AlertTriangle className="shipper-alert-icon" size={24} />
                      <div className="shipper-alert-content">
                        <strong className="shipper-alert-title">No shippers are currently online</strong>
                        <p className="shipper-alert-desc">
                          No delivery staff are currently marked online in the system. Please ask delivery staff to log in or assign later.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="shipper-assign-card">
                      <label className="shipper-select-label" htmlFor="shipper-select">
                        Select an online shipper to assign order:
                      </label>
                      <div className="shipper-select-row">
                        <select
                          id="shipper-select"
                          className="shipper-dropdown-select"
                          value={selectedShipperId || ''}
                          onChange={(e) => setSelectedShipperId(Number(e.target.value))}
                          disabled={isAssigningShipper}
                        >
                          {shippers.map((s) => (
                            <option key={s.shipperId} value={s.shipperId} disabled={!s.canAssign}>
                              {s.fullName} ({s.phoneNumber}) — {s.canAssign ? `Delivering: ${s.currentActiveOrders}/${s.maxOrders} orders` : `Overloaded (${s.currentActiveOrders}/${s.maxOrders})`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-confirm-assign-shipper"
                          disabled={!selectedShipperId || isAssigningShipper}
                          onClick={() => handleAssignShipper(selectedOrder.orderId)}
                        >
                          <Truck size={16} />
                          <span>{isAssigningShipper ? 'Assigning...' : 'Confirm Assign Shipper'}</span>
                        </button>
                      </div>
                      <p className="shipper-assign-note">
                        * After assigning a shipper, order status will automatically change to <strong>SHIPPING (Out for Delivery)</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Already Assigned Shipper Info (SHIPPING) */}
              {selectedOrder.orderStatus === 'SHIPPING' && (
                <div className="detail-shipper-section assigned">
                  <div className="detail-shipper-header">
                    <Truck size={18} className="detail-shipper-icon text-shipping" />
                    <h4 className="detail-section-title" style={{ margin: 0, color: '#38bdf8' }}>Assigned Shipper Details</h4>
                    <span className="status-pill pill-shipping" style={{ marginLeft: 'auto' }}>OUT FOR DELIVERY</span>
                  </div>
                  <div className="detail-assigned-shipper-card">
                    <div className="detail-assigned-item">
                      <span className="detail-assigned-label">Assigned Shipper:</span>
                      <strong className="detail-assigned-value">{selectedOrder.shipperName || 'Urban Wine Express Shipper'}</strong>
                    </div>
                    <div className="detail-assigned-item">
                      <span className="detail-assigned-label">Phone Number:</span>
                      <span className="detail-assigned-value">{selectedOrder.shipperPhone || 'Not updated'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned Shipper Info for Completed orders */}
              {selectedOrder.orderStatus === 'COMPLETED' && selectedOrder.shipperName && (
                <div className="detail-shipper-section completed">
                  <div className="detail-shipper-header">
                    <CheckCircle2 size={18} className="detail-shipper-icon text-completed" />
                    <h4 className="detail-section-title" style={{ margin: 0, color: '#22c55e' }}>Order delivered by</h4>
                  </div>
                  <div className="detail-assigned-shipper-card">
                    <div className="detail-assigned-item">
                      <span className="detail-assigned-label">Shipper:</span>
                      <strong className="detail-assigned-value">{selectedOrder.shipperName}</strong>
                      {selectedOrder.shipperPhone && (
                        <span style={{ color: '#8a8279', fontSize: '0.85rem', marginLeft: '6px' }}>({selectedOrder.shipperPhone})</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="order-detail-actions">
              {selectedOrder.orderStatus === 'PENDING' && (
                <>
                  <button
                    type="button"
                    className="btn-detail-approve"
                    disabled={isProcessingAction}
                    onClick={() => handleApprove(selectedOrder.orderId)}
                  >
                    {isProcessingAction ? 'Processing...' : 'Approve Order'}
                  </button>
                  <button
                    type="button"
                    className="btn-detail-reject"
                    disabled={isProcessingAction}
                    onClick={() => handleOpenRejectModal(selectedOrder)}
                  >
                    Reject Order
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn-detail-close"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Reject Order Modal (Rejection Reason Input Screen) */}
      {rejectModalOrder && (
        <div className="order-detail-backdrop" onClick={() => setRejectModalOrder(null)}>
          <div className="order-reject-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="order-detail-header">
              <div className="order-detail-header-left">
                <AlertTriangle size={20} className="text-danger" style={{ color: '#ef4444' }} />
                <h3 className="order-reject-modal-title">
                  Reject Order {formatOrderCode(rejectModalOrder.orderCode, rejectModalOrder.orderId)}
                </h3>
              </div>
              <button
                type="button"
                className="order-detail-close"
                onClick={() => setRejectModalOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="order-reject-modal-body">
                <p className="reject-modal-desc">
                  Please provide a rejection reason. The system will <strong>send a real-time notification with this reason to the customer</strong> and return items to inventory:
                </p>

                {rejectReasonError && (
                  <div className="reject-error-alert">
                    <AlertTriangle size={16} />
                    <span>{rejectReasonError}</span>
                  </div>
                )}

                <div className="quick-reason-chips">
                  <span className="chips-label">Common reasons (Click to select):</span>
                  <div className="chips-list">
                    {COMMON_REJECT_REASONS.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`reason-chip ${rejectReason === r ? 'active' : ''}`}
                        onClick={() => {
                          setRejectReason(r);
                          setRejectReasonError(null);
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="reject-input-label" htmlFor="reject-textarea">
                    Rejection Reason Details *
                  </label>
                  <textarea
                    id="reject-textarea"
                    rows={4}
                    required
                    className="reject-textarea"
                    placeholder="Enter rejection reason details..."
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (e.target.value.trim()) setRejectReasonError(null);
                    }}
                  />
                </div>
              </div>

              <div className="order-detail-actions">
                <button
                  type="button"
                  className="btn-detail-close"
                  disabled={isProcessingAction}
                  onClick={() => setRejectModalOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm-reject-danger"
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Cancelling...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Action Feedback Popup Modal */}
      {actionPopup && (
        <div className="order-detail-backdrop" onClick={handleCloseActionPopup}>
          <div className="action-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className={`action-popup-icon-wrap ${actionPopup.type}`}>
              {actionPopup.type === 'success' ? (
                <Check size={32} strokeWidth={3} />
              ) : (
                <X size={32} strokeWidth={3} />
              )}
            </div>
            <h3 className="action-popup-title">{actionPopup.title}</h3>
            {actionPopup.message && (
              <p className="action-popup-message">{actionPopup.message}</p>
            )}
            <button
              type="button"
              className="btn-popup-close"
              onClick={handleCloseActionPopup}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
