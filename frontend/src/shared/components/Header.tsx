import React from 'react';
import { Wine, Search, ShoppingBag, User } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  cartCount?: number;
  activeNav?: string;
  currentUser?: any;
  onSignInClick?: () => void;
  onLogout?: () => void;
  onCartClick?: () => void;
  onNavClick?: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount = 2,
  activeNav = 'home',
  currentUser,
  onSignInClick,
  onLogout,
  onCartClick,
  onNavClick,
}) => {

  return (
    <header className="header-container">
      <div className="header-inner">
        {/* Brand Logo */}
        <div className="header-logo" onClick={() => onNavClick && onNavClick('home')} style={{ cursor: 'pointer' }}>
          <Wine className="logo-icon" size={24} />
          <span className="logo-text">Urban Wine Express</span>
        </div>

        {/* Navigation Menu */}
        <nav className="header-nav">
          <a
            href="#home"
            className={`nav-item ${activeNav === 'home' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onNavClick && onNavClick('home');
            }}
          >
            Home
          </a>
          <a
            href="#catalog"
            className={`nav-item ${activeNav === 'catalog' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onNavClick && onNavClick('catalog');
            }}
          >
            Wine Catalog
          </a>
          <a
            href="#categories"
            className={`nav-item ${activeNav === 'categories' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onNavClick && onNavClick('categories');
            }}
          >
            Categories
          </a>
          <a
            href="#about"
            className={`nav-item ${activeNav === 'about' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onNavClick && onNavClick('about');
            }}
          >
            About Us
          </a>
        </nav>



        {/* Action Controls */}
        <div className="header-actions">
          {/* Search Bar */}
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search wines, vintages..."
              className="search-input"
            />
          </div>

          {/* Cart Icon with Counter Badge */}
          <button className="cart-button" title="View Cart" onClick={onCartClick}>
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>

          {/* Sign In CTA Button or Logged-in Customer Badge with Icon */}
          {currentUser ? (
            <div className="user-profile-badge">
              <div className="user-avatar-circle">
                <User size={15} />
              </div>
              <span className="user-display-name">
                Xin chào, {currentUser.fullName || currentUser.email}
              </span>
              <button
                className="btn-logout-small"
                onClick={onLogout}
                title="Đăng xuất"
              >
                Logout
              </button>
            </div>
          ) : (
            <button className="signin-button" onClick={onSignInClick}>
              <User size={16} className="signin-icon" />
              <span>Sign In</span>
            </button>
          )}


        </div>
      </div>
    </header>
  );
};

