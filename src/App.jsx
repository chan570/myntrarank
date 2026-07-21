import { useState, useMemo, useEffect, useRef } from 'react';
import { apiClient } from './services/apiClient';
import { Header } from './components/Header';
import { SidebarFilters } from './components/SidebarFilters';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import './index.css';

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
  const [searchResults, setSearchResults] = useState([]);

  // Scroll Memory & E-Commerce Bag/Wishlist State
  const scrollYPos = useRef(0);
  const [bagItems, setBagItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  // Product Navigation Handlers
  const openProductDetail = (product) => {
    scrollYPos.current = window.scrollY;
    setSelectedProduct(product);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const backToSearchResults = () => {
    const targetScroll = scrollYPos.current;
    setSelectedProduct(null);
    setTimeout(() => {
      window.scrollTo({ top: targetScroll, behavior: 'instant' });
    }, 0);
  };

  const resetToHome = (e) => {
    if (e) e.preventDefault();
    setSelectedProduct(null);
    setSearchQuery("");
    setActiveCategory("All");
    scrollYPos.current = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3200);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // E-Commerce Bag & Wishlist Actions
  const addToBag = (product, size) => {
    setBagItems(prev => [...prev, { product, size, addedAt: Date.now() }]);
    setToastMessage(`🛍️ Added ${product.title} (Size ${size}) to Bag!`);
  };

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

  // Execute Pure Backend Search via Express REST API & Amazon OpenSearch
  useEffect(() => {
    let isMounted = true;
    apiClient.executeQuery(searchQuery, {
      auth: 0.35,
      sent: 0.20,
      ver: 0.15,
      rich: 0.10,
      rec: 0.10,
      rate: 0.10,
      removeSuspicious,
      filterLowReviews,
      minRating: minRatingFilter,
      categoryFilter: activeCategory
    }).then(data => {
      if (isMounted && data && Array.isArray(data.results)) {
        setSearchResults(data.results);
      }
    }).catch(err => console.error("Backend Search Error:", err));

    return () => { isMounted = false; };
  }, [searchQuery, removeSuspicious, filterLowReviews, minRatingFilter, activeCategory]);

  const checkIsFakeProduct = (product) => {
    if (!product) return false;
    const authScore = product.authenticityScore !== undefined 
      ? product.authenticityScore 
      : (product.auditedMetrics?.authenticityScore !== undefined ? product.auditedMetrics.authenticityScore : 1.0);
    return Boolean(
      product.isSuspicious || 
      product.isFlaggedAsFake || 
      product.isFlagged || 
      authScore < 0.60 || 
      (product.anomalyType && product.anomalyType !== "low_review_count")
    );
  };

  // Handle Sort Controls
  const finalSortedProducts = useMemo(() => {
    let listCopy = [...searchResults];

    if (removeSuspicious) {
      listCopy = listCopy.filter(product => !checkIsFakeProduct(product));
    }

    if (filterLowReviews) {
      listCopy = listCopy.filter(product => {
        const totalReviews = product.totalReviewsCount ?? product.auditedMetrics?.totalReviewsCount ?? (product.reviews ? product.reviews.length : 0);
        return totalReviews >= 10 && product.anomalyType !== "low_review_count";
      });
    }

    if (sortOption === "price-asc") {
      listCopy.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price-desc") {
      listCopy.sort((a, b) => b.price - a.price);
    } else if (sortOption === "rating") {
      listCopy.sort((a, b) => b.rawAvgRating - a.rawAvgRating);
    }
    return listCopy;
  }, [searchResults, sortOption, removeSuspicious, filterLowReviews]);

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

      {/* Header Bar */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        setSelectedProduct={setSelectedProduct}
        wishlistItems={wishlistItems}
        bagItems={bagItems}
        setToastMessage={setToastMessage}
        resetToHome={resetToHome}
      />

      {/* Product Detail Page View vs Catalog Search Grid View */}
      {selectedProduct ? (
        <ProductDetail
          selectedProduct={selectedProduct}
          backToSearchResults={backToSearchResults}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          addToBag={addToBag}
          toggleWishlist={toggleWishlist}
          wishlistItems={wishlistItems}
          formatDate={formatDate}
        />
      ) : (
        <>
          <div className="stats-subheader">
            <div>
              Search results: <strong>{finalSortedProducts.length}</strong> items
              {searchQuery && <span> for "<strong>{searchQuery}</strong>"</span>}
            </div>
          </div>

          <div className="main-layout">
            <SidebarFilters
              removeSuspicious={removeSuspicious}
              setRemoveSuspicious={setRemoveSuspicious}
              filterLowReviews={filterLowReviews}
              setFilterLowReviews={setFilterLowReviews}
              minRatingFilter={minRatingFilter}
              setMinRatingFilter={setMinRatingFilter}
            />

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

              <div className="product-grid">
                {finalSortedProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    isFake={checkIsFakeProduct(product)}
                    openProductDetail={openProductDetail}
                  />
                ))}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
