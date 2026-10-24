import React, { useState } from 'react';
import { WineProduct, initialWines } from '../data/winesData';
import { SelectQuantityModal } from './SelectQuantityModal';
import './WineCellarSection.css';

interface WineCellarSectionProps {
  selectedCategory: string; // 'ALL' | 'RED' | 'WHITE' | 'SPARKLING'
  onSelectCategory: (cat: string) => void;
  onWineClick: (wine: WineProduct) => void;
  onAddToCart: (wine: WineProduct, quantity: number) => void;
}

export const WineCellarSection: React.FC<WineCellarSectionProps> = ({
  selectedCategory,
  onSelectCategory,
  onWineClick,
  onAddToCart,
}) => {
  const [sortBy, setSortBy] = useState('recommended');
  const [quickAddWine, setQuickAddWine] = useState<WineProduct | null>(null);

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  // Filter wines
  const filteredWines = initialWines.filter((wine) => {
    if (selectedCategory === 'ALL') return true;
    return wine.category === selectedCategory;
  });

  // Sort wines
  const sortedWines = [...filteredWines].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // recommended
  });

  return (
    <section className="wine-cellar-section" id="wine-cellar">
      <div className="wine-cellar-inner">
        {/* Section Header */}
        <div className="wine-cellar-header">
          <div>
            <h2 className="wine-cellar-title">Wine Cellar</h2>
            <p className="wine-cellar-subtitle">
              Curated fine wines for the discerning palate — inner Hanoi delivery in 90 minutes
            </p>
          </div>

          <div className="wine-filter-toolbar">
            <span className="sort-label">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="category-filter-chips">
          <button
            className={`filter-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => onSelectCategory('ALL')}
          >
            All Wines ({initialWines.length})
          </button>
          <button
            className={`filter-chip ${selectedCategory === 'RED' ? 'active' : ''}`}
            onClick={() => onSelectCategory('RED')}
          >
            Red Wine
          </button>
          <button
            className={`filter-chip ${selectedCategory === 'WHITE' ? 'active' : ''}`}
            onClick={() => onSelectCategory('WHITE')}
          >
            White Wine
          </button>
          <button
            className={`filter-chip ${selectedCategory === 'SPARKLING' ? 'active' : ''}`}
            onClick={() => onSelectCategory('SPARKLING')}
          >
            Sparkling Wine
          </button>
        </div>

        {/* Wines Cards Grid */}
        <div className="wines-grid">
          {sortedWines.map((wine) => (
            <div
              key={wine.id}
              className="wine-card"
              onClick={() => onWineClick(wine)}
            >
              <div className="wine-card-media">
                <img src={wine.imageUrl} alt={wine.name} className="wine-card-img" />
                <span className="card-badge-abv">{wine.abv}% ABV</span>
                <span className={`card-badge-stock ${wine.stock <= 0 ? 'out-of-stock' : ''}`}>
                  {wine.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <div className="wine-card-body">
                <span className="wine-type-tag">{wine.category}</span>
                <div className="wine-vintage-producer">
                  {wine.vintage} · {wine.winery}
                </div>
                <h3 className="wine-card-name">{wine.name}</h3>
                <div className="wine-origin-region">{wine.region}</div>

                <div className="wine-rating-row">
                  <span className="star-icons">★★★★★</span>
                  <span className="rating-score">{wine.rating}</span>
                </div>

                <div className="wine-card-footer">
                  <div className="wine-card-price">{formatVnd(wine.price)}</div>
                  <button
                    className="btn-quick-add"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent opening detail page
                      setQuickAddWine(wine);
                    }}
                  >
                    QUICK ADD
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Add Modal */}
      <SelectQuantityModal
        wine={quickAddWine}
        isOpen={Boolean(quickAddWine)}
        onClose={() => setQuickAddWine(null)}
        onAddToCart={onAddToCart}
      />
    </section>
  );
};
