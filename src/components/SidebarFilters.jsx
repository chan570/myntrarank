import React from 'react';

export const SidebarFilters = ({
  removeSuspicious,
  setRemoveSuspicious,
  filterLowReviews,
  setFilterLowReviews,
  minRatingFilter,
  setMinRatingFilter
}) => {
  return (
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
  );
};

export default SidebarFilters;
