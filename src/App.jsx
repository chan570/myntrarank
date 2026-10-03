import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from './services/apiClient';
import { Header } from './components/Header';
import { SidebarFilters } from './components/SidebarFilters';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { AuthDialog } from './components/AuthDialog';
import { HomePage } from './components/HomePage';
import { getEvidenceAdjustedRating, getEvidenceAdjustedTrust } from './services/rankingDisplay';
import './index.css';

export function App() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRevision, setSearchRevision] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState('home');
  const [sortOption, setSortOption] = useState('trust');
  const [filterLowReviews, setFilterLowReviews] = useState(false);
  const [minRatingFilter, setMinRatingFilter] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authDialogMode, setAuthDialogMode] = useState(null);
  const [reviewedProductIds, setReviewedProductIds] = useState(() => new Set());
  const scrollYPos = useRef(0);
  const searchRequestId = useRef(0);

  const applySearch = (query = searchInput) => {
    const cleanQuery = query.trim();
    setSearchInput(cleanQuery);
    setSearchQuery(cleanQuery);
    setSearchRevision((revision) => revision + 1);
    setSelectedProduct(null);
    setSearchResults([]);
    setPage('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const browseCategory = (category) => {
    setActiveCategory(category);
    setSearchInput('');
    setSearchQuery('');
    setFilterLowReviews(false);
    setMinRatingFilter(0);
    setSearchRevision((revision) => revision + 1);
    setSelectedProduct(null);
    setSearchResults([]);
    setPage('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openProductDetail = (product) => {
    scrollYPos.current = window.scrollY;
    setSelectedProduct(product);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const backToSearchResults = () => {
    const targetScroll = scrollYPos.current;
    setSelectedProduct(null);
    setTimeout(() => window.scrollTo({ top: targetScroll, behavior: 'instant' }), 0);
  };

  const resetToHome = (event) => {
    event?.preventDefault();
    setPage('home');
    setActiveCategory('All');
    setFilterLowReviews(false);
    setMinRatingFilter(0);
    setSearchInput('');
    setSearchQuery('');
    setSearchRevision((revision) => revision + 1);
    setSelectedProduct(null);
    setSearchResults([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = setTimeout(() => setToastMessage(''), 3600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let isMounted = true;
    apiClient.getCurrentUser().then((user) => { if (isMounted) setCurrentUser(user); }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleReviewSubmit = async (reviewPayload) => {
    const response = await apiClient.submitReview(reviewPayload);
    setReviewedProductIds((ids) => new Set(ids).add(`${currentUser.id}:${reviewPayload.productId}`));
    setToastMessage('Review saved. Your current results stay in place; the latest order appears when you search again or return home.');
    return response;
  };

  const handleAuthSubmit = async (mode, payload) => {
    const user = mode === 'register'
      ? await apiClient.registerAccount(payload)
      : await apiClient.login(payload);
    setCurrentUser(user);
    setAuthDialogMode(null);
    setToastMessage(`Welcome, ${user.name}. You can now submit a review.`);
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      setCurrentUser(null);
      setToastMessage('You have signed out.');
    } catch (error) {
      setToastMessage(error.message || 'Could not sign out. Please try again.');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const requestId = ++searchRequestId.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading reflects the query request lifecycle.
    setIsLoading(true);
    setBackendError(null);

    apiClient.executeQuery(searchQuery, {
      auth: 0.35,
      sent: 0.20,
      ver: 0.15,
      rich: 0.10,
      rec: 0.10,
      rate: 0.10,
      removeSuspicious: false,
      filterLowReviews: false,
      minRating: 0,
      categoryFilter: activeCategory,
    }).then((data) => {
      if (isMounted && requestId === searchRequestId.current) {
        setSearchResults(Array.isArray(data.results) ? data.results : []);
        setIsLoading(false);
      }
    }).catch((error) => {
      if (isMounted && requestId === searchRequestId.current) {
        setSearchResults([]);
        setBackendError(error.message || 'TrustRank could not load search results.');
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [searchQuery, searchRevision, activeCategory]);

  const hasReviewRiskSignals = (product) => {
    const score = product.authenticityScore ?? product.auditedMetrics?.authenticityScore ?? 1;
    return Boolean(product.isSuspicious || product.reviewRiskFlagged || score < 0.60
      || (product.anomalyType && product.anomalyType !== 'low_review_count'));
  };

  const displayedProducts = useMemo(() => {
    const products = [...searchResults];
    if (filterLowReviews) {
      for (let index = products.length - 1; index >= 0; index -= 1) {
        const count = products[index].totalReviewsCount ?? products[index].reviews?.length ?? 0;
        if (count < 10) products.splice(index, 1);
      }
    }
    if (minRatingFilter > 0) {
      for (let index = products.length - 1; index >= 0; index -= 1) {
        const rating = Number(products[index].rawAvgRating ?? products[index].averageGenuineRating ?? products[index].auditedMetrics?.genuineRating ?? 0);
        if (rating < minRatingFilter) products.splice(index, 1);
      }
    }
    if (sortOption === 'rating') products.sort((a, b) => getEvidenceAdjustedRating(b) - getEvidenceAdjustedRating(a));
    if (sortOption === 'trust') products.sort((a, b) => getEvidenceAdjustedTrust(b) - getEvidenceAdjustedTrust(a));
    return products;
  }, [searchResults, sortOption, filterLowReviews, minRatingFilter]);

  const sortHelp = {
    trust: 'Search still matches your words first. This orders matching items by review trust, with small samples treated cautiously.',
    rating: 'Search still matches your words first. This orders matching items by star rating, with small samples treated cautiously.',
  }[sortOption];

  const formatDate = (timestamp) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(timestamp));

  return (
    <div className="app-container trust-app">
      {toastMessage && <div className="toast-notification" role="status"><span>{toastMessage}</span><button className="toast-close" onClick={() => setToastMessage('')} aria-label="Dismiss">×</button></div>}

      <Header
        searchQuery={searchInput}
        setSearchQuery={setSearchInput}
        onSearch={applySearch}
        user={currentUser}
        openAuth={setAuthDialogMode}
        onLogout={handleLogout}
        isLoading={isLoading}
        resetToHome={resetToHome}
      />

      {selectedProduct ? (
        <ProductDetail
          selectedProduct={selectedProduct}
          backToSearchResults={backToSearchResults}
          formatDate={formatDate}
          submitReview={handleReviewSubmit}
          currentUser={currentUser}
          alreadyReviewed={currentUser ? reviewedProductIds.has(`${currentUser.id}:${selectedProduct.id}`) : false}
          openAuth={setAuthDialogMode}
          backLabel={page === 'home' ? '← Back to Home' : '← Back to Search Results'}
        />
      ) : page === 'home' ? (
        <HomePage
          products={displayedProducts}
          isLoading={isLoading}
          onChooseCategory={browseCategory}
          openProductDetail={openProductDetail}
          hasReviewRiskSignals={hasReviewRiskSignals}
        />
      ) : (
        <>
          <section className="search-page-heading">
            <span className="section-eyebrow">SEARCH RESULTS</span>
            <h1>{searchQuery ? `Results for “${searchQuery}”` : activeCategory === 'All' ? 'All clothing' : `Browse ${activeCategory}`}</h1>
            <p>{displayedProducts.length} matching demo items</p>
          </section>

          <div className="main-layout trust-main-layout">
            <SidebarFilters
              filterLowReviews={filterLowReviews}
              setFilterLowReviews={setFilterLowReviews}
              minRatingFilter={minRatingFilter}
              setMinRatingFilter={setMinRatingFilter}
            />
            <main className="content-area trust-content-area">
              <div className="toolbar trust-toolbar">
                <div className="results-count"><strong>{sortOption === 'rating' ? 'Highest star rating' : 'Most trusted reviews'}</strong><span>{sortHelp}</span></div>
                <label className="sort-container">Sort by
                  <select aria-label="Choose how to sort products" value={sortOption} onChange={(event) => setSortOption(event.target.value)}>
                    <option value="trust">Most trusted reviews</option>
                    <option value="rating">Highest star rating</option>
                  </select>
                </label>
              </div>

              {isLoading ? (
                <div className="trust-loading"><div className="trust-loader" /><div><strong>Finding your results</strong><p>This will only take a moment…</p></div></div>
              ) : backendError ? (
                <div className="trust-empty-state"><span>Not available right now</span><h3>We couldn’t load the products.</h3><p>Please try again in a moment.</p><button type="button" onClick={() => applySearch(searchInput)}>Try again</button></div>
              ) : displayedProducts.length === 0 ? (
                <div className="trust-empty-state"><span>No items found</span><h3>Try a different word or clear a filter.</h3><p>Try “dress”, “top”, or “jeans”, or browse all clothing.</p><button type="button" onClick={resetToHome}>Show all clothing</button></div>
              ) : (
                <div className="product-grid trust-product-grid">
                  {displayedProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} isRiskFlagged={hasReviewRiskSignals(product)} openProductDetail={openProductDetail} />)}
                </div>
              )}
              <footer className="trust-footer"><span>TRUSTRANK</span><p>Demo reviews come from a public clothing dataset. Product photos are examples, not photos of these specific items. New reviews are not purchase-verified.</p><span>CLOTHING REVIEW DEMO</span></footer>
            </main>
          </div>
        </>
      )}

      {authDialogMode && <AuthDialog initialMode={authDialogMode} onClose={() => setAuthDialogMode(null)} onSubmit={handleAuthSubmit} />}
    </div>
  );
}

export default App;
