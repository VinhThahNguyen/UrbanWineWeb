import React, { useState, useEffect } from 'react';
import { X, Clock, Copy, Check } from 'lucide-react';
import { orderApi } from '@/shared/api/orderApi';
import './VietQrModal.css';

interface VietQrModalProps {
  orderCode: string;
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}

export const VietQrModal: React.FC<VietQrModalProps> = ({
  orderCode,
  amount,
  onSuccess,
  onClose,
}) => {
  // 15-minute countdown timer (SRS BR-07 rule)
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Real Backend Polling: Check if payment status transitioned to PAID
  useEffect(() => {
    const orderId = Number(orderCode.replace(/\D/g, ''));
    if (!orderId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await orderApi.getPaymentStatus(orderId);
        if (res.paymentStatus === 'PAID') {
          clearInterval(pollInterval);
          onSuccess();
        }
      } catch (e) {
        // Continue polling silently
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [orderCode, onSuccess]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + '₫';
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // VietQR Quicklink API standard
  // Bank: MB (Military Commercial Joint Stock Bank) - 970422
  const bankAccount = '0901234567';
  const bankName = 'MB Bank (Ngân hàng Quân Đội)';
  const accountHolder = 'URBAN WINE EXPRESS CO LTD';
  const qrUrl = `https://api.vietqr.io/image/970422-${bankAccount}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(
    orderCode
  )}&accountName=${encodeURIComponent(accountHolder)}`;

  return (
    <div className="vietqr-overlay" onClick={onClose}>
      <div className="vietqr-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="vietqr-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <h3 className="vietqr-header-title">Dynamic VietQR</h3>

        {/* 15m Countdown Timer */}
        <div className="vietqr-timer-pill">
          <Clock size={14} />
          <span>Payment time remaining: {timeFormatted}</span>
        </div>

        {/* Real Dynamic QR Image */}
        <div className="vietqr-code-wrapper">
          <img
            src={qrUrl}
            alt="VietQR payment code"
            className="vietqr-image"
          />
          <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 500 }}>
            Supports all banking apps & e-wallets
          </span>
        </div>

        {/* Bank Details */}
        <div className="vietqr-banking-info">
          <div className="banking-info-row">
            <span className="banking-info-label">Bank:</span>
            <span className="banking-info-val">{bankName}</span>
          </div>

          <div className="banking-info-row">
            <span className="banking-info-label">Account Number:</span>
            <span className="banking-info-val">
              {bankAccount}
              <button
                className="btn-copy-chip"
                onClick={() => handleCopy(bankAccount, 'account')}
              >
                {copiedField === 'account' ? <Check size={12} /> : <Copy size={12} />}
                {copiedField === 'account' ? 'Copied' : 'Copy'}
              </button>
            </span>
          </div>

          <div className="banking-info-row">
            <span className="banking-info-label">Account Holder:</span>
            <span className="banking-info-val">{accountHolder}</span>
          </div>

          <div className="banking-info-row">
            <span className="banking-info-label">Amount:</span>
            <span className="banking-info-val amount">{formatVnd(amount)}</span>
          </div>

          <div className="banking-info-row">
            <span className="banking-info-label">Payment Note:</span>
            <span className="banking-info-val">
              <strong style={{ color: '#d4af37' }}>{orderCode}</strong>
              <button
                className="btn-copy-chip"
                onClick={() => handleCopy(orderCode, 'content')}
              >
                {copiedField === 'content' ? <Check size={12} /> : <Copy size={12} />}
                {copiedField === 'content' ? 'Copied' : 'Copy'}
              </button>
            </span>
          </div>
        </div>

        {/* Listening Indicator */}
        <div className="vietqr-status-indicator">
          <div className="spinner-pulse"></div>
          <span>Checking payment in real-time...</span>
        </div>

        {/* Action Confirm Button */}
        <div className="vietqr-actions">
          <button className="btn-done-transfer" onClick={onSuccess}>
            I Have Completed the Transfer
          </button>
        </div>
      </div>
    </div>
  );
};
