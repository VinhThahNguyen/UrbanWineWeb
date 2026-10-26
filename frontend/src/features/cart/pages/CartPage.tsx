import React from 'react';
import { WineProduct } from '@/features/wine/data/winesData';
import { Trash2, Minus, Plus, ChevronLeft, Info, ShoppingBag, Loader2 } from 'lucide-react';
import './CartPage.css';

export interface CartItem {
  cartItemId?: number;
  wine: WineProduct;
  quantity: number;
}

interface CartPageProps {
  items: CartItem[];
  onUpdateQuantity: (wineId: string | number, newQuantity: number) => void;
  onRemoveItem: (wineId: string | number) => void;
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
  isLoading?: boolean;
}

export const CartPage: React.FC<CartPageProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onContinueShopping,
  onProceedToCheckout,
  isLoading = false,
}) => {
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  const subtotal = items.reduce((sum, item) => sum + item.wine.price * item.quantity, 0);
  const vatAmount = subtotal * 0.1; // 10% VAT
  const deliveryFee = items.length > 0 ? 30000 : 0; // 30.000₫ inner-city
  const grandTotal = subtotal + vatAmount + deliveryFee;

  return (
    <div className="cart-page-container">
      {/* 3-Step Process Breadcrumb */}
      <div className="cart-steps-header">
        <span className="step-item active">1. Cart</span>
        <span className="step-divider-line"></span>
        <span className="step-item">2. Checkout</span>
        <span className="step-divider-line"></span>
        <span className="step-item">3. Confirmation</span>
      </div>

      <div className="cart-title-row">
        <h1 className="cart-page-title">Your Cart</h1>
        <div className="cart-items-selected-lbl">
          {items.length} items selected
        </div>
      </div>

      {/* Reservation Alert notice */}
      <div className="cart-alert-notice">
        <Info size={18} />
        <span>Cart items are not reserved until checkout completion. Complete your order to secure your selection.</span>
      </div>

      {isLoading ? (
        <div className="empty-cart-view">
          <Loader2 size={32} className="spin-icon" style={{ color: '#d4af37', marginBottom: '1rem' }} />
          <p style={{ color: '#d4af37', fontSize: '1rem', fontWeight: 500 }}>
            Đang tải dữ liệu giỏ hàng từ cơ sở dữ liệu...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-cart-view" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.2)', marginBottom: '1.25rem', color: '#d4af37' }}>
            <ShoppingBag size={40} />
          </div>
          <h2 style={{ color: '#f7f3ed', fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.65rem', fontFamily: 'Cinzel, Georgia, serif' }}>
            Giỏ hàng của bạn đang trống
          </h2>
          <p style={{ color: '#a1a1aa', maxWidth: '460px', margin: '0 auto 1.75rem auto', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Không có sản phẩm nào trong giỏ hàng từ Database. Bạn hãy dạo một vòng Wine Cellar để lựa chọn những chai vang hảo hạng nhé.
          </p>
          <button className="btn-proceed-checkout" onClick={onContinueShopping} style={{ width: 'auto', padding: '0.85rem 2.25rem' }}>
            EXPLORE WINE CELLAR
          </button>
        </div>
      ) : (
        <div className="cart-grid-layout">
          {/* Left Column: Items Table */}
          <div className="cart-table-wrapper">
            <div className="cart-table-header">
              <span>WINE</span>
              <span>UNIT PRICE</span>
              <span style={{ textAlign: 'center' }}>QTY</span>
              <span style={{ textAlign: 'right' }}>TOTAL</span>
            </div>

            {items.map((item) => (
              <div key={item.wine.id} className="cart-table-row">
                <div className="cart-col-wine">
                  <img src={item.wine.imageUrl} alt={item.wine.name} className="cart-wine-thumb" />
                  <div className="cart-wine-meta">
                    <span className="cart-wine-name">{item.wine.name}</span>
                    <span className="cart-wine-sub">
                      {item.wine.vintage} · {item.wine.winery}
                    </span>
                    <span className="cart-wine-sub">
                      {item.wine.category} · {item.wine.abv}% ABV
                    </span>
                  </div>
                </div>

                <div className="cart-col-price">
                  {formatVnd(item.wine.price)}
                </div>

                <div className="qty-stepper" style={{ justifySelf: 'center' }}>
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQuantity(item.wine.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => onUpdateQuantity(item.wine.id, item.quantity + 1)}
                    disabled={item.quantity >= item.wine.stock}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="cart-col-total">
                  <span className="cart-line-total-price">
                    {formatVnd(item.wine.price * item.quantity)}
                  </span>
                  <button
                    className="btn-remove-item"
                    onClick={() => onRemoveItem(item.wine.id)}
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            <div className="cart-back-btn" onClick={onContinueShopping}>
              <ChevronLeft size={16} />
              <span>Continue browsing</span>
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="order-summary-card">
            <h3 className="order-summary-title">Order Summary</h3>

            <div className="summary-rows-group">
              <div className="summary-row">
                <span>Subtotal ({items.length} items)</span>
                <span className="summary-val">{formatVnd(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>VAT (10%)</span>
                <span className="summary-val">{formatVnd(vatAmount)}</span>
              </div>
              <div className="summary-row">
                <span>Inner-City Delivery</span>
                <span className="summary-val">{formatVnd(deliveryFee)}</span>
              </div>
            </div>

            <div className="grand-total-row">
              <span className="grand-total-lbl">Grand Total</span>
              <span className="grand-total-val">{formatVnd(grandTotal)}</span>
            </div>

            <button className="btn-proceed-checkout" onClick={onProceedToCheckout}>
              PROCEED TO CHECKOUT
            </button>

            <p className="summary-disclaimer">
              Inner Hanoi delivery only. Must be 18+ to purchase. Prices include VAT.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
