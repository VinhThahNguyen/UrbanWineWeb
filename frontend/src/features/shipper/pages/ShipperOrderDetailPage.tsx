import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Wine, 
  AlertTriangle, 
  XCircle, 
  CreditCard, 
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Signal,
  Wifi,
  BatteryMedium
} from 'lucide-react';
import { ShipperOrder } from '../types/shipper';
import { shipperService } from '../services/shipperService';
import { PaymentSettlementModal } from '../components/PaymentSettlementModal';
import { RequestReassignModal } from '../components/RequestReassignModal';
import { FailDeliveryModal } from '../components/FailDeliveryModal';
import { ShipperConfirmModal, ShipperToastType } from '../components/ShipperConfirmModal';

interface ShipperOrderDetailPageProps {
  orderId: number;
  onBack: () => void;
  onOrderCompleted?: () => void;
}

export const ShipperOrderDetailPage: React.FC<ShipperOrderDetailPageProps> = ({
  orderId,
  onBack,
  onOrderCompleted,
}) => {
  const [order, setOrder] = useState<ShipperOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Accordion mở rộng/thu gọn danh sách kiện hàng rượu
  const [isWineExpanded, setIsWineExpanded] = useState<boolean>(false);

  // Trạng thái mở các Modal hành động
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isReassignOpen, setIsReassignOpen] = useState<boolean>(false);
  const [isFailOpen, setIsFailOpen] = useState<boolean>(false);

  // Trạng thái Custom Alert Modal (thay thế browser alert của localhost)
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    type: ShipperToastType;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'SUCCESS',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Tải chi tiết đơn hàng từ backend
  const fetchOrder = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await shipperService.getOrderDetail(orderId);
      setOrder(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  const totalBottles = order?.items?.reduce((sum, item) => sum + item.quantity, 0) || 1;
  const mainWine = order?.items?.[0];

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

        {/* Top Navigation Bar */}
        <div className="shipper-detail-topbar">
          <button type="button" className="shipper-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Assigned Orders</span>
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37' }}>
            <span style={{ fontSize: '0.9rem' }}>Đang tải chi tiết đơn hàng #{orderId}...</span>
          </div>
        ) : errorMsg || !order ? (
          <div style={{ flex: 1, padding: '2rem 1.25rem', textAlign: 'center', color: '#fff' }}>
            <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{errorMsg || 'Không tìm thấy đơn hàng'}</div>
            <button type="button" className="shipper-btn-secondary" onClick={onBack}>
              Quay lại danh sách
            </button>
          </div>
        ) : (
          <div className="shipper-content-scroll" style={{ paddingBottom: '7rem' }}>
            {/* Title Header */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 className="shipper-detail-title">Order #{order.orderCode}</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span className="shipper-badge-status">
                  <span className="shipper-badge-status-dot" />
                  {order.orderStatus}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#8b857d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={12} />
                  <span>Assigned at {order.assignedAt ? new Date(order.assignedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '14:05'}</span>
                </span>
              </div>
            </div>

            {/* Warning nếu có yêu cầu đổi đơn đang chờ duyệt */}
            {order.shipperRejectStatus === 'REQUESTED' && (
              <div className="shipper-warning-banner" style={{ marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <span>Bạn đã gửi yêu cầu bàn giao đơn này. Đang chờ Quản trị viên xét duyệt.</span>
              </div>
            )}

            {/* Recipient Card */}
            <div className="shipper-section-head">
              <span className="shipper-section-title">Delivery destination</span>
              <span className="shipper-priority-tag">RECIPIENT</span>
            </div>

            <div className="shipper-detail-card" style={{ marginBottom: '1.25rem' }}>
              <div className="shipper-info-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="shipper-avatar-circle">
                    {order.recipientName ? order.recipientName.slice(0, 2).toUpperCase() : 'VB'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                      {order.recipientName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                      {order.recipientPhone}
                    </div>
                  </div>
                </div>

                <a 
                  href={`tel:${order.recipientPhone}`}
                  className="shipper-call-circle"
                  title="Gọi ngay cho người nhận"
                >
                  <Phone size={14} />
                </a>
              </div>

              <div className="shipper-address-row" style={{ marginTop: '0.85rem', marginBottom: '0.5rem' }}>
                <MapPin size={16} className="shipper-address-icon" />
                <div className="shipper-address-text">
                  {order.deliveryAddress}
                </div>
              </div>

              {/* Delivery Note */}
              <div className="shipper-note-box">
                <div className="shipper-note-label">DELIVERY NOTE</div>
                <div className="shipper-note-content">
                  "Khách hàng yêu cầu kiểm tra rượu cẩn thận trước khi thanh toán."
                </div>
              </div>
            </div>

            {/* =========================================================================
                WINE PACKAGE SECTION (Phương án kết hợp: 1 chai đại diện + Nút Xem tất cả N chai)
               ========================================================================= */}
            <div className="shipper-section-head">
              <span className="shipper-section-title">Wine package</span>
              <span className="shipper-priority-tag">{totalBottles} ITEMS</span>
            </div>

            <div className="shipper-detail-card" style={{ marginBottom: '1.25rem' }}>
              {/* Chai đại diện */}
              <div className="shipper-wine-single-row">
                <div className="shipper-wine-img-box" style={{ width: '56px', height: '56px' }}>
                  {mainWine?.wineImageUrl ? (
                    <img src={mainWine.wineImageUrl} alt="Wine" className="shipper-wine-img" />
                  ) : (
                    <Wine size={26} color="#d4af37" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                    THE CELLAR SELECTION
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mainWine?.wineName || 'Sassicaia 2019'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>
                    {mainWine?.volume || '750ml'} • Qty: {mainWine?.quantity || 1} chai
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#d4af37' }}>
                  {formatCurrency(mainWine?.totalPrice || order.totalAmount)}
                </div>
              </div>

              {/* Nút bấm Accordion mở rộng/thu gọn nếu đơn có nhiều chai */}
              {order.items && order.items.length > 1 && (
                <div>
                  <button
                    type="button"
                    className="shipper-wine-accordion-toggle"
                    onClick={() => setIsWineExpanded(!isWineExpanded)}
                  >
                    <span>
                      {isWineExpanded ? 'Thu gọn kiện hàng' : `Xem toàn bộ kiện hàng (${order.items.length} loại rượu)`}
                    </span>
                    {isWineExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>

                  {isWineExpanded && (
                    <div className="shipper-wine-expanded-list">
                      {order.items.slice(1).map((item, idx) => (
                        <div key={idx} className="shipper-wine-subitem">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                              {item.wineName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#8b857d' }}>
                              Số lượng: {item.quantity} • Đơn giá: {formatCurrency(item.unitPrice)}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#d4af37' }}>
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Nhãn cảnh báo hàng dễ vỡ */}
              <div className="shipper-fragile-alert">
                <Wine size={14} color="#d4af37" />
                <span>Fragile goods. Keep upright in the thermal bag.</span>
              </div>
            </div>

            {/* Total to Collect Card */}
            <div className="shipper-collect-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#8b857d', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Cash / QR to Collect
                </span>
                <span className="shipper-badge-status" style={{ fontSize: '0.62rem' }}>
                  {order.paymentMethod === 'COD' ? 'UNPAID COD' : 'PREPAID ONLINE'}
                </span>
              </div>

              <div className="shipper-total-amount" style={{ margin: '0.5rem 0 0 0' }}>
                {order.paymentMethod === 'COD' 
                  ? formatCurrency(order.totalAmount) 
                  : '0đ (Đã thanh toán)'}
              </div>
            </div>

            {/* =========================================================================
                ACTION BUTTONS CỐT LÕI (Thu tiền, Báo sự cố 5.9, Báo giao thất bại)
               ========================================================================= */}
            <div className="shipper-action-group">
              {/* Nút to chính: Quyết toán thanh toán & Hoàn tất */}
              {order.orderStatus === 'SHIPPING' && (
                <button
                  type="button"
                  className="shipper-action-btn-primary"
                  onClick={() => setIsPaymentOpen(true)}
                >
                  <CreditCard size={17} />
                  <span>
                    {order.paymentStatus === 'PAID' || order.paymentMethod === 'VNPAY'
                      ? 'XÁC NHẬN ĐÃ GIAO RƯỢU (THU 0Đ)'
                      : 'COLLECT PAYMENT & COMPLETE'}
                  </span>
                </button>
              )}

              {/* Nút phụ: Báo sự cố hỏng xe (Request Reassign Modal 5.9) */}
              {order.orderStatus === 'SHIPPING' && order.shipperRejectStatus !== 'REQUESTED' && (
                <button
                  type="button"
                  className="shipper-btn-warning-outline"
                  onClick={() => setIsReassignOpen(true)}
                >
                  <AlertTriangle size={15} />
                  <span>Báo sự cố xe • Đổi đơn (Reassign)</span>
                </button>
              )}

              {/* Nút phụ: Báo giao thất bại */}
              {order.orderStatus === 'SHIPPING' && (
                <button
                  type="button"
                  className="shipper-btn-danger-outline"
                  onClick={() => setIsFailOpen(true)}
                >
                  <XCircle size={15} />
                  <span>Báo giao không thành công (Boom hàng)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Quyết toán Thanh toán (Physical Cash & Scan VietQR & Prepaid Online) */}
        {order && (
          <PaymentSettlementModal
            orderId={order.orderId}
            orderCode={order.orderCode}
            totalAmount={order.totalAmount}
            paymentMethod={order.paymentMethod}
            paymentStatus={order.paymentStatus}
            isOpen={isPaymentOpen}
            onClose={() => setIsPaymentOpen(false)}
            onSuccess={(msg) => {
              setCustomAlert({
                isOpen: true,
                type: 'SUCCESS',
                title: 'Giao hàng thành công',
                message: msg || `Đơn hàng #${order.orderCode} đã hoàn tất thành công!`,
                onConfirm: () => {
                  fetchOrder();
                  onOrderCompleted?.();
                },
              });
            }}
          />
        )}

        {/* Modal Báo sự cố Reassign 5.9 */}
        {order && (
          <RequestReassignModal
            orderId={order.orderId}
            orderCode={order.orderCode}
            isOpen={isReassignOpen}
            onClose={() => setIsReassignOpen(false)}
            onSuccess={(msg) => {
              setCustomAlert({
                isOpen: true,
                type: 'WARNING',
                title: 'Yêu cầu bàn giao đơn',
                message: msg || `Đã gửi yêu cầu bàn giao đơn #${order.orderCode} lên Quản lý xét duyệt!`,
                onConfirm: () => {
                  fetchOrder();
                },
              });
            }}
          />
        )}

        {/* Modal Báo giao thất bại */}
        {order && (
          <FailDeliveryModal
            orderId={order.orderId}
            orderCode={order.orderCode}
            isOpen={isFailOpen}
            onClose={() => setIsFailOpen(false)}
            onSuccess={(msg) => {
              setCustomAlert({
                isOpen: true,
                type: 'ERROR',
                title: 'Báo giao thất bại',
                message: msg || `Đã báo cáo giao thất bại cho đơn #${order.orderCode}. Hàng sẽ được hoàn kho!`,
                onConfirm: () => {
                  fetchOrder();
                },
              });
            }}
          />
        )}

        {/* Custom Confirmation/Notification Popup (Không còn alert/confirm của browser localhost) */}
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
