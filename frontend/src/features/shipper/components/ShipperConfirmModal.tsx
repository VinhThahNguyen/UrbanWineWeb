import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ShipperToastType = 'SUCCESS' | 'WARNING' | 'INFO' | 'ERROR';

interface ShipperConfirmModalProps {
  isOpen: boolean;
  type?: ShipperToastType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ShipperConfirmModal: React.FC<ShipperConfirmModalProps> = ({
  isOpen,
  type = 'SUCCESS',
  title,
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Đóng',
  showCancel = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 size={36} color="#22c55e" />;
      case 'WARNING':
        return <AlertTriangle size={36} color="#e5be3e" />;
      case 'ERROR':
        return <AlertTriangle size={36} color="#ef4444" />;
      default:
        return <Info size={36} color="#d4af37" />;
    }
  };

  return (
    <div className="shipper-modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div 
        className="shipper-action-popup-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button" 
          className="shipper-modal-close-btn" 
          style={{ position: 'absolute', top: '12px', right: '12px' }}
          onClick={onClose}
        >
          <X size={16} />
        </button>

        <div className={`shipper-action-popup-icon ${type.toLowerCase()}`}>
          {renderIcon()}
        </div>

        <h3 className="shipper-action-popup-title">{title}</h3>
        <p className="shipper-action-popup-msg">{message}</p>

        <div className="shipper-action-popup-buttons">
          {showCancel && (
            <button
              type="button"
              className="shipper-btn-secondary"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className="shipper-action-btn-primary"
            style={{ padding: '0.75rem 1.25rem' }}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
