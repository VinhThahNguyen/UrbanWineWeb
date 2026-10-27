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

  // Action Feedback Popup Modal State (thành công / thất bại)
  const [actionPopup, setActionPopup] = useState<{
    type: 'success' | 'error';
    title: string;
    message?: string;
    targetTab?: OrderStatusFilter;
  } | null>(null);

  const COMMON_REJECT_REASONS = [
    'Hết hàng trong kho',
    'Không thể liên hệ được số điện thoại người nhận',
    'Địa chỉ nhận hàng nằm ngoài khu vực hỗ trợ',
    'Khách hàng chủ động yêu cầu hủy đơn',
    'Nghi ngờ đơn hàng ảo / Thông tin không hợp lệ',
  ];

  // 1. Fetch Counts from Database
  const fetchCounts = useCallback(async () => {
    try {
      const countsData = await adminApi.getOrderCounts();
      if (countsData) {
        setCounts(countsData);
      }
    } catch (err) {
      console.warn('Lỗi khi tải số lượng thống kê đơn hàng từ database:', err);
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
      console.error('Lỗi khi tải danh sách đơn hàng từ database:', err);
      setFetchError('Không thể kết nối đến máy chủ cơ sở dữ liệu. Vui lòng kiểm tra lại dịch vụ backend.');
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
    if (!dateStr) return 'Mới tạo';
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

    // Nếu đơn đang PROCESSING hoặc SHIPPING, tự động tải danh sách Shipper online từ database
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
          console.warn('Không thể tải danh sách shipper trực tuyến:', err);
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
      console.warn('Không thể tải chi tiết sâu của đơn hàng, hiển thị dữ liệu tóm tắt:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Assign Order to Shipper (UC_2.1.4: PROCESSING -> SHIPPING)
  const handleAssignShipper = async (orderId: number) => {
    if (!selectedShipperId) {
      alert('Vui lòng chọn một nhân viên giao hàng đang trực tuyến');
      return;
    }
    const chosen = shippers.find((s) => s.shipperId === selectedShipperId);
    if (!chosen) return;

    if (!window.confirm(`Xác nhận phân công đơn hàng này cho Shipper '${chosen.fullName}'? Đơn sẽ chuyển sang trạng thái SHIPPING (Đang giao).`)) {
      return;
    }

    setIsAssigningShipper(true);
    try {
      const updated = await adminApi.assignShipper(orderId, selectedShipperId);
      setActionSuccessMsg(`Đã phân công đơn hàng cho Shipper '${chosen.fullName}' thành công!`);

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
      const msg = err.response?.data?.message || 'Không thể gán Shipper cho đơn hàng này. Vui lòng thử lại.';
      alert(`Lỗi: ${msg}`);
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
      
      // Thoát ngay khỏi modal chi tiết đơn
      setSelectedOrder(null);
      
      // Cập nhật trạng thái tức thì trên giao diện
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
        title: 'Phê duyệt thành công',
        targetTab: 'PROCESSING',
      });

      fetchCounts();
      fetchOrders(selectedStatus);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        'Không thể phê duyệt đơn hàng. Vui lòng kiểm tra lại.';
      setActionPopup({
        type: 'error',
        title: 'Phê duyệt thất bại',
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
      setRejectReasonError('Vui lòng nhập hoặc chọn lý do từ chối đơn hàng.');
      return;
    }

    setIsProcessingAction(true);
    setRejectReasonError(null);
    const targetOrderId = rejectModalOrder.orderId;
    const reasonText = rejectReason.trim();

    try {
      await adminApi.rejectOrder(targetOrderId, reasonText);

      // Thoát ngay lập tức khỏi cả màn hình nhập lý do và màn hình chi tiết đơn hàng
      setRejectModalOrder(null);
      setSelectedOrder(null);

      // Cập nhật trạng thái tức thì trên giao diện (Optimistic UI)
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

      // Hiển thị Popup màn hình nhỏ thông báo từ chối thành công
      setActionPopup({
        type: 'success',
        title: 'Từ chối thành công',
        targetTab: 'CANCELLED',
      });

      // Reload từ server để đảm bảo dữ liệu đồng bộ
      fetchCounts();
      fetchOrders(selectedStatus);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        (err?.response?.data?.errors ? Object.values(err.response.data.errors)[0] : null) ||
        'Không thể từ chối đơn hàng. Vui lòng thử lại.';

      const errStr = String(errorMsg);
      // Nếu đơn hàng thực tế trên máy chủ đã chuyển sang CANCELLED rồi
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
          title: 'Từ chối thành công',
          targetTab: 'CANCELLED',
        });
        fetchCounts();
        fetchOrders(selectedStatus);
        return;
      }

      setRejectModalOrder(null);
      setActionPopup({
        type: 'error',
        title: 'Từ chối thất bại',
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
          title="Tạo đơn hàng nhanh bán trực tiếp tại quầy (+ Quick Order)"
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
                      <p className="order-notice-text">Đang tải dữ liệu đơn hàng từ cơ sở dữ liệu...</p>
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
                        <RefreshCw size={14} /> Thử lại
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
                          ? `Không tìm thấy đơn hàng nào phù hợp với từ khóa "${searchKeyword}".`
                          : selectedStatus === 'ALL'
                          ? 'Hiện tại chưa có đơn hàng nào trong cơ sở dữ liệu.'
                          : `Không có đơn hàng nào ở trạng thái ${selectedStatus}.`}
                      </p>
                      <p className="order-notice-subtext">
                        Tất cả dữ liệu được truy vấn 100% thời gian thực từ cơ sở dữ liệu hệ thống.
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
                          {order.recipientName || 'Khách vãng lai'}
                        </span>
                        <span className="customer-phone">
                          {order.recipientPhone || 'Chưa cập nhật SĐT'}
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
                        title="Xem chi tiết đơn hàng"
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
                <h4 className="detail-section-title">Thông tin giao hàng & Khách hàng</h4>
                <div className="detail-info-grid">
                  <div className="detail-info-item">
                    <span className="detail-info-label">Người nhận</span>
                    <span className="detail-info-val">{selectedOrder.recipientName || 'N/A'}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-info-label">Số điện thoại</span>
                    <span className="detail-info-val">{selectedOrder.recipientPhone || 'N/A'}</span>
                  </div>
                  <div className="detail-info-item" style={{ gridColumn: 'span 2' }}>
                    <span className="detail-info-label">Địa chỉ nhận hàng</span>
                    <span className="detail-info-val">{selectedOrder.deliveryAddress || 'Nhận tại quầy / Không có địa chỉ'}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-info-label">Thời gian tạo đơn</span>
                    <span className="detail-info-val">{formatOrderDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="detail-info-item">
                    <span className="detail-info-label">Phương thức thanh toán</span>
                    <span className="detail-info-val">{formatPaymentMethod(selectedOrder.paymentMethod)}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="detail-section-title">Danh sách sản phẩm ({selectedOrder.items?.length || 0})</h4>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <table className="detail-items-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th style={{ textAlign: 'center' }}>Số lượng</th>
                        <th style={{ textAlign: 'right' }}>Đơn giá</th>
                        <th style={{ textAlign: 'right' }}>Thành tiền</th>
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
                    {isLoadingDetail ? 'Đang tải danh sách sản phẩm...' : 'Chưa có thông tin danh sách sản phẩm.'}
                  </p>
                )}
              </div>

              {/* Financial Summary */}
              <div className="detail-financial-box">
                {selectedOrder.merchandiseSubtotal !== undefined && (
                  <div className="detail-financial-row">
                    <span>Tiền hàng:</span>
                    <span>{formatVnd(selectedOrder.merchandiseSubtotal)}</span>
                  </div>
                )}
                {selectedOrder.shippingFee !== undefined && (
                  <div className="detail-financial-row">
                    <span>Phí giao hàng:</span>
                    <span>{formatVnd(selectedOrder.shippingFee)}</span>
                  </div>
                )}
                <div className="detail-financial-total">
                  <span>Tổng tiền thanh toán:</span>
                  <strong>{formatVnd(selectedOrder.totalAmount)}</strong>
                </div>
              </div>

              {/* Shipper Assignment Section (UC_2.1.4: PROCESSING -> SHIPPING) */}
              {selectedOrder.orderStatus === 'PROCESSING' && (
                <div className="detail-shipper-section">
                  <div className="detail-shipper-header">
                    <Truck size={18} className="detail-shipper-icon" />
                    <h4 className="detail-section-title" style={{ margin: 0 }}>Phân công nhân viên giao hàng (Shipper)</h4>
                  </div>

                  {isLoadingShippers ? (
                    <div className="shipper-loading-box">
                      <Loader2 className="spinner-rotate" size={18} />
                      <span>Đang kiểm tra danh sách Shipper trực tuyến từ hệ thống...</span>
                    </div>
                  ) : shippers.length === 0 ? (
                    <div className="shipper-empty-alert">
                      <AlertTriangle className="shipper-alert-icon" size={24} />
                      <div className="shipper-alert-content">
                        <strong className="shipper-alert-title">Hiện tại chưa có Shipper nào đang trực tuyến</strong>
                        <p className="shipper-alert-desc">
                          Hệ thống không tìm thấy nhân viên giao hàng nào đang bật trạng thái trực tuyến (online). Vui lòng thông báo cho đội giao hàng bật ca trực hoặc quay lại phân công sau.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="shipper-assign-card">
                      <label className="shipper-select-label" htmlFor="shipper-select">
                        Chọn Shipper đang trực tuyến để điều phối đơn hàng:
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
                              {s.fullName} ({s.phoneNumber}) — {s.canAssign ? `Đang giao: ${s.currentActiveOrders}/${s.maxOrders} đơn` : `Quá tải (${s.currentActiveOrders}/${s.maxOrders})`}
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
                          <span>{isAssigningShipper ? 'Đang điều phối...' : 'Xác nhận gán Shipper'}</span>
                        </button>
                      </div>
                      <p className="shipper-assign-note">
                        * Sau khi gán Shipper, trạng thái đơn sẽ tự động chuyển sang <strong>SHIPPING (Out for Delivery)</strong>.
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
                    <h4 className="detail-section-title" style={{ margin: 0, color: '#38bdf8' }}>Thông tin Shipper đang giao hàng</h4>
                    <span className="status-pill pill-shipping" style={{ marginLeft: 'auto' }}>OUT FOR DELIVERY</span>
                  </div>
                  <div className="detail-assigned-shipper-card">
                    <div className="detail-assigned-item">
                      <span className="detail-assigned-label">Nhân viên phụ trách:</span>
                      <strong className="detail-assigned-value">{selectedOrder.shipperName || 'Shipper Urban Wine Express'}</strong>
                    </div>
                    <div className="detail-assigned-item">
                      <span className="detail-assigned-label">Số điện thoại:</span>
                      <span className="detail-assigned-value">{selectedOrder.shipperPhone || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned Shipper Info for Completed orders */}
              {selectedOrder.orderStatus === 'COMPLETED' && selectedOrder.shipperName && (
                <div className="detail-shipper-section completed">
                  <div className="detail-shipper-header">
                    <CheckCircle2 size={18} className="detail-shipper-icon text-completed" />
                    <h4 className="detail-section-title" style={{ margin: 0, color: '#22c55e' }}>Đơn hàng đã được giao bởi</h4>
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
                    {isProcessingAction ? 'Đang xử lý...' : 'Phê duyệt đơn hàng'}
                  </button>
                  <button
                    type="button"
                    className="btn-detail-reject"
                    disabled={isProcessingAction}
                    onClick={() => handleOpenRejectModal(selectedOrder)}
                  >
                    Từ chối đơn
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn-detail-close"
                onClick={() => setSelectedOrder(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Reject Order Modal (Màn hình nhập lý do từ chối) */}
      {rejectModalOrder && (
        <div className="order-detail-backdrop" onClick={() => setRejectModalOrder(null)}>
          <div className="order-reject-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="order-detail-header">
              <div className="order-detail-header-left">
                <AlertTriangle size={20} className="text-danger" style={{ color: '#ef4444' }} />
                <h3 className="order-reject-modal-title">
                  Từ chối đơn hàng {formatOrderCode(rejectModalOrder.orderCode, rejectModalOrder.orderId)}
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
                  Vui lòng cung cấp lý do từ chối. Hệ thống sẽ <strong>gửi thông báo kèm lý do này đến khách hàng ngay lập tức qua WebSocket</strong> và tự động hoàn trả số lượng chai rượu vào kho:
                </p>

                {rejectReasonError && (
                  <div className="reject-error-alert">
                    <AlertTriangle size={16} />
                    <span>{rejectReasonError}</span>
                  </div>
                )}

                <div className="quick-reason-chips">
                  <span className="chips-label">Lý do phổ biến (Bấm để chọn nhanh):</span>
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
                    Chi tiết lý do từ chối *
                  </label>
                  <textarea
                    id="reject-textarea"
                    rows={4}
                    required
                    className="reject-textarea"
                    placeholder="Nhập chi tiết lý do từ chối đơn hàng..."
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
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-reject-danger"
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? 'Đang hủy đơn...' : 'Xác nhận từ chối đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Action Feedback Popup Modal (Phê duyệt thành công / Từ chối thành công theo mẫu) */}
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
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
