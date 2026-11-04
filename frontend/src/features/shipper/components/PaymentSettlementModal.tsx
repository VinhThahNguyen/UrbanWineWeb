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
  // Check if order is prepaid online (VNPAY or paymentStatus === PAID)
  const isPrepaid = paymentStatus === 'PAID' || paymentMethod === 'VNPAY';

  const [activeTab, setActiveTab] = useState<'CASH' | 'VIETQR'>('CASH');

  // State for Cash
  const [cashReceived, setCashReceived] = useState<number>(totalAmount);
  const [cashSubmitting, setCashSubmitting] = useState<boolean>(false);

  // State for VietQR
  const [qrLoading, setQrLoading] = useState<boolean>(false);
  const [qrData, setQrData] = useState<any>(null);
  const [isQrPaid, setIsQrPaid] = useState<boolean>(false);
  const [pollingActive, setPollingActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Reset state on modal open
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

  // Generate VietQR code when switching to VIETQR tab (COD/VietQR orders only)
  useEffect(() => {
    if (isOpen && !isPrepaid && activeTab === 'VIETQR' && !qrData && !qrLoading) {
      handleGenerateQr();
    }
  }, [isOpen, activeTab, isPrepaid]);

  // Real-time polling to check VietQR payment
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
    return new Intl.NumberFormat('vi-VN').format(val) + '₫';
  };

  // Calculate change due to customer
  const changeDue = Math.max(0, cashReceived - totalAmount);

  const cashPresets = [
    totalAmount,
    Math.ceil(totalAmount / 500000) * 500000 || totalAmount + 200000,
    Math.ceil(totalAmount / 1000000) * 1000000 || totalAmount + 500000,
  ].filter((v, idx, arr) => arr.indexOf(v) === idx && v >= totalAmount);

  // Confirm delivery for prepaid orders (VNPAY / PAID) -> Collect 0 VND
  const handleConfirmPrepaidDelivery = async () => {
    try {
      setCashSubmitting(true);
      setErrorMsg('');
      await shipperService.completeDelivery(orderId);
      onSuccess(`Delivery confirmed for order #${orderCode}! Order was paid online.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Error confirming delivery.');
    } finally {
      setCashSubmitting(false);
    }
  };

  // Confirm cash payment
  const handleConfirmCash = async () => {
    if (cashReceived < totalAmount) {
      setErrorMsg(`Cash received (${formatCurrency(cashReceived)}) is less than total amount (${formatCurrency(totalAmount)})`);
      return;
    }

    try {
      setCashSubmitting(true);
      setErrorMsg('');
      await shipperService.completeDelivery(orderId);
      onSuccess(`Cash payment confirmed! Order #${orderCode} completed.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Error confirming cash payment.');
    } finally {
      setCashSubmitting(false);
    }
  };

  // Create VietQR
  const handleGenerateQr = async () => {
    try {
      setQrLoading(true);
      setErrorMsg('');
      const data = await shipperService.generateVietQr(orderId);
      setQrData(data);
      setPollingActive(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Unable to create VietQR code right now.');
    } finally {
      setQrLoading(false);
    }
  };

  // Shipper completes order after customer transfers via VietQR
  const handleCompleteVietQr = async () => {
    try {
      setCashSubmitting(true);
      await shipperService.completeDelivery(orderId);
      onSuccess(`VietQR payment confirmed! Order #${orderCode} completed.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Error completing order.');
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
            CASE 1: PREPAID ONLINE (VNPAY / PAID) -> NO CASH COLLECTION NEEDED
           ========================================================================= */}
        {isPrepaid ? (
          <div>
            <h3 className="shipper-settlement-title">
              Confirm Wine Handover
            </h3>

            <div className="shipper-prepaid-highlight-box">
              <div className="shipper-prepaid-badge">
                <CheckCircle2 size={16} />
                <span>PAID ONLINE (VNPAY)</span>
              </div>

              <div className="shipper-prepaid-amount-row">
                <span>Amount to collect:</span>
                <span className="shipper-prepaid-zero">0 VND</span>
              </div>

              <p className="shipper-prepaid-desc">
                Order <strong>#{orderCode}</strong> is fully paid online. Just check the bottles and hand over to customer.
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
              <span>{cashSubmitting ? 'Confirming...' : 'CONFIRM DELIVERY COMPLETED'}</span>
            </button>
          </div>
        ) : (
          /* =========================================================================
              CASE 2: COD / PAY ON DELIVERY (Cash or VietQR)
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

                {/* Change due */}
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
                  <span>{cashSubmitting ? 'Confirming...' : 'CONFIRM CASH RECEIVED'}</span>
                </button>
              </div>
            )}

            {/* TAB 2: SCAN VIETQR */}
            {activeTab === 'VIETQR' && (
              <div className="shipper-tab-content" style={{ textAlign: 'center' }}>
                {qrLoading ? (
                  <div style={{ padding: '3rem 0', color: '#d4af37' }}>
                    <Loader2 size={32} className="spin" style={{ margin: '0 auto 0.75rem auto' }} />
                    <div style={{ fontSize: '0.85rem' }}>Creating secure VietQR code...</div>
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
                          <span style={{ fontWeight: 600 }}>Payment received successfully!</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#e5be3e' }}>
                          <Loader2 size={15} className="spin" />
                          <span>Waiting for customer payment...</span>
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
                      <span>{cashSubmitting ? 'Completing...' : 'Mark Order Completed'}</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '2rem 0' }}>
                    <AlertCircle size={32} color="#ef4444" style={{ margin: '0 auto 0.75rem auto' }} />
                    <div style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '1rem' }}>
                      Unable to connect to VietQR service
                    </div>
                    <button type="button" className="shipper-btn-secondary" onClick={handleGenerateQr}>
                      Retry
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
