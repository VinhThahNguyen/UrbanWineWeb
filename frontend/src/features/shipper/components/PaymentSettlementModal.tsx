import React, { useState, useEffect } from 'react';
import { 
  X, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { shipperService } from '../services/shipperService';

interface PaymentSettlementModalProps {
  orderId: number;
  orderCode: string;
  totalAmount: number;
  paymentMethod: 'COD' | 'VNPAY' | 'VIETQR';
  paymentStatus?: 'UNPAID' | 'PAID' | 'REFUNDED';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
}

export const PaymentSettlementModal: React.FC<PaymentSettlementModalProps> = ({
  orderId,
  orderCode,
  totalAmount,
  paymentMethod,
  paymentStatus,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Kiểm tra xem đơn này đã thanh toán trước chưa (VNPAY hoặc paymentStatus === PAID)
  const isPrepaid = paymentStatus === 'PAID' || paymentMethod === 'VNPAY';

  const [activeTab, setActiveTab] = useState<'CASH' | 'VIETQR'>('CASH');

  // State cho Tiền mặt (Cash)
  const [cashReceived, setCashReceived] = useState<number>(totalAmount);
  const [cashSubmitting, setCashSubmitting] = useState<boolean>(false);

  // State cho VietQR
  const [qrLoading, setQrLoading] = useState<boolean>(false);
  const [qrData, setQrData] = useState<any>(null);
  const [isQrPaid, setIsQrPaid] = useState<boolean>(false);
  const [pollingActive, setPollingActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Reset state mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setCashReceived(totalAmount);
      setErrorMsg('');
      setIsQrPaid(false);
      setQrData(null);
      setPollingActive(false);
      setActiveTab(paymentMethod === 'VIETQR' ? 'VIETQR' : 'CASH');
    }
  }, [isOpen, totalAmount, paymentMethod]);

  // Sinh mã VietQR khi chuyển sang tab VIETQR (chỉ với đơn COD/VietQR)
  useEffect(() => {
    if (isOpen && !isPrepaid && activeTab === 'VIETQR' && !qrData && !qrLoading) {
      handleGenerateQr();
    }
  }, [isOpen, activeTab, isPrepaid]);

  // Polling thời gian thực kiểm tra thanh toán VietQR
  useEffect(() => {
    let intervalId: any = null;
    if (isOpen && !isPrepaid && activeTab === 'VIETQR' && pollingActive && !isQrPaid) {
      intervalId = setInterval(async () => {
        try {
          const statusRes = await shipperService.getPaymentStatus(orderId);
          if (statusRes.isPaid || statusRes.paymentStatus === 'PAID') {
            setIsQrPaid(true);
            setPollingActive(false);
          }
        } catch (e) {
          console.error('Error polling payment status', e);
        }
      }, 2500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, activeTab, pollingActive, isQrPaid, orderId, isPrepaid]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  // Tính tiền thối lại cho khách
  const changeDue = Math.max(0, cashReceived - totalAmount);

  const cashPresets = [
    totalAmount,
    Math.ceil(totalAmount / 500000) * 500000 || totalAmount + 200000,
    Math.ceil(totalAmount / 1000000) * 1000000 || totalAmount + 500000,
  ].filter((v, idx, arr) => arr.indexOf(v) === idx && v >= totalAmount);

  // Xử lý xác nhận giao hàng cho đơn ĐÃ THANH TOÁN TRƯỚC (VNPAY / PAID) -> Thu 0đ
  const handleConfirmPrepaidDelivery = async () => {
    try {
      setCashSubmitting(true);
      setErrorMsg('');
      await shipperService.completeDelivery(orderId);
      onSuccess(`Đã xác nhận giao hàng thành công đơn #${orderCode}! Đơn hàng đã được thanh toán online đầy đủ.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Có lỗi xảy ra khi xác nhận giao hàng.');
    } finally {
      setCashSubmitting(false);
    }
  };

  // Xử lý xác nhận thu tiền mặt
  const handleConfirmCash = async () => {
    if (cashReceived < totalAmount) {
      setErrorMsg(`Số tiền khách đưa (${formatCurrency(cashReceived)}) không đủ số tiền cần thu (${formatCurrency(totalAmount)})`);
      return;
    }

    try {
      setCashSubmitting(true);
      setErrorMsg('');
      await shipperService.completeDelivery(orderId);
      onSuccess(`Xác nhận thu tiền mặt thành công! Đơn hàng #${orderCode} đã hoàn tất.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Có lỗi xảy ra khi xác nhận thu tiền.');
    } finally {
      setCashSubmitting(false);
    }
  };

  // Tạo VietQR
  const handleGenerateQr = async () => {
    try {
      setQrLoading(true);
      setErrorMsg('');
      const data = await shipperService.generateVietQr(orderId);
      setQrData(data);
      setPollingActive(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Không thể tạo mã VietQR lúc này.');
    } finally {
      setQrLoading(false);
    }
  };

  // Shipper hoàn tất đơn khi khách đã chuyển khoản VietQR xong
  const handleCompleteVietQr = async () => {
    try {
      setCashSubmitting(true);
      await shipperService.completeDelivery(orderId);
      onSuccess(`Thanh toán VietQR đã xác nhận thành công! Đơn hàng #${orderCode} đã hoàn tất.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Có lỗi xảy ra khi hoàn tất đơn.');
    } finally {
      setCashSubmitting(false);
    }
  };

  const handleSimulateWebhook = () => {
    setIsQrPaid(true);
    setPollingActive(false);
  };

  return (
    <div className="shipper-modal-overlay" onClick={onClose}>
      <div className="shipper-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="shipper-modal-handle" />

        {/* Modal Header */}
        <div className="shipper-modal-header">
          <div className="shipper-modal-title-wrap">
            <ShieldCheck size={18} color="#d4af37" />
            <span style={{ fontSize: '0.72rem', color: '#d4af37', fontWeight: 700, letterSpacing: '0.08em' }}>
              SECURE SETTLEMENT
            </span>
          </div>
          <button type="button" className="shipper-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* =========================================================================
            TRƯỜNG HỢP 1: ĐƠN ĐÃ THANH TOÁN ONLINE (VNPAY / PAID) -> POPUP RIÊNG BIỆT KHÔNG BẮT THU TIỀN
           ========================================================================= */}
        {isPrepaid ? (
          <div>
            <h3 className="shipper-settlement-title">
              Xác nhận bàn giao rượu
            </h3>

            <div className="shipper-prepaid-highlight-box">
              <div className="shipper-prepaid-badge">
                <CheckCircle2 size={16} />
                <span>ĐÃ THANH TOÁN ONLINE (VNPAY)</span>
              </div>

              <div className="shipper-prepaid-amount-row">
                <span>Số tiền Shipper cần thu:</span>
                <span className="shipper-prepaid-zero">0 VNĐ</span>
              </div>

              <p className="shipper-prepaid-desc">
                Đơn hàng <strong>#{orderCode}</strong> đã được thanh toán 100% trước qua cổng thanh toán online. Shipper chỉ cần kiểm tra rượu và trao tận tay khách hàng.
              </p>
            </div>

            {errorMsg && <div className="shipper-error-banner">{errorMsg}</div>}

            <button
              type="button"
              className="shipper-action-btn-primary"
              style={{ marginTop: '1.25rem' }}
              onClick={handleConfirmPrepaidDelivery}
              disabled={cashSubmitting}
            >
              <PackageCheck size={18} />
              <span>{cashSubmitting ? 'Đang xác nhận...' : 'XÁC NHẬN GIAO HÀNG THÀNH CÔNG'}</span>
            </button>
          </div>
        ) : (
          /* =========================================================================
              TRƯỜNG HỢP 2: ĐƠN COD / THU TIỀN TẠI CHỖ (Tiền mặt hoặc Quét VietQR)
             ========================================================================= */
          <div>
            <h3 className="shipper-settlement-title">
              Cash / VietQR Payment Settlement
            </h3>

            <div className="shipper-settlement-meta">
              <span>Order #{orderCode}</span>
              <span className="shipper-settlement-total">
                Total COD: <strong>{formatCurrency(totalAmount)}</strong>
              </span>
            </div>

            {errorMsg && <div className="shipper-error-banner">{errorMsg}</div>}

            {/* Toggle Tabs (Physical Cash vs Scan VietQR) */}
            <div className="shipper-payment-tabs">
              <button
                type="button"
                className={`shipper-payment-tab-btn ${activeTab === 'CASH' ? 'active' : ''}`}
                onClick={() => setActiveTab('CASH')}
              >
                <Banknote size={16} />
                <span>Physical Cash</span>
              </button>

              <button
                type="button"
                className={`shipper-payment-tab-btn ${activeTab === 'VIETQR' ? 'active' : ''}`}
                onClick={() => setActiveTab('VIETQR')}
              >
                <QrCode size={16} />
                <span>Scan VietQR</span>
              </button>
            </div>

            {/* TAB 1: PHYSICAL CASH */}
            {activeTab === 'CASH' && (
              <div className="shipper-tab-content">
                <div className="shipper-form-label">CASH RECEIVED FROM CUSTOMER</div>

                <div className="shipper-cash-presets">
                  {cashPresets.map((val) => (
                    <button
                      type="button"
                      key={val}
                      className={`shipper-cash-pill ${cashReceived === val ? 'active' : ''}`}
                      onClick={() => setCashReceived(val)}
                    >
                      {formatCurrency(val)}
                    </button>
                  ))}
                </div>

                <div className="shipper-cash-input-wrap">
                  <input
                    type="number"
                    className="shipper-cash-input"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    min={0}
                    step={10000}
                  />
                  <span className="shipper-cash-unit">₫</span>
                </div>

                {/* Tiền thối lại */}
                <div className="shipper-change-due-box">
                  <div className="shipper-change-left">
                    <span className="shipper-change-icon">⇄</span>
                    <span>Change due to customer</span>
                  </div>
                  <div className="shipper-change-amount">
                    {formatCurrency(changeDue)}
                  </div>
                </div>

                <div className="shipper-settlement-note">
                  Count the cash carefully and return the change before confirming.
                </div>

                <button
                  type="button"
                  className="shipper-action-btn-primary"
                  style={{ marginTop: '1.25rem' }}
                  onClick={handleConfirmCash}
                  disabled={cashSubmitting}
                >
                  <CheckCircle2 size={17} />
                  <span>{cashSubmitting ? 'Đang xác nhận...' : 'CONFIRM CASH RECEIVED'}</span>
                </button>
              </div>
            )}

            {/* TAB 2: SCAN VIETQR */}
            {activeTab === 'VIETQR' && (
              <div className="shipper-tab-content" style={{ textAlign: 'center' }}>
                {qrLoading ? (
                  <div style={{ padding: '3rem 0', color: '#d4af37' }}>
                    <Loader2 size={32} className="spin" style={{ margin: '0 auto 0.75rem auto' }} />
                    <div style={{ fontSize: '0.85rem' }}>Đang sinh mã VietQR động bảo mật...</div>
                  </div>
                ) : qrData ? (
                  <div>
                    <div className="shipper-qr-card">
                      <div className="shipper-qr-brand-row">
                        <span style={{ fontWeight: 800, color: '#ef4444' }}>Viet<span style={{ color: '#2563eb' }}>QR</span></span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>| NAPAS 247</span>
                      </div>

                      <div className="shipper-qr-image-box">
                        {qrData.qrCodeUrl ? (
                          <img src={qrData.qrCodeUrl} alt="VietQR" className="shipper-qr-img" />
                        ) : (
                          <div style={{ width: '180px', height: '180px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QrCode size={140} color="#000" />
                          </div>
                        )}
                      </div>

                      <div className="shipper-qr-amount">
                        {formatCurrency(qrData.amountToCollect || totalAmount)}
                      </div>
                      <div className="shipper-qr-memo">
                        Reference: #{orderCode}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#8b857d', marginTop: '4px' }}>
                        DEMO QR • NO REAL PAYMENT
                      </div>
                    </div>

                    <div className="shipper-qr-status-indicator">
                      {isQrPaid ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#22c55e' }}>
                          <CheckCircle2 size={16} />
                          <span style={{ fontWeight: 600 }}>Khách hàng đã chuyển khoản thành công!</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#e5be3e' }}>
                          <Loader2 size={15} className="spin" />
                          <span>Awaiting customer payment webhook...</span>
                        </div>
                      )}
                    </div>

                    {!isQrPaid && (
                      <button
                        type="button"
                        className="shipper-simulate-link"
                        onClick={handleSimulateWebhook}
                      >
                        Simulate payment received →
                      </button>
                    )}

                    <button
                      type="button"
                      className="shipper-action-btn-primary"
                      style={{ 
                        marginTop: '1rem',
                        opacity: isQrPaid ? 1 : 0.6,
                        cursor: isQrPaid ? 'pointer' : 'not-allowed'
                      }}
                      onClick={handleCompleteVietQr}
                      disabled={!isQrPaid || cashSubmitting}
                    >
                      <CheckCircle2 size={17} />
                      <span>{cashSubmitting ? 'Đang hoàn tất...' : 'Mark Order Completed'}</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '2rem 0' }}>
                    <AlertCircle size={32} color="#ef4444" style={{ margin: '0 auto 0.75rem auto' }} />
                    <div style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '1rem' }}>
                      Không thể kết nối đến cổng VietQR
                    </div>
                    <button type="button" className="shipper-btn-secondary" onClick={handleGenerateQr}>
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="shipper-brand-slogan" style={{ marginTop: '1.25rem' }}>
          URBAN WINE • COURIER OPERATIONS
        </div>
      </div>
    </div>
  );
};
