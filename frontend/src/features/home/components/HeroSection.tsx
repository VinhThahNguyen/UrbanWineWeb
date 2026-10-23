import React from 'react';
import './HeroSection.css';

interface HeroSectionProps {
  onExploreCatalog?: () => void;
  onOurStory?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreCatalog,
  onOurStory,
}) => {
  return (
    <section className="hero-container" id="home">
      <div className="hero-inner">
        {/* Left Column: Headlines & CTAs */}
        <div className="hero-content">
          <div className="hero-tagline">
            <span className="tagline-line"></span>
            <span className="tagline-text">PREMIUM SELECTION 2024</span>
          </div>

          <h1 className="hero-title">
            Discover
            <br />
            <span className="hero-title-italic">Exceptional</span>
            <br />
            Wines
          </h1>

          <p className="hero-description">
            Handpicked premium vintages delivered directly to your doorstep.
            Curated from the world's finest estates.
          </p>

          <div className="hero-actions">
            <button className="btn-explore" onClick={onExploreCatalog}>
              EXPLORE CATALOG
            </button>
            <button className="btn-story" onClick={onOurStory}>
              OUR STORY
            </button>
          </div>

          {/* Social Proof Counter / Stats */}
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">PREMIUM LABELS</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">20+</span>
              <span className="stat-label">COUNTRIES</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">12K+</span>
              <span className="stat-label">HAPPY CUSTOMERS</span>
            </div>
          </div>
        </div>

        {/* Right Column: Featured Premium Wine Bottle */}
        <div className="hero-visual">
          <div className="hero-image-wrapper">
            <img
              src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85"
              alt="Velluto Rosso - Red Velvet Beneventano Aglianico"
              className="hero-wine-img"
            />
            {/* Dark & Gold Glow Vignette Overlay */}
            <div className="hero-image-vignette"></div>

            {/* Typography Overlay Label as seen in screenshot */}
            <div className="bottle-label-overlay">
              <div className="label-brand">VELLUTO ROSSO</div>
              <div className="label-sub">RED VELVET</div>
              <div className="label-origin">BENEVENTANO AGLIANICO</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
