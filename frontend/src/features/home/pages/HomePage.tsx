import React, { useState } from 'react';
import { Header } from '@/shared/components/Header';
import { HeroSection } from '@/features/home/components/HeroSection';
import { CategorySection } from '@/features/home/components/CategorySection';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { WineCellarSection } from '@/features/wine/components/WineCellarSection';
import { WineDetailPage } from '@/features/wine/pages/WineDetailPage';
import { CartPage, CartItem } from '@/features/cart/pages/CartPage';
import { WineProduct, initialWines } from '@/features/wine/data/winesData';
import { AdminCatalogPage } from '@/features/admin/pages/AdminCatalogPage';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage';
import { MyOrdersPage } from '@/features/order/pages/MyOrdersPage';
import { CheckoutPage } from '@/features/checkout/pages/CheckoutPage';
import { OrderPlacedPage } from '@/features/checkout/pages/OrderPlacedPage';

type CurrentView = 'HOME' | 'DETAIL' | 'CART' | 'CHECKOUT' | 'ORDER_PLACED' | 'ORDERS';

export const HomePage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('urbanwine_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<CurrentView>('HOME');

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedWine, setSelectedWine] = useState<WineProduct | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Cart state initialized with 3 sample items matching Screenshot 4
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { wine: initialWines[0], quantity: 8 }, // Château Margaux: 8
    { wine: initialWines[1], quantity: 1 }, // Sassicaia: 1
    { wine: initialWines[2], quantity: 1 }, // Dom Pérignon: 1
  ]);

  const [activeNav, setActiveNav] = useState<string>('home');

  // Smooth scroll to Wine Cellar
  const scrollToWineCellar = (category?: string) => {
    if (category) setSelectedCategory(category);
    setActiveNav('catalog');
    setView('HOME');
    setTimeout(() => {
      const el = document.getElementById('wine-cellar');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Smooth scroll to Categories
  const scrollToCategories = () => {
    setActiveNav('categories');
    setView('HOME');
    setTimeout(() => {
      const el = document.getElementById('categories');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };


  // Add to cart handler
  const handleAddToCart = (wine: WineProduct, quantity: number) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.wine.id === wine.id);
      if (existing) {
        return prev.map((item) =>
          item.wine.id === wine.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { wine, quantity }];
    });
  };

  // Update quantity in cart
  const handleUpdateQuantity = (wineId: string | number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(wineId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.wine.id === wineId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item from cart
  const handleRemoveFromCart = (wineId: string | number) => {
    setCartItems((prev) => prev.filter((item) => item.wine.id !== wineId));
  };

  // Placed Order Code for confirmation screen
  const [placedOrderCode, setPlacedOrderCode] = useState<string>('#UWE-8911');

  // Proceed to checkout: Open Checkout page
  const handleProceedToCheckout = () => {
    setView('CHECKOUT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // =========================================================================
  // 1. NẾU LÀ TÀI KHOẢN ADMIN: CHỈ HIỂN THỊ DUY NHẤT MÀN HÌNH ADMIN DASHBOARD
  // =========================================================================
  if (currentUser?.role === 'ROLE_ADMIN') {
    return (
      <AdminDashboardPage
        currentUser={currentUser}
        onLogout={() => {
          localStorage.removeItem('urbanwine_token');
          localStorage.removeItem('urbanwine_user');
          setCurrentUser(null);
          setView('HOME');
        }}
      />
    );
  }

  // =========================================================================
  // 2. DÀNH CHO CUSTOMER HOẶC KHÁCH VÃNG LAI (KHÔNG CÓ QUYỀN ADMIN)
  // =========================================================================
  return (
    <div className="home-page-container">
      {/* 1. Header công khai chỉ hiển thị khi chưa đăng nhập (hoặc đang xem Cart/Detail của guest) */}
      {!currentUser && view !== 'ORDERS' && view !== 'CHECKOUT' && view !== 'ORDER_PLACED' && (
        <Header
          cartCount={totalCartCount}
          activeNav={activeNav}
          currentUser={currentUser}
          onLogout={() => {
            localStorage.removeItem('urbanwine_token');
            localStorage.removeItem('urbanwine_user');
            setCurrentUser(null);
          }}
          onSignInClick={() => setIsAuthOpen(true)}
          onCartClick={() => {
            setActiveNav('');
            setView('CART');
          }}
          onNavClick={(target) => {
            setActiveNav(target);
            if (target === 'home') {
              setView('HOME');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (target === 'catalog') scrollToWineCellar('ALL');
            if (target === 'categories') scrollToCategories();
            if (target === 'about') {
              setView('HOME');
              window.scrollTo({ top: 500, behavior: 'smooth' });
            }
          }}
        />
      )}

      <main>
        {/* VIEW 1: HOME PAGE */}
        {view === 'HOME' && (
          currentUser ? (
            /* Khi Customer đăng nhập: Trang danh mục rượu hầm của Customer (Không có nút Dashboard) */
            <AdminCatalogPage
              currentUser={currentUser}
              cartCount={totalCartCount}
              onLogout={() => {
                localStorage.removeItem('urbanwine_token');
                localStorage.removeItem('urbanwine_user');
                setCurrentUser(null);
                setView('HOME');
              }}
              onWineClick={(wine) => {
                setSelectedWine(wine);
                setView('DETAIL');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onAddToCart={handleAddToCart}
              onViewCart={() => setView('CART')}
              onViewOrders={() => {
                setView('ORDERS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : (
            /* Khi chưa đăng nhập (Khách vãng lai): Trang chủ với Hero banner & Danh mục */
            <>
              {/* Hero Section */}
              <HeroSection
                onExploreCatalog={() => scrollToWineCellar('ALL')}
                onOurStory={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
              />

              {/* Explore By Category */}
              <CategorySection
                onViewAll={() => scrollToWineCellar('ALL')}
                onSelectCategory={(id) => {
                  if (id === 1) scrollToWineCellar('RED');
                  else if (id === 2) scrollToWineCellar('WHITE');
                  else if (id === 3) scrollToWineCellar('SPARKLING');
                  else scrollToWineCellar('ALL');
                }}
              />

              {/* Wine Cellar Section */}
              <WineCellarSection
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => setSelectedCategory(cat)}
                onWineClick={(wine) => {
                  setSelectedWine(wine);
                  setView('DETAIL');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onAddToCart={handleAddToCart}
              />
            </>
          )
        )}


        {/* VIEW 2: PRODUCT DETAIL PAGE (Screenshot 3) */}
        {view === 'DETAIL' && selectedWine && (
          <WineDetailPage
            wine={selectedWine}
            onBack={() => setView('HOME')}
            onAddToCart={(wine, qty) => {
              handleAddToCart(wine, qty);
              setView('CART');
            }}
            onProceedToCheckout={(wine, qty) => {
              handleAddToCart(wine, qty);
              handleProceedToCheckout();
            }}
          />
        )}

        {/* VIEW 3: CART PAGE (Screenshot 4) */}
        {view === 'CART' && (
          <CartPage
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveFromCart}
            onContinueShopping={() => setView('HOME')}
            onProceedToCheckout={handleProceedToCheckout}
          />
        )}

        {/* VIEW 4: MY ORDERS PAGE (Screenshot 8.1 - 8.6) */}
        {view === 'ORDERS' && (
          <MyOrdersPage
            currentUser={currentUser}
            cartCount={totalCartCount}
            onBackToCellar={() => {
              setView('HOME');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewCart={() => {
              setView('CART');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onLogout={() => {
              localStorage.removeItem('urbanwine_token');
              localStorage.removeItem('urbanwine_user');
              setCurrentUser(null);
              setView('HOME');
            }}
          />
        )}

        {/* VIEW 5: CHECKOUT PAGE (Screenshot 1) */}
        {view === 'CHECKOUT' && (
          <CheckoutPage
            currentUser={currentUser}
            cartItems={cartItems}
            onBackToCart={() => {
              setView('CART');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onBackToCellar={() => {
              setView('HOME');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOrderPlaced={(orderCode) => {
              setPlacedOrderCode(orderCode);
              setView('ORDER_PLACED');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewOrders={() => {
              setView('ORDERS');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW 6: ORDER PLACED CONFIRMATION (Screenshot 2) */}
        {view === 'ORDER_PLACED' && (
          <OrderPlacedPage
            orderCode={placedOrderCode}
            onTrackOrder={() => {
              setView('ORDERS');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onContinueShopping={() => {
              setCartItems([]);
              setView('HOME');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
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
