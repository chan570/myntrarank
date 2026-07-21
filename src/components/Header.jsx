import React from 'react';
import { SearchIcon, BagIcon, HeartIcon } from './Icons';

export const Header = ({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  setSelectedProduct,
  wishlistItems,
  bagItems,
  setToastMessage,
  resetToHome
}) => {
  const categories = ["All", "Men's Apparel", "Women's Apparel", "Footwear", "Accessories", "Kids' Wear"];

  return (
    <header className="myntra-header">
      <a href="/" className="logo-container" onClick={resetToHome}>
        <svg className="logo-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff3f6c" />
              <stop offset="100%" stopColor="#ff6f43" />
            </linearGradient>
          </defs>
          <path d="M50,15 L80,28 L80,55 C80,72 50,85 50,85 C50,85 20,72 20,55 L20,28 Z" fill="url(#logoGrad)" />
          <path d="M38,48 L46,56 L62,38" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="logo-text">Trust<span>Rank</span></div>
      </a>

      {/* Category Navigation Links */}
      <nav>
        <ul className="nav-links">
          {categories.map(cat => {
            const displayLabel = cat.replace("'s Apparel", "").replace("' Wear", "");
            return (
              <li key={cat} className="nav-item">
                <span 
                  className={`nav-link ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => { setActiveCategory(cat); setSelectedProduct(null); }}
                >
                  {displayLabel}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Search Bar */}
      <div className="search-bar-container">
        <SearchIcon />
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search for brands, shirts, shoes, watches..." 
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSelectedProduct(null); }}
        />
      </div>

      {/* Header Action Badges (Wishlist & Shopping Bag Counters) */}
      <div className="header-user-actions">
        <div className="header-action-icon" onClick={() => setToastMessage(`Wishlist contains ${wishlistItems.length} items`)}>
          <HeartIcon />
          <span className="action-label">Wishlist</span>
          {wishlistItems.length > 0 && <span className="action-badge">{wishlistItems.length}</span>}
        </div>

        <div className="header-action-icon" onClick={() => setToastMessage(`Shopping Bag contains ${bagItems.length} items`)}>
          <BagIcon />
          <span className="action-label">Bag</span>
          {bagItems.length > 0 && <span className="action-badge brand-badge">{bagItems.length}</span>}
        </div>
      </div>
    </header>
  );
};

export default Header;
