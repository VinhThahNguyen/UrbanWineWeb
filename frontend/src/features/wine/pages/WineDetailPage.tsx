import React, { useState } from 'react';
import { WineProduct } from '../data/winesData';
import { Truck, ShieldCheck, Snowflake, ChevronRight } from 'lucide-react';
import './WineDetailPage.css';

interface WineDetailPageProps {
  wine: WineProduct;
  onBack: () => void;
  onAddToCart: (wine: WineProduct, quantity: number) => void;
  onProceedToCheckout: (wine: WineProduct, quantity: number) => void;
}

export const WineDetailPage: React.FC<WineDetailPageProps> = ({
  wine,
  onBack,
  onAddToCart,
  onProceedToCheckout,
}) => {
  const [selectedPack, setSelectedPack] = useState<number>(1); // 1, 2, or 6
  const [activeThumb, setActiveThumb] = useState(0);

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  const images = [
    wine.imageUrl,
    'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=800&q=80',
  ];

  const totalAmount = wine.price * selectedPack;

  return (
    <div className="product-detail-page">
      {/* Breadcrumb navigation */}
      <div className="detail-breadcrumb">
        <span className="breadcrumb-link" onClick={onBack}>Home</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-link" onClick={onBack}>{wine.categoryName}</span>
        <span className="breadcrumb-separator">/</span>
        <span>{wine.name} {wine.vintage}</span>
      </div>

      <div className="detail-layout-grid">
        {/* Left Column: Visual Media Gallery */}
        <div className="detail-media-column">
          <div className="main-image-wrapper">
            <img
              src={images[activeThumb]}
              alt={wine.name}
              className="main-wine-image"
            />
            <div className="zoom-hint-badge">🔍 Hover to zoom</div>
          </div>

          <div className="thumbnails-row">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`thumb-item ${activeThumb === idx ? 'active' : ''}`}
                onClick={() => setActiveThumb(idx)}
              >
                <img src={img} alt={`${wine.name} thumb ${idx}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Wine Specifications & Purchase actions */}
        <div className="detail-info-column">
          <div className="detail-top-badges">
            <span className="badge-tag-type">{wine.category}</span>
            <span className="badge-tag-cellar">{wine.stock} in cellar</span>
          </div>

          <h1 className="detail-wine-title">{wine.name}</h1>
          <div className="detail-producer-row">
            {wine.vintage} · {wine.winery} | {wine.region} · {wine.country}
          </div>

          <div className="detail-rating-row">
            <span className="star-icons">★★★★★</span>
            <span className="rating-score">{wine.rating} / 5.0</span>
          </div>

          <div className="detail-price-hero">
            {formatVnd(wine.price)} <span>/ bottle</span>
          </div>

          <p className="detail-description-p">{wine.description}</p>

          {/* 4-Specs Matrix Table */}
          <div className="detail-specs-box">
            <div className="spec-cell">
              <div className="spec-lbl">ABV</div>
              <div className="spec-val">{wine.abv}%</div>
            </div>
            <div className="spec-cell">
              <div className="spec-lbl">GRAPE VARIETY</div>
              <div className="spec-val">Cabernet Sauvignon, Merlot, Petit Verdot</div>
            </div>
            <div className="spec-cell">
              <div className="spec-lbl">VINTAGE YEAR</div>
              <div className="spec-val">{wine.vintage}</div>
            </div>
            <div className="spec-cell">
              <div className="spec-lbl">VOLUME</div>
              <div className="spec-val">{wine.volume}</div>
            </div>
          </div>

          {/* Tasting Notes */}
          <div className="pills-group">
            <div className="pills-title">TASTING NOTES</div>
            <div className="pills-container">
              {wine.tastingNotes.map((note, i) => (
                <span key={i} className="pill-item">{note}</span>
              ))}
            </div>
          </div>

          {/* Food Pairing */}
          <div className="pills-group">
            <div className="pills-title">FOOD PAIRING</div>
            <div className="pills-container">
              {wine.foodPairing.map((food, i) => (
                <span key={i} className="pill-item" style={{ color: '#d1d5db' }}>{food}</span>
              ))}
            </div>
          </div>

          {/* Select Quantity Pack Options */}
          <div className="pills-group">
            <div className="pills-title">SELECT QUANTITY</div>
            <div className="quantity-pack-options">
              <button
                className={`btn-pack-opt ${selectedPack === 1 ? 'active' : ''}`}
                onClick={() => setSelectedPack(1)}
              >
                1 bottle
              </button>
              <button
                className={`btn-pack-opt ${selectedPack === 2 ? 'active' : ''}`}
                onClick={() => setSelectedPack(2)}
              >
                2 bottles
              </button>
              <button
                className={`btn-pack-opt ${selectedPack === 6 ? 'active' : ''}`}
                onClick={() => setSelectedPack(6)}
              >
                6-bottle case
              </button>
            </div>
          </div>

          {/* Live Calculation Bar */}
          <div className="detail-calc-bar">
            <span className="calc-formula">
              {selectedPack} × {formatVnd(wine.price)}
            </span>
            <span className="calc-total">{formatVnd(totalAmount)}</span>
          </div>

          {/* 2 CTA Buttons */}
          <div className="detail-actions-row">
            <button
              className="btn-detail-add-cart"
              onClick={() => onAddToCart(wine, selectedPack)}
            >
              ADD TO CART
            </button>
            <button
              className="btn-detail-checkout"
              onClick={() => onProceedToCheckout(wine, selectedPack)}
            >
              PROCEED TO CHECKOUT
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="detail-trust-badges">
            <span>🛵 90-min inner Hanoi delivery</span>
            <span>🔒 Secure payment</span>
            <span>❄️ Cold-chain storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
