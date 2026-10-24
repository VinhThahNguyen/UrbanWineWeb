import React, { useState } from 'react';
import { Header } from '@/shared/components/Header';
import { HeroSection } from '@/features/home/components/HeroSection';
import { CategorySection } from '@/features/home/components/CategorySection';
import { AuthModal } from '@/features/auth/components/AuthModal';

interface HomePageProps {
  onSignInClick?: () => void;
}

export const HomePage: React.FC<HomePageProps> = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('urbanwine_user');
    return saved ? JSON.parse(saved) : null;
  });

  return (
    <div className="home-page-container">
      {/* 1. Header with logo, nav, search, cart, and sign in */}
      <Header
        cartCount={2}
        onSignInClick={() => setIsAuthOpen(true)}
      />

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

      {/* Luxury Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
};

