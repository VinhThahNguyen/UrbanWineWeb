import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Bell,
  Plus,
  RefreshCw,
  Loader2,
  AlertTriangle,
  X,
  CheckCircle2,
  Wine as WineIcon,
  ChevronLeft,
  ChevronRight,
  Edit2,
} from 'lucide-react';
import {
  adminApi,
  WineAdminResponse,
  CategoryItem,
  WineUpdatePayload,
} from '@/shared/api/adminApi';
import './AdminWineCatalog.css';

interface AdminWineCatalogProps {
  onOpenAddWine: () => void;
  externalSearchQuery?: string;
}

// Fixed 9 bottles per page according to requirement
const PAGE_SIZE = 9;

export const AdminWineCatalog: React.FC<AdminWineCatalogProps> = ({
  onOpenAddWine,
  externalSearchQuery = '',
}) => {
  // 100% Real Database States (Zero hardcoded data)
  const [wines, setWines] = useState<WineAdminResponse[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pagination States (9 items per page)
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Dynamic Category Stats across entire database
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalAllWines, setTotalAllWines] = useState<number>(0);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');
  const [isStockAlertFilter, setIsStockAlertFilter] = useState<boolean>(false);
  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');

  // Modals
  const [selectedDetailWine, setSelectedDetailWine] = useState<WineAdminResponse | null>(null);
  const [editingWine, setEditingWine] = useState<WineAdminResponse | null>(null);
  const [editFormData, setEditFormData] = useState<WineUpdatePayload>({
    wineName: '',
    wineryName: '',
    categoryId: 1,
    origin: '',
    grapeVariety: '',
    vintageYear: 2020,
    description: '',
    price: 0,
    abv: 13.5,
    addedStockQuantity: 0,
    imageUrl: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  // Sync external search query
  useEffect(() => {
    if (externalSearchQuery) {
      setLocalSearchQuery(externalSearchQuery);
      setCurrentPage(0);
    }
  }, [externalSearchQuery]);

  // 1. Fetch Categories from Database
  const fetchCategories = useCallback(async () => {
    try {
      const data = await adminApi.getAllCategories();
      setCategories(data);
    } catch (err) {
      console.warn('Lỗi khi tải danh mục từ database:', err);
    }
  }, []);

  // 2. Fetch Category Counts across entire Database
  const fetchCategoryCounts = useCallback(async () => {
    try {
      const res = await adminApi.getAdminWines({ page: 0, size: 500 });
      if (res && Array.isArray(res.content)) {
        setTotalAllWines(res.totalElements || res.content.length);
        const counts: Record<string, number> = {};
        res.content.forEach((w: WineAdminResponse) => {
          const cat = w.categoryName || 'Other';
          counts[cat] = (counts[cat] || 0) + 1;
        });
        setCategoryCounts(counts);
      }
    } catch (err) {
      console.warn('Lỗi khi tải số lượng danh mục:', err);
    }
  }, []);

  // 3. Fetch Paginated Wine Catalog from Database (9 bottles per page)
  const fetchWines = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      if (isStockAlertFilter) {
        // Fetch low stock items only (threshold <= 5 bottles), paginated by 9
        const alertRes = await adminApi.getStockAlerts(
          currentPage,
          PAGE_SIZE,
          localSearchQuery.trim() || undefined
        );
        if (alertRes && alertRes.wines && Array.isArray(alertRes.wines.content)) {
          setWines(alertRes.wines.content);
          setTotalPages(alertRes.wines.totalPages || 0);
          setTotalElements(alertRes.wines.totalElements || 0);
        } else {
          setWines([]);
          setTotalPages(0);
          setTotalElements(0);
        }
      } else {
        // Fetch wines for admin with 9 items per page
        const categoryParam = selectedCategoryId === 'ALL' ? undefined : selectedCategoryId;
        const res = await adminApi.getAdminWines({
          keyword: localSearchQuery.trim() || undefined,
          categoryId: categoryParam,
          page: currentPage,
          size: PAGE_SIZE,
        });
        if (res && Array.isArray(res.content)) {
          setWines(res.content);
          setTotalPages(res.totalPages || 0);
          setTotalElements(res.totalElements || 0);
        } else {
          setWines([]);
          setTotalPages(0);
          setTotalElements(0);
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh mục rượu từ cơ sở dữ liệu:', err);
      setFetchError('Không thể kết nối đến máy chủ cơ sở dữ liệu để tải danh mục rượu. Vui lòng kiểm tra lại backend.');
      setWines([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setIsLoading(false);
    }
  }, [isStockAlertFilter, selectedCategoryId, currentPage, localSearchQuery]);

  useEffect(() => {
    fetchCategories();
    fetchCategoryCounts();
  }, [fetchCategories, fetchCategoryCounts]);

  useEffect(() => {
    fetchWines();
  }, [fetchWines]);

  // Format VND
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  // Category Pill Badge Class Helper
  const getCategoryBadgeClass = (categoryName?: string) => {
    if (!categoryName) return 'category-badge default';
    const lower = categoryName.toLowerCase();
    if (lower.includes('đỏ') || lower.includes('red')) return 'category-badge red';
    if (lower.includes('trắng') || lower.includes('white')) return 'category-badge white';
    if (lower.includes('sủi') || lower.includes('sparkling') || lower.includes('champagne')) return 'category-badge sparkling';
    if (lower.includes('hồng') || lower.includes('rosé') || lower.includes('rose')) return 'category-badge rose';
    return 'category-badge default';
  };

  // Open Edit Modal
  const handleOpenEdit = (wine: WineAdminResponse) => {
    setEditingWine(wine);
    setEditFormData({
      wineName: wine.wineName,
      wineryName: wine.wineryName,
      categoryId: wine.categoryId,
      origin: wine.origin,
      grapeVariety: wine.grapeVariety,
      vintageYear: wine.vintageYear || new Date().getFullYear(),
      description: wine.description,
      price: wine.price,
      abv: wine.abv,
      addedStockQuantity: 0,
      imageUrl: wine.imageUrl,
    });
    setEditSuccessMsg(null);
    setEditErrorMsg(null);
  };

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWine) return;

    setIsSavingEdit(true);
    setEditErrorMsg(null);
    setEditSuccessMsg(null);

    try {
      const updated = await adminApi.updateWine(editingWine.wineId, editFormData);
      setEditSuccessMsg(`Đã cập nhật thông tin rượu "${updated.wineName}" thành công!`);
      
      // Update local state
      setWines((prev) =>
        prev.map((w) => (w.wineId === updated.wineId ? updated : w))
      );
      fetchCategoryCounts();

      setTimeout(() => {
        setEditingWine(null);
        setEditSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error('Lỗi khi cập nhật rượu:', err);
      const msg = err.response?.data?.message || 'Không thể lưu thay đổi. Vui lòng kiểm tra lại thông tin.';
      setEditErrorMsg(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Toggle Wine Active / Inactive Status
  const handleToggleStatus = async (wineId: number) => {
    try {
      const updated = await adminApi.toggleWineStatus(wineId);
      setWines((prev) =>
        prev.map((w) => (w.wineId === updated.wineId ? updated : w))
      );
      if (selectedDetailWine && selectedDetailWine.wineId === wineId) {
        setSelectedDetailWine(updated);
      }
      fetchCategoryCounts();
    } catch (err: any) {
      alert('Không thể đổi trạng thái sản phẩm: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="admin-catalog-container">
      {/* 1. Header Row */}
      <div className="catalog-header-row">
        <div>
          <h1 className="catalog-title">Wine Catalog</h1>
          <p className="catalog-subtitle">All products · Low stock · Manage</p>
        </div>

        <div className="catalog-actions-right">
          {/* Search Input */}
          <div className="catalog-search-box">
            <Search size={16} className="catalog-search-icon" />
            <input
              type="text"
              placeholder="Search & Filter"
              value={localSearchQuery}
              onChange={(e) => {
                setLocalSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="catalog-search-input"
            />
            {localSearchQuery && (
              <button
                type="button"
                className="catalog-search-clear"
                onClick={() => {
                  setLocalSearchQuery('');
                  setCurrentPage(0);
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn-catalog-icon"
            onClick={() => {
              fetchWines();
              fetchCategoryCounts();
            }}
            title="Làm mới danh sách từ Database"
          >
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
          </button>

          {/* Stock Alerts Button */}
          <button
            type="button"
            className={`btn-catalog-stock-alerts ${isStockAlertFilter ? 'active' : ''}`}
            onClick={() => {
              setIsStockAlertFilter((prev) => !prev);
              setCurrentPage(0);
            }}
          >
            <Bell size={16} />
            <span>Stock Alerts</span>
          </button>

          {/* + Add New Wine Button */}
          <button
            type="button"
            className="btn-catalog-add-wine"
            onClick={onOpenAddWine}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>+ Add New Wine</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      {!isStockAlertFilter && (
        <div className="catalog-category-pills">
          <button
            type="button"
            className={`category-pill-btn ${selectedCategoryId === 'ALL' ? 'active-all' : ''}`}
            onClick={() => {
              setSelectedCategoryId('ALL');
              setCurrentPage(0);
            }}
          >
            <span>All</span>
            <span className="pill-count">{totalAllWines}</span>
          </button>

          {categories.map((cat) => {
            const count = categoryCounts[cat.categoryName] || 0;
            const isSelected = selectedCategoryId === cat.categoryId;
            return (
              <button
                key={cat.categoryId}
                type="button"
                className={`category-pill-btn ${isSelected ? 'active-cat' : ''}`}
                onClick={() => {
                  setSelectedCategoryId(cat.categoryId);
                  setCurrentPage(0);
                }}
              >
                <span>{cat.categoryName}</span>
                <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {isStockAlertFilter && (
        <div className="catalog-stock-alert-notice">
          <AlertTriangle size={18} className="alert-icon" />
          <span>
            Đang hiển thị danh sách các sản phẩm rượu có lượng tồn kho <strong>chạm hoặc dưới ngưỡng cảnh báo (≤ 5 chai)</strong>.
          </span>
          <button
            type="button"
            className="btn-exit-alert-filter"
            onClick={() => {
              setIsStockAlertFilter(false);
              setCurrentPage(0);
            }}
          >
            Xem toàn bộ sản phẩm
          </button>
        </div>
      )}

      {/* 3. Table or Status Messages */}
      <div className="catalog-table-wrapper">
        {isLoading ? (
          <div className="catalog-loading-state">
            <Loader2 size={32} className="spin-icon text-gold" />
            <p>Đang tải danh sách rượu từ cơ sở dữ liệu...</p>
          </div>
        ) : fetchError ? (
          <div className="catalog-empty-notice error">
            <AlertTriangle size={32} />
            <h4>Lỗi kết nối cơ sở dữ liệu</h4>
            <p>{fetchError}</p>
            <button type="button" className="catalog-retry-btn" onClick={fetchWines}>
              <RefreshCw size={14} />
              <span>Thử lại</span>
            </button>
          </div>
        ) : wines.length === 0 ? (
          <div className="catalog-empty-notice">
            <WineIcon size={40} className="empty-icon" />
            <h4>Chưa có dữ liệu sản phẩm rượu nào</h4>
            <p>
              {localSearchQuery
                ? `Không tìm thấy chai rượu nào khớp với từ khóa "${localSearchQuery}".`
                : isStockAlertFilter
                ? 'Tuyệt vời! Hiện tại không có sản phẩm nào chạm ngưỡng tồn kho thấp (≤ 5 chai).'
                : 'Cơ sở dữ liệu danh mục rượu hiện đang trống. Hãy thêm sản phẩm mới để bắt đầu kinh doanh.'}
            </p>
            {!isStockAlertFilter && (
              <button
                type="button"
                className="btn-catalog-add-wine"
                style={{ marginTop: '14px' }}
                onClick={onOpenAddWine}
              >
                <Plus size={16} />
                <span>+ Thêm chai rượu đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="catalog-data-table">
              <thead>
                <tr>
                  <th>WINE / WINERY</th>
                  <th>CATEGORY</th>
                  <th style={{ textAlign: 'right' }}>UNIT PRICE</th>
                  <th style={{ textAlign: 'center' }}>ABV</th>
                  <th style={{ textAlign: 'center' }}>VINTAGE</th>
                  <th style={{ textAlign: 'center' }}>STOCK</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {wines.map((wine) => {
                  const isLowStock = wine.stockQuantity <= 5;
                  return (
                    <tr key={wine.wineId} className={!wine.isActive ? 'tr-inactive' : ''}>
                      {/* WINE / WINERY */}
                      <td>
                        <div className="wine-winery-cell">
                          <div className="wine-thumbnail">
                            {wine.imageUrl ? (
                              <img
                                src={wine.imageUrl}
                                alt={wine.wineName}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <WineIcon size={20} className="wine-thumb-placeholder" />
                            )}
                          </div>
                          <div className="wine-name-block">
                            <span className="wine-name" title={wine.wineName}>
                              {wine.wineName}
                            </span>
                            <span className="wine-winery">{wine.wineryName}</span>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td>
                        <span className={getCategoryBadgeClass(wine.categoryName)}>
                          {wine.categoryName || 'Wine'}
                        </span>
                      </td>

                      {/* UNIT PRICE */}
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#f7f3ed' }}>
                        {formatVnd(wine.price)}
                      </td>

                      {/* ABV */}
                      <td style={{ textAlign: 'center', color: '#c4bbb0' }}>
                        {wine.abv ? `${wine.abv}%` : 'N/A'}
                      </td>

                      {/* VINTAGE */}
                      <td style={{ textAlign: 'center', color: '#c4bbb0' }}>
                        {wine.vintageYear || 'NV'}
                      </td>

                      {/* STOCK */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`stock-pill ${isLowStock ? 'stock-low' : 'stock-ok'}`}>
                          {wine.stockQuantity} bottles
                        </span>
                      </td>

                      {/* STATUS */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-pill ${wine.isActive ? 'status-active' : 'status-inactive'}`}>
                          {wine.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn-action-view"
                            onClick={() => setSelectedDetailWine(wine)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={() => handleOpenEdit(wine)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 4. Pagination Bar (Exact 9 bottles per page) */}
            {totalPages > 0 && (
              <div className="catalog-pagination-bar">
                <div className="pagination-info">
                  Hiển thị <strong>{currentPage * PAGE_SIZE + 1}</strong> –{' '}
                  <strong>{Math.min((currentPage + 1) * PAGE_SIZE, totalElements)}</strong> trên tổng số{' '}
                  <strong>{totalElements}</strong> chai rượu
                </div>

                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={currentPage === 0 || isLoading}
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                    <span>Trước</span>
                  </button>

                  <div className="pagination-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i).map((pageNum) => {
                      if (
                        totalPages <= 7 ||
                        pageNum === 0 ||
                        pageNum === totalPages - 1 ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            className={`btn-page-number ${currentPage === pageNum ? 'active' : ''}`}
                            disabled={isLoading}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return (
                          <span key={pageNum} className="pagination-ellipsis">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    className="btn-page-nav"
                    disabled={currentPage >= totalPages - 1 || isLoading}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    title="Trang sau"
                  >
                    <span>Sau</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. Detail View Modal */}
      {selectedDetailWine && (
        <div className="catalog-modal-backdrop" onClick={() => setSelectedDetailWine(null)}>
          <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <div className="modal-header-left">
                <WineIcon size={20} className="text-gold" />
                <h3 className="modal-title">{selectedDetailWine.wineName}</h3>
                <span className={`status-pill ${selectedDetailWine.isActive ? 'status-active' : 'status-inactive'}`}>
                  {selectedDetailWine.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button
                type="button"
                className="catalog-modal-close"
                onClick={() => setSelectedDetailWine(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="catalog-modal-body">
              <div className="detail-media-row">
                <div className="detail-img-box">
                  {selectedDetailWine.imageUrl ? (
                    <img src={selectedDetailWine.imageUrl} alt={selectedDetailWine.wineName} />
                  ) : (
                    <WineIcon size={48} className="text-gold" />
                  )}
                </div>
                <div className="detail-meta-specs">
                  <div className="detail-spec-item">
                    <span className="spec-label">Nhà sản xuất (Winery):</span>
                    <strong className="spec-val">{selectedDetailWine.wineryName}</strong>
                  </div>
                  <div className="detail-spec-item">
                    <span className="spec-label">Phân loại rượu:</span>
                    <span className={getCategoryBadgeClass(selectedDetailWine.categoryName)}>
                      {selectedDetailWine.categoryName}
                    </span>
                  </div>
                  <div className="detail-spec-item">
                    <span className="spec-label">Giá niêm yết:</span>
                    <strong className="spec-val gold-text" style={{ fontSize: '1.1rem' }}>
                      {formatVnd(selectedDetailWine.price)}
                    </strong>
                  </div>
                  <div className="detail-spec-item">
                    <span className="spec-label">Tồn kho hiện tại:</span>
                    <span className={`stock-pill ${selectedDetailWine.stockQuantity <= 5 ? 'stock-low' : 'stock-ok'}`}>
                      {selectedDetailWine.stockQuantity} chai
                    </span>
                  </div>
                  <div className="detail-spec-item">
                    <span className="spec-label">Xuất xứ:</span>
                    <span className="spec-val">{selectedDetailWine.origin || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="detail-spec-item">
                    <span className="spec-label">Giống nho:</span>
                    <span className="spec-val">{selectedDetailWine.grapeVariety || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="detail-spec-item">
                    <span className="spec-label">Nồng độ cồn (ABV):</span>
                    <span className="spec-val">{selectedDetailWine.abv}%</span>
                  </div>
                  <div className="detail-spec-item">
                    <span className="spec-label">Niên vụ (Vintage):</span>
                    <span className="spec-val">{selectedDetailWine.vintageYear || 'NV (Không niên vụ)'}</span>
                  </div>
                </div>
              </div>

              {/* Tasting Notes / Description */}
              <div className="detail-desc-box">
                <h4 className="detail-desc-title">Ghi chú nếm thử (Tasting Notes)</h4>
                <p className="detail-desc-content">
                  {selectedDetailWine.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                </p>
              </div>
            </div>

            <div className="catalog-modal-footer">
              <button
                type="button"
                className="btn-modal-toggle-status"
                onClick={() => handleToggleStatus(selectedDetailWine.wineId)}
              >
                {selectedDetailWine.isActive ? 'Ẩn sản phẩm khỏi khách hàng' : 'Kích hoạt kinh doanh lại'}
              </button>
              <button
                type="button"
                className="btn-modal-edit"
                onClick={() => {
                  const w = selectedDetailWine;
                  setSelectedDetailWine(null);
                  handleOpenEdit(w);
                }}
              >
                Chỉnh sửa
              </button>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setSelectedDetailWine(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Edit Wine Modal */}
      {editingWine && (
        <div className="catalog-modal-backdrop" onClick={() => setEditingWine(null)}>
          <div className="catalog-modal-card edit-card" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <div className="modal-header-left">
                <Edit2 size={18} className="text-gold" />
                <h3 className="modal-title">Cập nhật rượu: {editingWine.wineName}</h3>
              </div>
              <button
                type="button"
                className="catalog-modal-close"
                onClick={() => setEditingWine(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="catalog-modal-body">
                {editSuccessMsg && (
                  <div className="edit-alert success">
                    <CheckCircle2 size={18} />
                    <span>{editSuccessMsg}</span>
                  </div>
                )}
                {editErrorMsg && (
                  <div className="edit-alert error">
                    <AlertTriangle size={18} />
                    <span>{editErrorMsg}</span>
                  </div>
                )}

                <div className="edit-grid">
                  <div className="form-group">
                    <label>Tên sản phẩm *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.wineName}
                      onChange={(e) => setEditFormData({ ...editFormData, wineName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Nhà sản xuất (Winery) *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.wineryName}
                      onChange={(e) => setEditFormData({ ...editFormData, wineryName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Danh mục rượu *</label>
                    <select
                      value={editFormData.categoryId}
                      onChange={(e) => setEditFormData({ ...editFormData, categoryId: Number(e.target.value) })}
                    >
                      {categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryId}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Xuất xứ *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.origin}
                      onChange={(e) => setEditFormData({ ...editFormData, origin: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Giá bán (VNĐ) *</label>
                    <input
                      type="number"
                      required
                      min={1000}
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Nồng độ cồn ABV (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min={0.1}
                      max={100}
                      value={editFormData.abv}
                      onChange={(e) => setEditFormData({ ...editFormData, abv: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Niên vụ (Vintage Year)</label>
                    <input
                      type="number"
                      min={1000}
                      max={2100}
                      value={editFormData.vintageYear || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, vintageYear: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Nhập thêm vào kho (Chai)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={editFormData.addedStockQuantity || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, addedStockQuantity: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>URL Hình ảnh chai rượu</label>
                    <input
                      type="url"
                      value={editFormData.imageUrl || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Ghi chú nếm thử (Tasting Notes) *</label>
                    <textarea
                      rows={3}
                      required
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="catalog-modal-footer">
                <button
                  type="button"
                  className="btn-modal-close"
                  disabled={isSavingEdit}
                  onClick={() => setEditingWine(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-catalog-add-wine"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Đang lưu thay đổi...' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
