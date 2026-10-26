import React from 'react';
import { Check } from 'lucide-react';
import './OrderPlacedPage.css';

interface OrderPlacedPageProps {
  orderCode: string;
  onTrackOrder: () => void;
  onContinueShopping: () => void;
}

export const OrderPlacedPage: React.FC<OrderPlacedPageProps> = ({
  orderCode,
  onTrackOrder,
  onContinueShopping,
}) => {
  return (
    <div className="order-placed-container">
      <div className="order-placed-card">
        {/* Golden Checkmark Circle */}
        <div className="order-placed-icon-circle">
          <Check size={28} />
        </div>

        {/* Title */}
        <h1 className="order-placed-title">Order Placed!</h1>

        {/* Received confirmation */}
        <p className="order-placed-desc-main">
          Your order <span className="order-code-highlight">{orderCode}</span> has been received.
        </p>

        {/* 90min & SMS description */}
        <p className="order-placed-desc-sub">
          Your wine will arrive within 90 minutes. You'll receive an SMS confirmation shortly.
        </p>

        {/* Action Buttons */}
        <div className="order-placed-actions">
          <button className="btn-track-order" onClick={onTrackOrder}>
            Track Order
          </button>
          <button className="btn-continue-shopping" onClick={onContinueShopping}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
