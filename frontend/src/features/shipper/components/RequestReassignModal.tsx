import React, { useState } from 'react';
import { AlertTriangle, X, Send, Wrench, ShieldAlert, HeartPulse } from 'lucide-react';
import { shipperService } from '../services/shipperService';

interface RequestReassignModalProps {
  orderId: number;
  orderCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
}

export const RequestReassignModal: React.FC<RequestReassignModalProps> = ({
  orderId,
  orderCode,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const quickReasons = [
    { label: 'Hỏng xe / thủng lốp', icon: Wrench },
    { label: 'Sự cố / va chạm giao thông', icon: ShieldAlert },
    { label: 'Sức khỏe đột xuất / ngất xỉu', icon: HeartPulse },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng cung cấp lý do bạn cần bàn giao đơn hàng này');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await shipperService.requestRejectOrder(orderId, reason.trim());
      onSuccess(`Đã gửi yêu cầu bàn giao đơn #${orderCode} tới Quản lý thành công! Đơn hàng sẽ được Admin điều phối lại cho shipper khác.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Có lỗi xảy ra khi gửi yêu cầu bàn giao.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shipper-modal-overlay" onClick={onClose}>
      <div className="shipper-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="shipper-modal-handle" />

        <div className="shipper-modal-header">
          <div className="shipper-modal-title-wrap">
            <AlertTriangle size={20} color="#e5be3e" />
            <h3 className="shipper-modal-title">Báo sự cố & Bàn giao đơn</h3>
          </div>
          <button type="button" className="shipper-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="shipper-modal-sub">
          Đơn hàng <strong>#{orderCode}</strong> sẽ được gửi lên Quản trị viên để gán lại cho một Shipper khác đang trực ca. Ca làm việc của bạn vẫn duy trì (ON DUTY).
        </div>

        {errorMsg && <div className="shipper-error-banner">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="shipper-quick-pills">
            {quickReasons.map((qr) => (
              <button
                type="button"
                key={qr.label}
                className={`shipper-quick-pill ${reason === qr.label ? 'active' : ''}`}
                onClick={() => setReason(qr.label)}
              >
                <qr.icon size={13} />
                <span>{qr.label}</span>
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="shipper-form-label">Chi tiết lý do sự cố:</label>
            <textarea
              className="shipper-textarea"
              rows={3}
              placeholder="Mô tả cụ thể sự cố (ví dụ: xe hỏng tại ngã tư Tràng Tiền lúc 14:15, không kịp giao cho khách)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="shipper-modal-actions">
            <button
              type="button"
              className="shipper-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="shipper-btn-danger"
              disabled={submitting}
            >
              <Send size={15} />
              <span>{submitting ? 'Đang gửi...' : 'Gửi yêu cầu bàn giao'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
