import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { wineApi, BackendCategory } from '@/shared/api/wineApi';
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
  // Real categories from Database
  const [categories, setCategories] = useState<CategoryItem[]>([
    {
      id: 1,
      name: 'Red Wine',
      count: 10,
      image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 2,
      name: 'White Wine',
      count: 5,
      image: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 3,
      name: 'Sparkling Wine',
      count: 2,
      image: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=800&q=80',
    },
  ]);

  useEffect(() => {
    wineApi.getCategories()
      .then((res: BackendCategory[]) => {
        if (res && res.length > 0) {
          const categoryImages = [
            'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=800&q=80',
          ];
          setCategories(
            res.slice(0, 3).map((c, idx) => ({
              id: c.categoryId,
              name: c.categoryName,
              count: c.count || (idx === 0 ? 10 : idx === 1 ? 5 : 2),
              image: c.imageUrl || categoryImages[idx % categoryImages.length],
            }))
          );
        }
      })
      .catch((err) => {
        console.warn('Error fetching categories from database:', err);
      });
  }, []);

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
