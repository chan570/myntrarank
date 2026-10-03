export const SidebarFilters = ({
  filterLowReviews,
  setFilterLowReviews,
  minRatingFilter,
  setMinRatingFilter,
}) => (
  <aside className="sidebar" aria-label="Narrow your results">
    <div className="sidebar-section filter-intro">
      <div className="filter-heading"><span aria-hidden="true">✦</span> Choose what matters</div>
      <p>Search always finds matching products first. Use these to narrow the list.</p>
    </div>

    <div className="sidebar-section">
      <div className="sidebar-title">Narrow your results</div>
      <label className="filter-option filter-option-explained">
        <input
          type="checkbox"
          checked={filterLowReviews}
          onChange={(event) => setFilterLowReviews(event.target.checked)}
        />
        <span><strong>Require at least 10 reviews</strong><small>Hides products with fewer than 10 reviews. It does not change their order.</small></span>
      </label>

      <div className="rating-filter">
        <span className="rating-filter-title">Minimum star rating</span>
        <div className="rating-filter-options">
          {[0, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              className={minRatingFilter === rating ? 'rating-filter-button active' : 'rating-filter-button'}
              aria-pressed={minRatingFilter === rating}
              onClick={() => setMinRatingFilter(rating)}
            >
              {rating === 0 ? 'Any rating' : `${rating} stars and up`}
            </button>
          ))}
        </div>
      </div>
      <p className="filter-footnote">Review-pattern warnings are signals, not proof that a review is fake.</p>
    </div>
  </aside>
);

export default SidebarFilters;
