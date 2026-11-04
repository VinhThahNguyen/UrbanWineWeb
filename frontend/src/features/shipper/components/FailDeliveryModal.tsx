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
    { label: 'Customer did not answer (called 3 times)', icon: PhoneOff },
    { label: 'Customer refused order', icon: UserX },
    { label: 'Wrong address, customer not found', icon: MapPinOff },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Please choose or enter a reason for failed delivery');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await shipperService.failDelivery(orderId, reason.trim());
      onSuccess(`Reported failed delivery for order #${orderCode}. Items will be returned to stock.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Error reporting failed delivery.');
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
            <h3 className="shipper-modal-title">Report Failed Delivery</h3>
          </div>
          <button type="button" className="shipper-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="shipper-modal-sub">
          Order <strong>#{orderCode}</strong> will be CANCELLED and wine bottles will be returned to stock.
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
            <label className="shipper-form-label">Detailed reason for failed delivery:</label>
            <textarea
              className="shipper-textarea"
              rows={3}
              placeholder="Enter details about why delivery failed..."
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
              Back
            </button>
            <button
              type="submit"
              className="shipper-btn-danger"
              disabled={submitting}
            >
              <Send size={15} />
              <span>{submitting ? 'Updating...' : 'Confirm Failed'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
