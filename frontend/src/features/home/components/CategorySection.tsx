import React from 'react';
import { ArrowRight } from 'lucide-react';
import './CategorySection.css';

interface CategoryItem {
  id: string | number;
  name: string;
  count: number;
  image: string;
}

interface CategorySectionProps {
  onViewAll?: () => void;
  onSelectCategory?: (id: string | number) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  onViewAll,
  onSelectCategory,
}) => {
  // Dữ liệu mẫu chuẩn sát theo ảnh chụp thứ 2 của người dùng
  const categories: CategoryItem[] = [
    {
      id: 1,
      name: 'Red Wine',
      count: 48,
      image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 2,
      name: 'White Wine',
      count: 32,
      image: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 3,
      name: 'Sparkling Wine',
      count: 24,
      image: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=800&q=80',
    },
  ];

  return (
    <section className="category-section" id="categories">
      <div className="category-inner">
        {/* Section Header */}
        <div className="category-header">
          <div>
            <span className="category-subtitle">CURATED SELECTION</span>
            <h2 className="category-title">Explore By Category</h2>
          </div>
          <button className="btn-view-all" onClick={onViewAll}>
            <span>View All</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Categories Grid (3 Cards) */}
        <div className="category-grid">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="category-card"
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
            >
              <img src={cat.image} alt={cat.name} className="category-card-img" />
              <div className="category-card-gradient"></div>
              <div className="category-card-content">
                <span className="category-card-count">{cat.count} SELECTIONS</span>
                <h3 className="category-card-name">{cat.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
