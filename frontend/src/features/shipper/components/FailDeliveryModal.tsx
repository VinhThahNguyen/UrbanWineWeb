import React, { useState } from 'react';
import { XCircle, X, Send, PhoneOff, MapPinOff, UserX } from 'lucide-react';
import { shipperService } from '../services/shipperService';

interface FailDeliveryModalProps {
  orderId: number;
  orderCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg?: string) => void;
}

export const FailDeliveryModal: React.FC<FailDeliveryModalProps> = ({
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
    { label: 'Khách không nghe máy (đã gọi 3 lần)', icon: PhoneOff },
    { label: 'Khách từ chối nhận hàng (boom hàng)', icon: UserX },
    { label: 'Sai địa chỉ, không tìm thấy người nhận', icon: MapPinOff },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập lý do giao hàng không thành công');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await shipperService.failDelivery(orderId, reason.trim());
      onSuccess(`Đã báo cáo giao hàng không thành công cho đơn #${orderCode}. Kiện hàng rượu sẽ được hệ thống hoàn kho tự động.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Có lỗi xảy ra khi báo thất bại.');
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
            <XCircle size={20} color="#ef4444" />
            <h3 className="shipper-modal-title">Báo cáo giao không thành công</h3>
          </div>
          <button type="button" className="shipper-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="shipper-modal-sub">
          Đơn hàng <strong>#{orderCode}</strong> sẽ chuyển sang trạng thái HỦY (CANCELLED) và tự động hoàn trả số lượng rượu vào kho theo quy tắc BR-04.
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
            <label className="shipper-form-label">Ghi chú chi tiết lý do thất bại:</label>
            <textarea
              className="shipper-textarea"
              rows={3}
              placeholder="Nhập ghi chú chi tiết kết quả liên lạc với khách hàng..."
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
              Quay lại
            </button>
            <button
              type="submit"
              className="shipper-btn-danger"
              disabled={submitting}
            >
              <Send size={15} />
              <span>{submitting ? 'Đang cập nhật...' : 'Xác nhận thất bại'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
