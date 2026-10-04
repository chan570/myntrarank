import { useRef, useState } from 'react';
import { getProductImage } from '../services/productImagery';
import { getEvidenceAdjustedTrust, getReviewCount } from '../services/rankingDisplay';

const getSentimentLabel = (review) => {
  const score = Number(review.sentimentPolarityScore ?? review.sentimentScore);
  if (!Number.isFinite(score) || score < 0 || score > 1) return 'Sentiment unavailable';
  if (score >= 0.6) return 'Positive';
  if (score <= 0.4) return 'Negative';
  return 'Neutral';
};

export const ProductDetail = ({
  selectedProduct,
  backToSearchResults,
  formatDate,
  submitReview,
  currentUser,
  alreadyReviewed,
  openAuth,
  backLabel = '← Back to Search Results',
}) => {
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [newReview, setNewReview] = useState(null);
  const [reviewState, setReviewState] = useState({ pending: false, message: '', error: false });
  const requestId = useRef(null);

  const genuineRating = selectedProduct.averageGenuineRating ?? selectedProduct.rawAvgRating ?? selectedProduct.auditedMetrics?.genuineRating ?? 4.0;
  const compositeTrust = getEvidenceAdjustedTrust(selectedProduct);
  const reviewCount = getReviewCount(selectedProduct);
  const reviewsList = [newReview, ...(selectedProduct.reviews || [])].filter(Boolean);

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewState({ pending: true, message: '', error: false });
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await submitReview({
        requestId: requestId.current,
        productId: selectedProduct.id,
        rating: Number(reviewRating),
        text: reviewText
      });
      setNewReview(response?.data?.review || null);
      requestId.current = null;
      setReviewSubmitted(true);
      setReviewText('');
      setReviewState({ pending: false, message: 'Your review is saved. Your current results stay in place; the latest order appears when you search again or return home.', error: false });
    } catch (error) {
      setReviewState({ pending: false, message: error.message || 'Could not submit the review. Please try again.', error: true });
    }
  };

  return (
    <div className="pdp-container">
      {/* Breadcrumb & Back Navigation */}
      <div className="pdp-breadcrumb">
        <button className="back-btn" onClick={backToSearchResults}>
          {backLabel}
        </button>
        <span>Home / {selectedProduct.category} / <strong>{selectedProduct.brand}</strong> / {selectedProduct.title}</span>
      </div>

      {/* PDP Main 2-Column Grid */}
      <div className="pdp-main-grid">

        {/* Left Column: Product Showcase Image */}
        <div className="pdp-gallery">
          <div className="pdp-main-image-wrapper">
            <img
              src={getProductImage(selectedProduct)}
              alt={selectedProduct.title}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getProductImage(selectedProduct, true);
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
            <span className="pdp-rating-count">{reviewCount} dataset reviews{newReview ? ' + 1 new demo review' : ''}</span>
          </div>

          <div className="pdp-divider" />
          <p>This demo uses public clothing reviews. The fashion photo is an example, not a photo of this exact item. Signing in lets you post a review, but does not confirm a purchase.</p>

          <div className="pdp-divider" />

          {/* Simple customer feedback summary */}
          <div className="pdp-trust-card">
            <h3 className="trust-card-title">Customer feedback</h3>
            <p className="trust-card-desc">The star rating shows what reviewers thought. Review trust combines review-quality signals and the number of reviews into one comparison score.</p>

            <div className="trust-metrics-grid">
              <div className="metric-box">
                <div className="metric-num">{genuineRating.toFixed(1)} ★</div>
                <div className="metric-label">Customer rating</div>
                <p className="metric-note">From {reviewCount} review{reviewCount === 1 ? '' : 's'}</p>
              </div>
              <div className="metric-box metric-box-trust">
                <div className="metric-num">{Math.round(compositeTrust * 100)}/100</div>
                <div className="metric-label">Review trust</div>
                <p className="metric-note">A guide, not proof that reviews are genuine.</p>
              </div>
              <div className="metric-box">
                <div className="metric-num metric-unknown">Unknown</div>
                <div className="metric-label">Purchase verified</div>
                <p className="metric-note">This demo has no order records to check.</p>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="pdp-reviews-section">
            <h3 className="pdp-reviews-title">Customer Reviews ({reviewsList.length})</h3>

            {currentUser && (alreadyReviewed || reviewSubmitted || reviewsList.some((review) => review.userId === currentUser.id)) ? (
              <div className="review-signin-card review-already-submitted"><div className="review-signin-icon">✓</div><div><strong>You’ve reviewed this product</strong><p>Your review is saved. The current product order stays in place until you search again or return home.</p></div></div>
            ) : currentUser ? <form className="review-submit-form" onSubmit={handleReviewSubmit}>
              <h4>Share your review</h4>
              <p className="review-author-note">Posting as <strong>{currentUser.name}</strong> · one review per product</p>
              <label>
                Rating
                <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)} required>
                  <option value="" disabled>Select a rating</option>
                  {[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} stars</option>)}
                </select>
              </label>
              <label>
                Review
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} minLength={5} maxLength={2000} rows={4} required />
              </label>
              <p className="review-demo-note">Your review will show your account name. This demo cannot check whether you bought the item.</p>
              <button type="submit" disabled={reviewState.pending || reviewSubmitted}>
                {reviewState.pending ? 'Saving your review…' : 'Post review'}
              </button>
              {reviewState.message && <div role="status" className={reviewState.error ? 'review-form-error' : 'review-form-success'}><p>{reviewState.message}</p></div>}
            </form> : <div className="review-signin-card">
              <div className="review-signin-icon">✦</div>
              <div><strong>Have you tried this item?</strong><p>Sign in to leave one review. This demo does not check purchase history.</p></div>
              <button type="button" onClick={() => openAuth('login')}>Sign in to post</button>
            </div>}

            <div className="pdp-reviews-list">
              {reviewsList.map((rev, idx) => (
                <div key={idx} className="pdp-review-card">
                  <div className="review-card-header">
                    <span className="reviewer-name">{rev.reviewerName || 'Anonymous dataset review'}</span>
                    <div className="review-card-badges">
                      <span className={`review-sentiment-badge sentiment-${getSentimentLabel(rev).toLowerCase().replaceAll(' ', '-')}`} title="Estimated sentiment from the review text">
                        {getSentimentLabel(rev)}
                      </span>
                      <span className="review-star-badge">{rev.rating} ★</span>
                    </div>
                  </div>
                  <p className="review-text">{rev.text}</p>
                  <div className="review-footer">
                    <span className="unverified-badge">{rev.source === 'user-submitted' ? 'Demo review · purchase not verified' : 'Historical dataset · purchase status unavailable'}</span>
                    {rev.date && <span className="review-date">{formatDate(rev.date)}</span>}
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
