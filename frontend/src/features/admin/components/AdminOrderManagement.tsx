import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  Package,
  Calendar,
  User,
  CreditCard,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';
import { adminApi, AdminOrderSummary, AdminOrderCounts } from '@/shared/api/adminApi';
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

  // Approve Order
  const handleApprove = async (orderId: number) => {
    if (!window.confirm('Xác nhận phê duyệt đơn hàng này chuyển sang trạng thái PROCESSING?')) return;
    setIsProcessingAction(true);
    try {
      await adminApi.approveOrder(orderId);
      setActionSuccessMsg('Đã phê duyệt đơn hàng thành công!');
      fetchCounts();
      fetchOrders(selectedStatus);
      setTimeout(() => {
        setSelectedOrder(null);
        setActionSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể phê duyệt đơn hàng. Vui lòng kiểm tra lại.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Reject Order
  const handleReject = async (orderId: number) => {
    const reason = window.prompt('Nhập lý do từ chối đơn hàng (bắt buộc):');
    if (!reason || !reason.trim()) return;

    setIsProcessingAction(true);
    try {
      await adminApi.rejectOrder(orderId, reason.trim());
      setActionSuccessMsg('Đã từ chối đơn hàng thành công và hoàn trả kho!');
      fetchCounts();
      fetchOrders(selectedStatus);
      setTimeout(() => {
        setSelectedOrder(null);
        setActionSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể từ chối đơn hàng. Vui lòng thử lại.');
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
                    onClick={() => handleReject(selectedOrder.orderId)}
                  >
                    {isProcessingAction ? 'Đang xử lý...' : 'Từ chối đơn'}
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
    </div>
  );
};
