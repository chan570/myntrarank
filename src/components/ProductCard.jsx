import { StarIcon } from './Icons';
import { getProductImage } from '../services/productImagery';
import { getEvidenceAdjustedTrust, getReviewCount } from '../services/rankingDisplay';
//Take one product object and display it beautifully on the screen.
export const ProductCard = ({
  product,
  index,
  isRiskFlagged,
  openProductDetail
}) => {
  const totalReviews = getReviewCount(product);
  const isLowReviews = !isRiskFlagged && (totalReviews < 10 || product.anomalyType === "low_review_count");
  const trustScore = getEvidenceAdjustedTrust(product);

  return (
    <div
      className={`product-card ${isRiskFlagged ? 'flagged-card' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProductDetail(product);
        }
      }}
      onClick={() => openProductDetail(product)}
    >
      <div className="rank-badge">{index + 1}</div>

      <div className="product-image-wrapper">
        <img
          src={getProductImage(product)}
          alt={product.title}
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = getProductImage(product, true);
          }}
        />

        <div className="rating-pill">
          <span className="rating-val">{(product.rawAvgRating || 4.0).toFixed(1)}</span>
          <StarIcon className="star-icon" />
          <span className="rating-count">| {totalReviews}</span>
        </div>

        {/* Visual Badges */}
        {isRiskFlagged && (
          <div className="card-flag-badge danger-flag">
            ⚠️ Review pattern warning
          </div>
        )}

        {isLowReviews && (
          <div className="card-flag-badge warning-flag">
            ⚡ Few reviews
          </div>
        )}
      </div>

      <div className="product-info">
        <div className="product-brand">{product.brand}</div>
        <div className="product-title">{product.title}</div>
        <div className="product-trust-meter" aria-label={`Review trust score ${Math.round(trustScore * 100)} out of 100`}>
          <span>Review trust</span><strong>{Math.round(trustScore * 100)}<small>/100</small></strong>
          <i><b style={{ width: `${Math.max(0, Math.min(100, trustScore * 100))}%` }} /></i>
          {totalReviews < 10 && <small className="trust-score-note">Early estimate based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</small>}
        </div>
        <div className="price-row">Demo catalog · {product.category}</div>
      </div>
    </div>
  );
};

export default ProductCard;
