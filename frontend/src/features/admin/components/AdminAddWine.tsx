import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Wine as WineIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { adminApi, CategoryItem, WineCreatePayload } from '@/shared/api/adminApi';
import './AdminAddWine.css';

interface AdminAddWineProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const AdminAddWine: React.FC<AdminAddWineProps> = ({ onBack, onSuccess }) => {
  // Categories from Database (Zero hardcoded data)
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);

  // Form Fields
  const [wineName, setWineName] = useState<string>('');
  const [wineryName, setWineryName] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [origin, setOrigin] = useState<string>('');
  const [price, setPrice] = useState<number | ''>(0);
  const [abv, setAbv] = useState<number | ''>(13.5);
  const [vintageYear, setVintageYear] = useState<number | ''>(2020);
  const [stockQuantity, setStockQuantity] = useState<number | ''>(0);
  const [bottleSize, setBottleSize] = useState<string>('750ml');
  const [grapeVariety, setGrapeVariety] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Fetch categories from Database on mount
  useEffect(() => {
    setIsLoadingCategories(true);
    adminApi.getAllCategories()
      .then((data) => {
        setCategories(data);
        if (data.length > 0) {
          setCategoryId(data[0].categoryId);
        }
      })
      .catch((err) => {
        console.warn('Lỗi khi tải danh mục rượu từ DB:', err);
      })
      .finally(() => {
        setIsLoadingCategories(false);
      });
  }, []);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!wineName.trim()) {
      setErrorMsg('Vui lòng nhập tên sản phẩm rượu (Wine Name)');
      return;
    }
    if (!wineryName.trim()) {
      setErrorMsg('Vui lòng nhập tên nhà sản xuất (Winery / Producer)');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Vui lòng chọn danh mục rượu (Category)');
      return;
    }
    if (!origin.trim()) {
      setErrorMsg('Vui lòng nhập quốc gia xuất xứ (Country of Origin)');
      return;
    }
    if (price === '' || Number(price) <= 0) {
      setErrorMsg('Giá bán đơn vị phải lớn hơn 0 VNĐ');
      return;
    }
    if (abv === '' || Number(abv) <= 0 || Number(abv) > 100) {
      setErrorMsg('Nồng độ cồn ABV (%) phải nằm trong khoảng từ 0.1% đến 100%');
      return;
    }
    if (stockQuantity === '' || Number(stockQuantity) < 0) {
      setErrorMsg('Số lượng tồn kho ban đầu không được âm');
      return;
    }
    if (!grapeVariety.trim()) {
      setErrorMsg('Vui lòng nhập giống nho (Grape Variety)');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Vui lòng nhập ghi chú nếm thử (Tasting Notes / Description)');
      return;
    }

    // Default high-quality image if user left image URL empty
    const finalImageUrl = imageUrl.trim() || 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3';

    const payload: WineCreatePayload = {
      wineName: wineName.trim(),
      wineryName: wineryName.trim(),
      categoryId: Number(categoryId),
      origin: origin.trim(),
      grapeVariety: grapeVariety.trim(),
      vintageYear: vintageYear ? Number(vintageYear) : null,
      description: description.trim(),
      price: Number(price),
      abv: Number(abv),
      stockQuantity: Number(stockQuantity),
      imageUrl: finalImageUrl,
    };

    setIsSubmitting(true);
    try {
      const created = await adminApi.createWine(payload);
      setSuccessMsg(`Đã thêm mới chai rượu "${created.wineName}" vào danh mục thành công!`);
      
      // Navigate back to catalog after 1.5s
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Lỗi khi thêm mới sản phẩm rượu:', err);
      const backendMessage = err.response?.data?.message || err.message || 'Không thể tạo mới sản phẩm. Vui lòng kiểm tra lại.';
      setErrorMsg(backendMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-wine-container">
      {/* Top Header Row with Back Button */}
      <div className="add-wine-top-row">
        <button type="button" className="btn-add-wine-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="add-wine-title-block">
          <h1 className="add-wine-heading">Add New Wine</h1>
          <p className="add-wine-subheading">Register a new wine product in the catalog</p>
        </div>
      </div>

      {/* Notification Alerts */}
      {successMsg && (
        <div className="add-wine-alert success">
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="add-wine-alert error">
          <AlertTriangle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="add-wine-form">
        {/* Section 1: CORE INFORMATION */}
        <div className="add-wine-card">
          <h3 className="section-title">CORE INFORMATION</h3>
          <div className="form-fields-grid">
            <div className="form-field-group">
              <label htmlFor="wineName">WINE NAME *</label>
              <input
                id="wineName"
                type="text"
                required
                placeholder="e.g. Château Margaux Grand Cru"
                value={wineName}
                onChange={(e) => setWineName(e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="wineryName">WINERY / PRODUCER *</label>
              <input
                id="wineryName"
                type="text"
                required
                placeholder="e.g. Château Margaux"
                value={wineryName}
                onChange={(e) => setWineryName(e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="categoryId">CATEGORY *</label>
              <select
                id="categoryId"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                disabled={isLoadingCategories}
              >
                {isLoadingCategories ? (
                  <option value="">Đang tải danh mục từ CSDL...</option>
                ) : categories.length === 0 ? (
                  <option value="">Chưa có danh mục nào trong CSDL</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="origin">COUNTRY OF ORIGIN</label>
              <input
                id="origin"
                type="text"
                placeholder="e.g. France"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: SPECIFICATIONS */}
        <div className="add-wine-card">
          <h3 className="section-title">SPECIFICATIONS</h3>
          <div className="form-fields-grid spec-grid">
            <div className="form-field-group">
              <label htmlFor="price">UNIT PRICE (₫) *</label>
              <input
                id="price"
                type="number"
                required
                min={0}
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="abv">ABV (%) *</label>
              <input
                id="abv"
                type="number"
                step="0.1"
                required
                min={0.1}
                max={100}
                placeholder="13.5"
                value={abv}
                onChange={(e) => setAbv(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="vintageYear">VINTAGE YEAR *</label>
              <input
                id="vintageYear"
                type="number"
                min={1000}
                max={2100}
                placeholder="2020"
                value={vintageYear}
                onChange={(e) => setVintageYear(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="stockQuantity">INITIAL STOCK *</label>
              <input
                id="stockQuantity"
                type="number"
                required
                min={0}
                placeholder="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="bottleSize">BOTTLE SIZE</label>
              <select
                id="bottleSize"
                value={bottleSize}
                onChange={(e) => setBottleSize(e.target.value)}
              >
                <option value="750ml">750ml (Standard)</option>
                <option value="375ml">375ml (Half Bottle)</option>
                <option value="1500ml">1500ml (Magnum)</option>
                <option value="3000ml">3000ml (Double Magnum)</option>
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="grapeVariety">GRAPE VARIETY</label>
              <input
                id="grapeVariety"
                type="text"
                placeholder="e.g. Cabernet Sauvignon, Merlot"
                value={grapeVariety}
                onChange={(e) => setGrapeVariety(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: MARKETING & MEDIA */}
        <div className="add-wine-card">
          <h3 className="section-title">MARKETING & MEDIA</h3>
          <div className="form-fields-grid full-col-grid">
            <div className="form-field-group full-width">
              <label htmlFor="imageUrl">PRODUCT IMAGE URL</label>
              <input
                id="imageUrl"
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="form-field-group full-width">
              <label htmlFor="description">TASTING NOTES</label>
              <textarea
                id="description"
                rows={3}
                placeholder="Describe aromas, palate, and finish..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="add-wine-actions">
          <button
            type="submit"
            className="btn-submit-add-catalog"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Đang lưu vào kho...</span>
              </>
            ) : (
              <span>Add to Catalog</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
