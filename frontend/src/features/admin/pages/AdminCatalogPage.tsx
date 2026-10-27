import React, { useState, useEffect, useMemo } from 'react';
import { Wine, Search, ShoppingBag, LogOut, RotateCcw, Loader2 } from 'lucide-react';
import { WineProduct, initialWines } from '@/features/wine/data/winesData';
import { SelectQuantityModal } from '@/features/wine/components/SelectQuantityModal';
import { wineApi, mapBackendWineToProduct } from '@/shared/api/wineApi';
import '@/features/wine/components/WineCellarSection.css';
import './AdminCatalogPage.css';

interface AdminCatalogPageProps {
  currentUser: any;
  cartCount: number;
  onLogout: () => void;
  onWineClick: (wine: WineProduct) => void;
  onAddToCart: (wine: WineProduct, quantity: number) => void;
  onViewCart: () => void;
  onViewOrders?: () => void;
}

export const AdminCatalogPage: React.FC<AdminCatalogPageProps> = ({
  currentUser,
  cartCount,
  onLogout,
  onWineClick,
  onAddToCart,
  onViewCart,
  onViewOrders,
}) => {
  // Real wines loaded from Database
  const [winesList, setWinesList] = useState<WineProduct[]>([]);
  const [isLoadingWines, setIsLoadingWines] = useState<boolean>(true);

  useEffect(() => {
    setIsLoadingWines(true);
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
        setIsLoadingWines(false);
      });
  }, []);

  // Search state
  const [searchKeyword, setSearchKeyword] = useState('');

  // Active top nav tab: 'cellar' | 'cart' | 'orders'
  const [activeTab, setActiveTab] = useState<'cellar' | 'cart' | 'orders'>('cellar');

  // Quick add modal state
  const [quickAddWine, setQuickAddWine] = useState<WineProduct | null>(null);

  // Filters State
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(10000000);
  const [maxAbv, setMaxAbv] = useState<number>(15);
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('Recommended');

  // Format VND
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedStyles([]);
    setMaxPrice(10000000);
    setMaxAbv(15);
    setSelectedCountry('All');
    setSearchKeyword('');
    setSortBy('Recommended');
  };

  // Toggle style checkbox
  const handleToggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  // Dynamic counts for styles calculated from Database
  const styleCounts = useMemo(() => {
    return {
      Red: winesList.filter((w) => w.category === 'RED').length,
      White: winesList.filter((w) => w.category === 'WHITE').length,
      Sparkling: winesList.filter((w) => w.category === 'SPARKLING').length,
      Rosé: winesList.filter((w) => w.category === 'ROSE').length,
      Fortified: winesList.filter((w) => w.category === 'FORTIFIED').length,
    };
  }, [winesList]);

  // Filtered Wines
  const filteredWines = useMemo(() => {
    return winesList.filter((wine) => {
      // 1. Keyword search (name, winery, region, vintage)
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matches =
          wine.name.toLowerCase().includes(query) ||
          wine.winery.toLowerCase().includes(query) ||
          wine.region.toLowerCase().includes(query) ||
          wine.vintage.toString().includes(query);
        if (!matches) return false;
      }

      // 2. Wine Style
      if (selectedStyles.length > 0) {
        const mappedStyle =
          wine.category === 'RED'
            ? 'Red'
            : wine.category === 'WHITE'
            ? 'White'
            : wine.category === 'SPARKLING'
            ? 'Sparkling'
            : wine.category === 'ROSE'
            ? 'Rosé'
            : 'Fortified';
        if (!selectedStyles.includes(mappedStyle)) return false;
      }

      // 3. Price
      if (wine.price > maxPrice) return false;

      // 4. ABV
      if (maxAbv < 15 && wine.abv > maxAbv) return false;

      // 5. Country
      if (selectedCountry !== 'All' && wine.country !== selectedCountry) return false;

      return true;
    });
  }, [winesList, searchKeyword, selectedStyles, maxPrice, maxAbv, selectedCountry]);

  // Sorted Wines
  const sortedWines = useMemo(() => {
    const list = [...filteredWines];
    if (sortBy === 'Price: Low to High') list.sort((a, b) => a.price - b.price);
    if (sortBy === 'Price: High to Low') list.sort((a, b) => b.price - a.price);
    return list;
  }, [filteredWines, sortBy]);

  // Display Name: Default to Thế Vinh or currentUser.fullName
  const displayName = currentUser?.fullName || 'Thế Vinh';
  const displayTag = currentUser?.role === 'ROLE_ADMIN' ? 'TV' : 'TV';

  return (
    <div className="admin-catalog-page">
      {/* 1. Header Bar for Admin */}
      <header className="admin-header">
        <div className="admin-header-left">
          {/* Brand Logo */}
          <div className="admin-brand">
            <Wine size={26} className="admin-brand-icon" />
            <div className="admin-brand-titles">
              <span className="admin-brand-main">Urban Wine</span>
              <span className="admin-brand-sub">EXPRESS</span>
            </div>
          </div>

          {/* Search Bar matching screenshot */}
          <div className="admin-search-wrapper">
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              placeholder="Vintage, region, winery..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="admin-search-input"
            />
          </div>
        </div>

        {/* Right Nav & User Dropdown */}
        <div className="admin-header-right">
          <div className="admin-nav-tabs">
            <button
              className={`admin-nav-pill ${activeTab === 'cellar' ? 'active' : ''}`}
              onClick={() => setActiveTab('cellar')}
            >
              Cellar
            </button>
            <button
              className={`admin-nav-pill ${activeTab === 'cart' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('cart');
                onViewCart();
              }}
            >
              Cart
            </button>
            <button
              className={`admin-nav-pill ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('orders');
                if (onViewOrders) onViewOrders();
                else alert('Đang chuyển tới trang Quản lý đơn hàng (My Orders)');
              }}
            >
              My Orders
            </button>
          </div>

          {/* Cart Icon */}
          <button className="admin-cart-btn" onClick={onViewCart} title="Giỏ hàng">
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="admin-cart-dot">{cartCount}</span>}
          </button>

          {/* Customer Profile Pill (No logout dropdown) */}
          <div className="admin-user-pill static-pill" title="Tài khoản Khách hàng">
            <span className="user-greeting-txt">
              Xin chào, <strong className="user-name-bold">{displayName}</strong>
            </span>
            <span className="user-badge-tag">{displayTag}</span>
          </div>
        </div>
      </header>

      {/* 2. Main Body: Sidebar + Content */}
      <div className="admin-catalog-body">
        {/* Left Sidebar: REFINE SELECTION */}
        <aside className="admin-sidebar">
          <div className="sidebar-header-row">
            <span className="sidebar-title">REFINE SELECTION</span>
            <button className="sidebar-reset-btn" onClick={handleResetFilters}>
              Reset
            </button>
          </div>

          {/* Filter 1: WINE STYLE */}
          <div className="filter-block">
            <span className="filter-block-title">WINE STYLE</span>
            <div className="checkbox-list">
              {(['Red', 'White', 'Sparkling', 'Rosé', 'Fortified'] as const).map((style) => (
                <label key={style} className="checkbox-row">
                  <div className="checkbox-left">
                    <input
                      type="checkbox"
                      checked={selectedStyles.includes(style)}
                      onChange={() => handleToggleStyle(style)}
                      className="filter-checkbox"
                    />
                    <span className="checkbox-label">{style}</span>
                  </div>
                  <span className="checkbox-count">{styleCounts[style]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter 2: PRICE RANGE */}
          <div className="filter-block">
            <span className="filter-block-title">PRICE RANGE</span>
            <div className="range-slider-wrapper">
              <input
                type="range"
                min="0"
                max="10000000"
                step="500000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="filter-range-input"
              />
              <div className="range-values-row">
                <span>0₫</span>
                <span className="range-divider">—</span>
                <span>{formatVnd(maxPrice)}</span>
              </div>
            </div>
          </div>

          {/* Filter 3: ALCOHOL CONTENT */}
          <div className="filter-block">
            <span className="filter-block-title">ALCOHOL CONTENT</span>
            <div className="range-slider-wrapper">
              <input
                type="range"
                min="10"
                max="15"
                step="0.5"
                value={maxAbv}
                onChange={(e) => setMaxAbv(Number(e.target.value))}
                className="filter-range-input"
              />
              <div className="range-values-row">
                <span>10% ABV</span>
                <span className="range-divider">—</span>
                <span>{maxAbv}%+ ABV</span>
              </div>
            </div>
          </div>

          {/* Filter 4: COUNTRY OF ORIGIN */}
          <div className="filter-block">
            <span className="filter-block-title">COUNTRY OF ORIGIN</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="country-select-box"
            >
              <option value="All">All Countries</option>
              <option value="France">France</option>
              <option value="Italy">Italy</option>
              <option value="Australia">Australia</option>
            </select>
          </div>

          {/* Logout in Sidebar (placed above Showing count) */}
          <div className="admin-sidebar-footer">
            <button
              type="button"
              className="admin-footer-btn btn-logout"
              onClick={onLogout}
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Footer count indicator */}
          <div className="sidebar-count-footer">
            Showing <strong>{sortedWines.length}</strong> of {winesList.length} wines
          </div>
        </aside>

        {/* Right Area: Wine Cellar Grid */}
        <main className="admin-content-area">
          <div className="content-top-header">
            <div>
              <h1 className="content-page-title">Wine Cellar</h1>
              <p className="content-page-desc">
                Curated fine wines for the discerning palate — inner Hanoi delivery in 90 minutes
              </p>
            </div>

            {/* Sort by dropdown */}
            <div className="content-sort-box">
              <span className="content-sort-label">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="content-sort-select"
              >
                <option value="Recommended">Recommended</option>
                <option value="Price: Low to High">Price: Low to High</option>
                <option value="Price: High to Low">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Grid of Wine Cards */}
          <div className="wines-grid">
            {isLoadingWines ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#d4af37' }}>
                <Loader2 size={36} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '12px', color: '#bfb7ad', fontSize: '0.95rem' }}>Đang nạp danh sách vang hảo hạng từ hầm rượu...</p>
              </div>
            ) : sortedWines.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#8a8279' }}>
                <p style={{ fontSize: '1.05rem', color: '#f7f3ed', marginBottom: '10px' }}>Không có chai rượu nào phù hợp với bộ lọc hiện tại.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    backgroundColor: '#d4af37',
                    color: '#120e0b',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Đặt lại bộ lọc (Reset)
                </button>
              </div>
            ) : (
              sortedWines.map((wine) => (
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
                          e.stopPropagation();
                          setQuickAddWine(wine);
                        }}
                      >
                        QUICK ADD
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Quick Add Modal */}
      <SelectQuantityModal
        wine={quickAddWine}
        isOpen={Boolean(quickAddWine)}
        onClose={() => setQuickAddWine(null)}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};
