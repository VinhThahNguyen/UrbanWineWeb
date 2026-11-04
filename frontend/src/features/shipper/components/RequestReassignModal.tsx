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
    { label: 'Vehicle breakdown / flat tire', icon: Wrench },
    { label: 'Traffic incident / accident', icon: ShieldAlert },
    { label: 'Sudden illness / medical issue', icon: HeartPulse },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Please provide a reason why you need to reassign this order');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      await shipperService.requestRejectOrder(orderId, reason.trim());
      onSuccess(`Reassign request for order #${orderCode} sent to Admin! The order will be assigned to another shipper.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'An error occurred while sending the request.');
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
            <h3 className="shipper-modal-title">Report Issue & Reassign Order</h3>
          </div>
          <button type="button" className="shipper-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="shipper-modal-sub">
          Order <strong>#{orderCode}</strong> will be sent to the Store Admin to assign to another on-duty shipper. You remain on duty.
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
            <label className="shipper-form-label">Issue details & reason:</label>
            <textarea
              className="shipper-textarea"
              rows={3}
              placeholder="Describe the issue (e.g. flat tire at 2:15 PM, cannot deliver in time)..."
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
              Cancel
            </button>
            <button
              type="submit"
              className="shipper-btn-danger"
              disabled={submitting}
            >
              <Send size={15} />
              <span>{submitting ? 'Sending...' : 'Send Reassign Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
