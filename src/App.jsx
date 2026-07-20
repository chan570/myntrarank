import { useState, useMemo, useEffect, useRef } from 'react';
import { mockDatabase } from './services/mockDatabase';
import { offlinePipeline } from './services/offlinePipeline';
import { queryEngine } from './services/queryEngine';
import { apiClient } from './services/apiClient';
import './index.css';

// SVG Icons
const SearchIcon = () => (
  <svg className="search-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const StarIcon = ({ className = "star-icon" }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="#10b981" xmlns="http://www.w3.org/2000/svg" style={{ width: '12px', height: '12px', minWidth: '12px', minHeight: '12px', display: 'inline-block' }}>
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#10b981" />
  </svg>
);

const BagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const HeartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export function App() {
  // Application States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortOption, setSortOption] = useState("rank");
  const [removeSuspicious, setRemoveSuspicious] = useState(true);
  const [filterLowReviews, setFilterLowReviews] = useState(true);
  const [minRatingFilter, setMinRatingFilter] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("M");
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState("");
  const [searchIndexVersion, setSearchIndexVersion] = useState(0);

  // Scroll Position Memory
  const scrollYPos = useRef(0);

  // E-Commerce Bag & Wishlist State
  const [bagItems, setBagItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  // Open Product Detail with Scroll Memory
  const openProductDetail = (product) => {
    scrollYPos.current = window.scrollY;
    setSelectedProduct(product);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Back to Search Results with Exact Scroll Restoration
  const backToSearchResults = () => {
    const targetScroll = scrollYPos.current;
    setSelectedProduct(null);
    setTimeout(() => {
      window.scrollTo({ top: targetScroll, behavior: 'instant' });
    }, 0);
  };

  // Auto-dismiss Toast Notification after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3200);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Add Item to Bag
  const addToBag = (product, size) => {
    setBagItems(prev => [...prev, { product, size, addedAt: Date.now() }]);
    setToastMessage(`🛍️ Added ${product.title} (Size ${size}) to Bag!`);
  };

  // Toggle Wishlist Item
  const toggleWishlist = (product) => {
    const exists = wishlistItems.some(item => item.id === product.id);
    if (exists) {
      setWishlistItems(prev => prev.filter(item => item.id !== product.id));
      setToastMessage(`🤍 Removed ${product.title} from Wishlist`);
    } else {
      setWishlistItems(prev => [...prev, product]);
      setToastMessage(`❤️ Added ${product.title} to Wishlist!`);
    }
  };

  // Initialize product index on mount
  useEffect(() => {
    offlinePipeline.runBatchJob(mockDatabase.getAll());
    setSearchIndexVersion(prev => prev + 1);
  }, []);

  // Default Trust Scoring Weights
  const weights = useMemo(() => ({
    weightAuthenticity: 0.35,
    weightSentiment: 0.20,
    weightVerified: 0.15,
    weightRichness: 0.10,
    weightRecency: 0.10,
    weightRating: 0.10
  }), []);

  // Execute Search Engine
  const searchResult = useMemo(() => {
    return queryEngine.searchAndScore(searchQuery, {
      ...weights,
      removeSuspicious,
      filterLowReviews,
      minRating: minRatingFilter,
      categoryFilter: activeCategory
    });
  }, [searchIndexVersion, searchQuery, weights, removeSuspicious, filterLowReviews, minRatingFilter, activeCategory]);

  // Handle Sort Option
  const finalSortedProducts = useMemo(() => {
    const listCopy = [...searchResult.results];
    if (sortOption === "price-asc") {
      listCopy.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price-desc") {
      listCopy.sort((a, b) => b.price - a.price);
    } else if (sortOption === "rating") {
      listCopy.sort((a, b) => b.rawAvgRating - a.rawAvgRating);
    }
    return listCopy;
  }, [searchResult, sortOption]);

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const checkPincode = () => {
    if (!pincode || pincode.length !== 6) {
      setPincodeStatus("Please enter a valid 6-digit PIN code.");
      return;
    }
    setPincodeStatus(`✅ Delivery available at ${pincode} by Tomorrow!`);
  };

  // Reset to Home View on Logo Click (Scrolls to top)
  const resetToHome = (e) => {
    if (e) e.preventDefault();
    setSelectedProduct(null);
    setSearchQuery("");
    setActiveCategory("All");
    scrollYPos.current = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Toast Notification Bar */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
          <button className="toast-close" onClick={() => setToastMessage("")}>✕</button>
        </div>
      )}

      {/* Myntra Header */}
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
            {["All", "Men's Apparel", "Women's Apparel", "Footwear", "Accessories", "Kids' Wear"].map(cat => {
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

      {/* RENDER VIEW: Product Detail Page (PDP) vs Catalog Search Grid */}
      {selectedProduct ? (() => {
        const authenticity = selectedProduct.authenticityScore ?? selectedProduct.auditedMetrics?.authenticityScore ?? 1.0;
        const sentiment = selectedProduct.sentimentScore ?? selectedProduct.auditedMetrics?.sentimentScore ?? 0.5;
        const verifiedRatio = selectedProduct.verifiedRatio ?? selectedProduct.auditedMetrics?.verifiedRatio ?? 0.8;
        const genuineRating = selectedProduct.averageGenuineRating ?? selectedProduct.rawAvgRating ?? selectedProduct.auditedMetrics?.genuineRating ?? 4.0;
        const reviewsList = selectedProduct.reviews || [];
        const isWishlisted = wishlistItems.some(item => item.id === selectedProduct.id);

        return (
          <div className="pdp-container">
            {/* Breadcrumb & Back Navigation with Scroll Restoration */}
            <div className="pdp-breadcrumb">
              <button className="back-btn" onClick={backToSearchResults}>
                ← Back to Search Results
              </button>
              <span>Home / {selectedProduct.category} / <strong>{selectedProduct.brand}</strong> / {selectedProduct.title}</span>
            </div>

            {/* PDP Main 2-Column Grid */}
            <div className="pdp-main-grid">
              
              {/* Left Column: Product Showcase Image */}
              <div className="pdp-gallery">
                <div className="pdp-main-image-wrapper">
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.title} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Product Info & Purchase Actions */}
              <div className="pdp-info-panel">
                <h1 className="pdp-brand">{selectedProduct.brand}</h1>
                <h2 className="pdp-title">{selectedProduct.title}</h2>

                {/* Rating Badge */}
                <div className="pdp-rating-badge">
                  <span className="pdp-rating-val">{genuineRating.toFixed(1)} ★</span>
                  <span className="pdp-rating-sep">|</span>
                  <span className="pdp-rating-count">{reviewsList.length} Verified Ratings</span>
                  <span className="pdp-trust-shield">🛡️ Audited Genuine Score</span>
                </div>

                <div className="pdp-divider" />

                {/* Price Section */}
                <div className="pdp-price-row">
                  <span className="pdp-current-price">₹{selectedProduct.price}</span>
                  <span className="pdp-original-price">MRP ₹{selectedProduct.originalPrice}</span>
                  <span className="pdp-discount">({selectedProduct.discountPercent}% OFF)</span>
                </div>
                <div className="pdp-tax-note">inclusive of all taxes</div>

                {/* Size Selector */}
                <div className="pdp-size-section">
                  <div className="pdp-size-title">SELECT SIZE</div>
                  <div className="pdp-size-options">
                    {["S", "M", "L", "XL", "XXL"].map(size => (
                      <button 
                        key={size}
                        className={`size-btn ${selectedSize === size ? "active" : ""}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA Action Buttons */}
                <div className="pdp-cta-buttons">
                  <button className="btn-add-to-bag" onClick={() => addToBag(selectedProduct, selectedSize)}>
                    🛍️ ADD TO BAG
                  </button>
                  <button className={`btn-wishlist ${isWishlisted ? 'wishlisted' : ''}`} onClick={() => toggleWishlist(selectedProduct)}>
                    {isWishlisted ? "❤️ WISHLISTED" : "🤍 WISHLIST"}
                  </button>
                </div>

                {/* Delivery Checker */}
                <div className="pdp-delivery-box">
                  <div className="delivery-title">DELIVERY OPTIONS 🚚</div>
                  <div className="pdp-pincode-wrapper">
                    <input 
                      type="text" 
                      placeholder="Enter pincode" 
                      maxLength={6} 
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                    <button onClick={checkPincode}>Check</button>
                  </div>
                  {pincodeStatus && <div className="pincode-status-msg">{pincodeStatus}</div>}
                </div>

                <div className="pdp-divider" />

                {/* Audited Trust & Review Breakdown */}
                <div className="pdp-trust-card">
                  <h3 className="trust-card-title">🛡️ TrustRank Review Integrity Audit</h3>
                  <p className="trust-card-desc">Reviews are continuously audited by DJB2 text deduplication, density spike detection, and exponential time decay.</p>
                  
                  <div className="trust-metrics-grid">
                    <div className="metric-box">
                      <div className="metric-num">{Math.round(authenticity * 100)}%</div>
                      <div className="metric-label">Authenticity Score</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-num">{Math.round(sentiment * 100)}%</div>
                      <div className="metric-label">Positive Sentiment</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-num">{Math.round(verifiedRatio * 100)}%</div>
                      <div className="metric-label">Verified Buyers</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-num">{genuineRating.toFixed(1)} ★</div>
                      <div className="metric-label">Genuine Rating</div>
                    </div>
                  </div>
                </div>

                {/* Customer Reviews Section */}
                <div className="pdp-reviews-section">
                  <h3 className="pdp-reviews-title">Customer Reviews ({reviewsList.length})</h3>
                  
                  <div className="pdp-reviews-list">
                    {reviewsList.map((rev, idx) => (
                      <div key={idx} className="pdp-review-card">
                        <div className="review-card-header">
                          <span className="reviewer-name">{rev.reviewerName || 'Verified Customer'}</span>
                          <span className="review-star-badge">{rev.rating} ★</span>
                        </div>
                        <p className="review-text">{rev.text}</p>
                        <div className="review-footer">
                          {rev.verified ? <span className="verified-badge">✓ Verified Purchase</span> : <span className="unverified-badge">Unverified</span>}
                          <span className="review-date">{formatDate(rev.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })() : (
        /* Catalog Search Results Grid View */
        <>
          <div className="stats-subheader">
            <div>
              Search results: <strong>{finalSortedProducts.length}</strong> items
              {searchQuery && <span> for "<strong>{searchQuery}</strong>"</span>}
            </div>
          </div>

          <div className="main-layout">
            {/* Left Sidebar Filter Controls */}
            <aside className="sidebar">
              <div className="sidebar-section" style={{ borderBottom: '1px solid var(--myntra-border)', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--myntra-brand)', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <span>🛡️</span> Trust Audit Active
                </div>
                <p style={{ fontSize: '12px', color: 'var(--myntra-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                  Ratings are audited to exclude fake/bot spam and unverified purchase floods.
                </p>
              </div>

              <div className="sidebar-section">
                <div className="sidebar-title">Filters</div>
                
                <label className="filter-option">
                  <input 
                    type="checkbox" 
                    checked={removeSuspicious}
                    onChange={(e) => setRemoveSuspicious(e.target.checked)}
                  />
                  <span>Filter out fake/bot reviews</span>
                </label>

                <label className="filter-option" style={{ marginTop: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={filterLowReviews}
                    onChange={(e) => setFilterLowReviews(e.target.checked)}
                  />
                  <span>Hide products with &lt; 10 reviews</span>
                </label>

                <div style={{ marginTop: '20px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Min Rating</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[0, 3, 4].map(rating => (
                      <button 
                        key={rating}
                        className={`btn ${minRatingFilter === rating ? "btn-primary" : "btn-outline"}`}
                        style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}
                        onClick={() => setMinRatingFilter(rating)}
                      >
                        {rating === 0 ? "All" : `${rating}★ +`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Right Product View Area */}
            <main className="content-area">
              <div className="toolbar">
                <div className="results-count">
                  Ranked Products <span>(Showing verified products sorted by trust score)</span>
                </div>

                <div className="sort-container">
                  <span style={{ color: 'var(--myntra-secondary)', fontSize: '13px' }}>Sort by</span>
                  <select 
                    value={sortOption} 
                    onChange={(e) => setSortOption(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--myntra-border)', fontWeight: '600', cursor: 'pointer' }}
                  >
                    <option value="rank">⭐ Recommended (Trust Score)</option>
                    <option value="rating">★ Highest Customer Rating</option>
                    <option value="price-asc">₹ Price: Low to High</option>
                    <option value="price-desc">₹ Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Product Grid with Scroll Position Memory */}
              <div className="product-grid">
                {finalSortedProducts.map((product, index) => {
                  const isFake = Boolean(
                    product.isSuspicious || 
                    product.isFlaggedAsFake || 
                    product.isFlagged || 
                    (product.authenticityScore !== undefined && product.authenticityScore < 0.85) || 
                    (product.anomalyType && product.anomalyType !== "low_review_count")
                  );
                  const isLowReviews = !isFake && (product.totalReviewsCount < 10 || product.anomalyType === "low_review_count");

                  return (
                    <div 
                      key={product.id} 
                      className={`product-card ${isFake ? 'flagged-card' : ''}`}
                      onClick={() => openProductDetail(product)}
                    >
                      <div className="rank-badge">{index + 1}</div>

                      <div className="product-image-wrapper">
                        <img 
                          src={product.image} 
                          alt={product.title} 
                          loading="lazy" 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
                          }}
                        />
                        
                        <div className="rating-pill">
                          <span className="rating-val">{product.rawAvgRating.toFixed(1)}</span>
                          <StarIcon className="star-icon" />
                          <span className="rating-count">| {product.totalReviewsCount}</span>
                        </div>

                        {/* Visual Badges */}
                        {isFake && (
                          <div className="card-flag-badge danger-flag">
                            ⚠️ Fake Reviews
                          </div>
                        )}

                        {isLowReviews && (
                          <div className="card-flag-badge warning-flag">
                            ⚡ &lt; 10 Reviews
                          </div>
                        )}
                      </div>

                      <div className="product-info">
                        <div className="product-brand">{product.brand}</div>
                        <div className="product-title">{product.title}</div>

                        <div className="price-row">
                          <span className="current-price">₹{product.price}</span>
                          <span className="original-price">₹{product.originalPrice}</span>
                          <span className="discount">({product.discountPercent}% OFF)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
