import React, { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { WineProduct } from '../data/winesData';

interface SelectQuantityModalProps {
  wine: WineProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (wine: WineProduct, quantity: number) => void;
}

export const SelectQuantityModal: React.FC<SelectQuantityModalProps> = ({
  wine,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);

  if (!isOpen || !wine) return null;

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (quantity < wine.stock) setQuantity(quantity + 1);
  };

  const subtotal = wine.price * quantity;

  return (
    <div className="quantity-modal-overlay" onClick={onClose}>
      <div className="quantity-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        <div className="quantity-modal-subtitle">SELECT QUANTITY</div>
        <h2 className="quantity-modal-title">{wine.name}</h2>

        {/* Product preview snippet */}
        <div className="quantity-product-snippet">
          <img src={wine.imageUrl} alt={wine.name} className="snippet-img" />
          <div className="snippet-meta">
            <span className="snippet-producer">{wine.vintage} · {wine.winery}</span>
            <span className="snippet-region">{wine.region}</span>
            <span className="snippet-spec">{wine.abv}% ABV · {wine.volume}</span>
            <span className="snippet-price-unit">{formatVnd(wine.price)} / bottle</span>
          </div>
        </div>

        {/* Stock info */}
        <div className="cellar-stock-indicator">
          <span className="stock-dot"></span>
          <span>Available in cellar: <strong>{wine.stock} bottles</strong></span>
        </div>

        {/* Quantity Controls */}
        <div className="quantity-control-row">
          <span className="quantity-label">Quantity</span>
          <div className="qty-stepper">
            <button
              className="qty-btn"
              onClick={handleDecrease}
              disabled={quantity <= 1}
            >
              <Minus size={16} />
            </button>
            <span className="qty-value">{quantity}</span>
            <button
              className="qty-btn"
              onClick={handleIncrease}
              disabled={quantity >= wine.stock}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Subtotal */}
        <div className="subtotal-box">
          <span className="subtotal-label">Subtotal</span>
          <span className="subtotal-amount">{formatVnd(subtotal)}</span>
        </div>

        {/* Add to Cart button */}
        <button
          className="btn-add-to-cart-modal"
          onClick={() => {
            onAddToCart(wine, quantity);
            onClose();
          }}
        >
          ADD TO CART
        </button>
      </div>
    </div>
  );
};
