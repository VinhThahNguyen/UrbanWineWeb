import React, { useState } from 'react';
import { Wine as WineIcon, Search, ShoppingBag } from 'lucide-react';
import { CartItem } from '@/features/cart/pages/CartPage';
import { orderApi } from '@/shared/api/orderApi';
import { VietQrModal } from '../components/VietQrModal';
import './CheckoutPage.css';

interface CheckoutPageProps {
  currentUser?: any;
  cartItems: CartItem[];
  onBackToCart: () => void;
  onBackToCellar: () => void;
  onOrderPlaced: (orderCode: string) => void;
  onViewOrders: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  currentUser,
  cartItems,
  onBackToCart,
  onBackToCellar,
  onOrderPlaced,
  onViewOrders,
}) => {
  // Autofill account toggle
  const [useAccountInfo, setUseAccountInfo] = useState<boolean>(true);

  // Form Fields - strictly initialized from authenticated currentUser (0 hardcoded data)
  const [recipientName, setRecipientName] = useState<string>(
    currentUser?.fullName || ''
  );
  const [recipientPhone, setRecipientPhone] = useState<string>(
    currentUser?.phone || ''
  );
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    currentUser?.address || ''
  );
  const [deliveryNote, setDeliveryNote] = useState<string>('');

  // Sync with currentUser if loaded
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName && !recipientName) setRecipientName(currentUser.fullName);
      if (currentUser.phone && !recipientPhone) setRecipientPhone(currentUser.phone);
      if (currentUser.address && !deliveryAddress) setDeliveryAddress(currentUser.address);
    }
  }, [currentUser]);

  // Payment method: 'COD' | 'VIETQR'
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VIETQR'>('COD');

  // VietQR Modal state
  const [isVietQrOpen, setIsVietQrOpen] = useState<boolean>(false);
  const [createdOrderCode, setCreatedOrderCode] = useState<string>('#UWE-8911');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Financial calculations from Backend API
  const [summary, setSummary] = useState<{
    subtotal: number;
    vatAmount: number;
    shippingFee: number;
    totalAmount: number;
  }>(() => {
    const rawSubtotal = cartItems.reduce((sum, item) => sum + item.wine.price * item.quantity, 0);
    const rawVat = Math.round(rawSubtotal * 0.1);
    const rawShip = 30000;
    return {
      subtotal: rawSubtotal,
      vatAmount: rawVat,
      shippingFee: rawShip,
      totalAmount: rawSubtotal + rawVat + rawShip,
    };
  });

  // Calculate real checkout summary from Backend API
  React.useEffect(() => {
    if (cartItems.length === 0) return;
    const loadSummary = async () => {
      try {
        const res = await orderApi.calculateCheckoutSummary({
          deliveryAddress,
          items: cartItems.map((it) => ({
            wineId: Number(it.wine.id),
            quantity: it.quantity,
          })),
        });
        setSummary({
          subtotal: res.merchandiseSubtotal,
          vatAmount: res.vatAmount,
          shippingFee: res.shippingFee,
          totalAmount: res.totalAmount,
        });
      } catch (err) {
        console.warn('Backend calculateCheckoutSummary error:', err);
      }
    };
    loadSummary();
  }, [deliveryAddress, cartItems]);

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + '₫';
  };

  // Toggle account autofill
  const handleToggleAutofill = (checked: boolean) => {
    setUseAccountInfo(checked);
    if (checked && currentUser) {
      setRecipientName(currentUser.fullName || '');
      setRecipientPhone(currentUser.phone || '');
      setDeliveryAddress(currentUser.address || '');
    }
  };

  // Handle Place Order directly with Backend API
  const handlePlaceOrder = async () => {
    if (!recipientName.trim() || !recipientPhone.trim() || !deliveryAddress.trim()) {
      alert('Vui lòng điền đầy đủ thông tin người nhận và địa chỉ giao hàng.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const orderReq = {
        recipientName,
        recipientPhone,
        deliveryAddress,
        deliveryNote,
        paymentMethod: (paymentMethod === 'COD' ? 'COD' : 'VNPAY') as 'COD' | 'VNPAY',
        items: cartItems.map((it) => ({
          wineId: Number(it.wine.id),
          quantity: it.quantity,
        })),
      };

      const response = await orderApi.placeOrder(orderReq);
      const code = response.orderCode || `#UWE-${response.orderId}`;
      setCreatedOrderCode(code);

      if (paymentMethod === 'VIETQR') {
        setIsVietQrOpen(true);
      } else {
        onOrderPlaced(code);
      }
    } catch (error: any) {
      console.error('Backend placeOrder error:', error);
      alert(error?.response?.data?.message || 'Đặt hàng thất bại. Quý khách vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="checkout-page-container">
      {/* 1. TOP HEADER */}
      <header className="checkout-header">
        <div className="checkout-header-left">
          <div className="checkout-brand" onClick={onBackToCellar}>
            <WineIcon size={24} className="checkout-brand-icon" />
            <div className="checkout-brand-titles">
              <span className="checkout-brand-main">Urban Wine</span>
              <span className="checkout-brand-sub">EXPRESS</span>
            </div>
          </div>

          <div className="checkout-search-wrapper">
            <Search size={15} className="checkout-search-icon" />
            <input
              type="text"
              placeholder="Sassica"
              className="checkout-search-input"
            />
          </div>
        </div>

        <div className="checkout-header-right">
          <div className="checkout-nav-tabs">
            <button className="checkout-nav-pill" onClick={onBackToCellar}>
              Cellar
            </button>
            <button className="checkout-nav-pill" onClick={onBackToCart}>
              Cart
            </button>
            <button className="checkout-nav-pill" onClick={onViewOrders}>
              My Orders
            </button>
          </div>

          <button className="checkout-cart-btn" onClick={onBackToCart} title="Xem giỏ hàng">
            <ShoppingBag size={19} />
            {totalCartCount > 0 && (
              <span className="checkout-cart-badge">{totalCartCount}</span>
            )}
          </button>

          <div className="checkout-user-pill" title="Tài khoản khách hàng">
            <span>
              Xin chào, <strong>{currentUser?.fullName || currentUser?.email || 'Quý khách'}</strong>
            </span>
            <span className="checkout-user-badge-red">
              {currentUser?.fullName
                ? (currentUser.fullName.trim().split(/\s+/).length >= 2
                    ? (currentUser.fullName.trim().split(/\s+/)[0][0] + currentUser.fullName.trim().split(/\s+/).slice(-1)[0][0]).toUpperCase()
                    : currentUser.fullName.slice(0, 2).toUpperCase())
                : (currentUser?.email ? currentUser.email.slice(0, 2).toUpperCase() : 'KH')}
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN CHECKOUT BODY */}
      <main className="checkout-main-content">
        {/* Breadcrumbs */}
        <div className="checkout-breadcrumbs">
          <span className="breadcrumb-step done" onClick={onBackToCart}>
            1. Cart
          </span>
          <span className="breadcrumb-divider"></span>
          <span className="breadcrumb-step active">
            2. Checkout
          </span>
          <span className="breadcrumb-divider"></span>
          <span className="breadcrumb-step">
            3. Confirmation
          </span>
        </div>

        <h1 className="checkout-page-title">Checkout</h1>

        {/* 2-Column Grid */}
        <div className="checkout-grid">
          {/* LEFT COLUMN: Delivery & Payment */}
          <div className="checkout-col-left">
            {/* Card 1: Delivery & Recipient */}
            <div className="checkout-card">
              <div className="checkout-card-header">
                <h3 className="checkout-card-title">Delivery & Recipient</h3>
                <span className="badge-inner-hanoi">
                  🏍 Inner Hanoi · 90 min
                </span>
              </div>

              {/* Autofill from saved profile checkbox */}
              <label className="autofill-banner-box">
                <input
                  type="checkbox"
                  className="autofill-checkbox"
                  checked={useAccountInfo}
                  onChange={(e) => handleToggleAutofill(e.target.checked)}
                />
                <div>
                  <span className="autofill-text-main">Use my account information</span>
                  <span className="autofill-text-sub">Auto-fill from your saved profile</span>
                </div>
              </label>

              {/* Recipient Full Name */}
              <div className="checkout-field-group">
                <label className="checkout-field-label">RECIPIENT FULL NAME</label>
                <input
                  type="text"
                  className="checkout-input-text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                />
              </div>

              {/* Recipient Phone Number */}
              <div className="checkout-field-group">
                <label className="checkout-field-label">RECIPIENT PHONE NUMBER</label>
                <input
                  type="tel"
                  className="checkout-input-text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </div>

              {/* Delivery Address */}
              <div className="checkout-field-group">
                <label className="checkout-field-label">
                  DELIVERY ADDRESS <span style={{ color: '#d4af37' }}>Inner Hanoi only</span>
                </label>
                <input
                  type="text"
                  className="checkout-input-text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Số nhà, ngõ, tên đường, quận, Hà Nội..."
                />
                <span className="checkout-sub-hint">
                  We currently deliver within Hoàn Kiếm, Đống Đa, Ba Đình, Hai Bà Trưng, Tây Hồ
                </span>
              </div>

              {/* Delivery Note (Optional) */}
              <div className="checkout-field-group">
                <label className="checkout-field-label">DELIVERY NOTE (OPTIONAL)</label>
                <textarea
                  className="checkout-textarea"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Gift message, gate code, or delivery instructions..."
                />
              </div>
            </div>

            {/* Card 2: Payment Method */}
            <div className="checkout-card">
              <h3 className="checkout-card-title">Payment Method</h3>

              <div className="payment-methods-stack">
                {/* Method 1: COD */}
                <div
                  className={`payment-method-card ${paymentMethod === 'COD' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('COD')}
                >
                  <div className="payment-method-left">
                    <div className="payment-radio-circle">
                      {paymentMethod === 'COD' && <div className="payment-radio-dot"></div>}
                    </div>
                    <div className="payment-method-text-group">
                      <div className="payment-method-title-row">
                        <span className="payment-method-name">Cash on Delivery (COD)</span>
                        <span className="badge-tag-green">Most Popular</span>
                      </div>
                      <span className="payment-method-desc">
                        Pay upon delivery — exact change appreciated
                      </span>
                    </div>
                  </div>
                  <span className="payment-method-icon-emoji">💵</span>
                </div>

                {/* Method 2: Dynamic VietQR */}
                <div
                  className={`payment-method-card ${paymentMethod === 'VIETQR' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('VIETQR')}
                >
                  <div className="payment-method-left">
                    <div className="payment-radio-circle">
                      {paymentMethod === 'VIETQR' && <div className="payment-radio-dot"></div>}
                    </div>
                    <div className="payment-method-text-group">
                      <div className="payment-method-title-row">
                        <span className="payment-method-name">Dynamic VietQR / Banking</span>
                        <span className="badge-tag-blue">Instant</span>
                      </div>
                      <span className="payment-method-desc">
                        Instant auto-scan QR — supports all Vietnamese banks & e-wallets
                      </span>
                    </div>
                  </div>
                  <span className="payment-method-icon-emoji">📱</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Review */}
          <div className="checkout-col-right">
            <div className="checkout-card-review">
              <h3 className="checkout-card-title">Order Review</h3>

              {/* Items List */}
              <div className="review-items-list">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="review-item-row">
                    <div className="review-item-left">
                      <img
                        src={item.wine.imageUrl}
                        alt={item.wine.name}
                        className="review-item-thumb"
                      />
                      <div>
                        <span className="review-item-name">{item.wine.name}</span>
                        <span className="review-item-meta">
                          {item.wine.vintage} · {item.quantity}×
                        </span>
                      </div>
                    </div>
                    <span className="review-item-price">
                      {formatVnd(item.wine.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calculation Rows */}
              <div className="review-calculations">
                <div className="calc-row">
                  <span>Subtotal</span>
                  <span className="calc-row-val">{formatVnd(summary.subtotal)}</span>
                </div>
                <div className="calc-row">
                  <span>VAT (10%)</span>
                  <span className="calc-row-val">{formatVnd(summary.vatAmount)}</span>
                </div>
                <div className="calc-row">
                  <span>Delivery fee</span>
                  <span className="calc-row-val">{formatVnd(summary.shippingFee)}</span>
                </div>
              </div>

              {/* Total Row */}
              <div className="calc-total-row">
                <span className="calc-total-label">Total</span>
                <span className="calc-total-val">{formatVnd(summary.totalAmount)}</span>
              </div>

              {/* Place Order CTA Button */}
              <button
                className="btn-place-order"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? 'Processing...' : 'PLACE ORDER'}
              </button>

              {/* Back to Cart link */}
              <button className="btn-back-to-cart" onClick={onBackToCart}>
                ← BACK TO CART
              </button>

              {/* Compliance Sub-text */}
              <p className="checkout-compliance-footer">
                Inner Hanoi delivery only · Must be 18+ · All prices include VAT
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Dynamic VietQR Modal */}
      {isVietQrOpen && (
        <VietQrModal
          orderCode={createdOrderCode}
          amount={summary.totalAmount}
          onSuccess={() => {
            setIsVietQrOpen(false);
            onOrderPlaced(createdOrderCode);
          }}
          onClose={() => setIsVietQrOpen(false)}
        />
      )}
    </div>
  );
};
