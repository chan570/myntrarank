import React from 'react';
import { StarIcon } from './Icons';
//Take one product object and display it beautifully on the screen.
export const ProductCard = ({
  product,
  index,
  isFake,
  openProductDetail
}) => {
  const totalReviews = product.totalReviewsCount ?? product.auditedMetrics?.totalReviewsCount ?? (product.reviews ? product.reviews.length : 0);
  const isLowReviews = !isFake && (totalReviews < 10 || product.anomalyType === "low_review_count");

  return (
    <div 
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
          <span className="rating-val">{(product.rawAvgRating || 4.0).toFixed(1)}</span>
          <StarIcon className="star-icon" />
          <span className="rating-count">| {totalReviews}</span>
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
};

export default ProductCard;
