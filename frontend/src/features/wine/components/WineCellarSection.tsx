import React, { useState, useEffect } from 'react';
import { WineProduct, initialWines } from '../data/winesData';
import { SelectQuantityModal } from './SelectQuantityModal';
import { wineApi, mapBackendWineToProduct } from '@/shared/api/wineApi';
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
  const [quickAddWine, setQuickAddWine] = useState<WineProduct | null>(null);
  const [winesList, setWinesList] = useState<WineProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 9; // 3 dòng x 3 cột = 9 sản phẩm mỗi trang

  useEffect(() => {
    setIsLoading(true);
    wineApi.getCatalog({ size: 100 })
      .then((res) => {
        if (res && res.content && res.content.length > 0) {
          setWinesList(res.content.map(mapBackendWineToProduct));
        } else {
          setWinesList(initialWines);
        }
      })
      .catch((err) => {
        console.warn('Error fetching database wine catalog:', err);
        setWinesList(initialWines);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Khi đổi danh mục, tự động quay về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  // Filter wines from real database
  const filteredWines = winesList.filter((wine) => {
    if (selectedCategory === 'ALL') return true;
    return wine.category === selectedCategory;
  });

  const totalPages = Math.ceil(filteredWines.length / itemsPerPage) || 1;
  const paginatedWines = filteredWines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const element = document.getElementById('wine-cellar');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
        </div>


        {/* Filter Chips Bar */}
        <div className="category-filter-chips">
          <button
            className={`filter-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => onSelectCategory('ALL')}
          >
            All Wines ({winesList.length})
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
          {paginatedWines.map((wine) => (
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

        {/* Luxury Pagination Controls (Chuyển trang khi quá 3 dòng) */}
        {totalPages > 1 && (
          <div className="wine-pagination-wrap">
            <button
              type="button"
              className="wine-page-btn nav-btn"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              ‹ Trước
            </button>

            <div className="wine-page-numbers">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  type="button"
                  key={pageNum}
                  className={`wine-page-num ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="wine-page-btn nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Sau ›
            </button>
          </div>
        )}

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
