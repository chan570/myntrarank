import React, { useState } from 'react';

export const ProductDetail = ({
  selectedProduct,
  backToSearchResults,
  selectedSize,
  setSelectedSize,
  addToBag,
  toggleWishlist,
  wishlistItems,
  formatDate
}) => {
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState("");

  const authenticity = selectedProduct.authenticityScore ?? selectedProduct.auditedMetrics?.authenticityScore ?? 1.0;
  const sentiment = selectedProduct.sentimentScore ?? selectedProduct.auditedMetrics?.sentimentScore ?? 0.5;
  const verifiedRatio = selectedProduct.verifiedRatio ?? selectedProduct.auditedMetrics?.verifiedRatio ?? 0.8;
  const genuineRating = selectedProduct.averageGenuineRating ?? selectedProduct.rawAvgRating ?? selectedProduct.auditedMetrics?.genuineRating ?? 4.0;
  const reviewsList = selectedProduct.reviews || [];
  const isWishlisted = wishlistItems.some(item => item.id === selectedProduct.id);

  const checkPincode = () => {
    if (!pincode || pincode.length !== 6) {
      setPincodeStatus("Please enter a valid 6-digit PIN code.");
      return;
    }
    setPincodeStatus(`✅ Delivery available at ${pincode} by Tomorrow!`);
  };

  return (
    <div className="pdp-container">
      {/* Breadcrumb & Back Navigation */}
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
};

export default ProductDetail;
