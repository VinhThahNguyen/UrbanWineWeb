import React from 'react';
import { Wine, Search, ShoppingBag, User } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  cartCount?: number;
  onSignInClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cartCount = 2, onSignInClick }) => {
  return (
    <header className="header-container">
      <div className="header-inner">
        {/* Brand Logo */}
        <div className="header-logo">
          <Wine className="logo-icon" size={24} />
          <span className="logo-text">Urban Wine Express</span>
        </div>

        {/* Navigation Menu */}
        <nav className="header-nav">
          <a href="#home" className="nav-item active">Home</a>
          <a href="#catalog" className="nav-item">Wine Catalog</a>
          <a href="#categories" className="nav-item">Categories</a>
          <a href="#about" className="nav-item">About Us</a>
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
          <button className="cart-button" title="View Cart">
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>

          {/* Sign In CTA Button */}
          <button className="signin-button" onClick={onSignInClick}>
            <User size={16} className="signin-icon" />
            <span>Sign In</span>
          </button>
        </div>
      </div>
    </header>
  );
};
