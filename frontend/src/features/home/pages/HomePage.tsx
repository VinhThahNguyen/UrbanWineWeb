import React from 'react';
import { Header } from '@/shared/components/Header';
import { HeroSection } from '@/features/home/components/HeroSection';
import { CategorySection } from '@/features/home/components/CategorySection';

interface HomePageProps {
  onSignInClick?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSignInClick }) => {
  return (
    <div className="home-page-container">
      {/* 1. Header with logo, nav, search, cart, and sign in */}
      <Header cartCount={2} onSignInClick={onSignInClick} />

      <main>
        {/* 2. Hero Section: Discover Exceptional Wines */}
        <HeroSection
          onExploreCatalog={() => console.log('Explore Catalog Clicked')}
          onOurStory={() => console.log('Our Story Clicked')}
        />

        {/* 3. Explore By Category: Red, White, Sparkling */}
        <CategorySection
          onViewAll={() => console.log('View All Categories Clicked')}
          onSelectCategory={(id) => console.log('Selected Category:', id)}
        />
      </main>
    </div>
  );
};
