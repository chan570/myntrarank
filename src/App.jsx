import { useState, useMemo, useEffect, useRef } from 'react';
import { mockDatabase } from './services/mockDatabase';
import { offlinePipeline } from './services/offlinePipeline';
import { queryEngine } from './services/queryEngine';
import './index.css';

// SVG Icons as React components for high performance
const SearchIcon = () => (
  <svg className="search-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const StarIcon = ({ filled = true, className = "star-icon" }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" 
      fill={filled ? undefined : "none"} 
      stroke={filled ? undefined : "currentColor"} 
      strokeWidth={filled ? undefined : "2"}
    />
  </svg>
);

const CheckIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

export default function App() {
  // Mode state: Developer/Engine View vs Customer/Shopper View
  const [devMode, setDevMode] = useState(false);

  // States to trigger React updates when index changes
  const [searchIndexVersion, setSearchIndexVersion] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dbStateClean, setDbStateClean] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState([]);

  // Terminal scroll ref
  const terminalEndRef = useRef(null);

  // Application States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortOption, setSortOption] = useState("rank");
  const [removeSuspicious, setRemoveSuspicious] = useState(true);
  const [filterLowReviews, setFilterLowReviews] = useState(true);
  const [minRatingFilter, setMinRatingFilter] = useState(0);

  // Weight States (Adjustable by developers to test rank behavior)
  const [weights, setWeights] = useState({
    weightAuthenticity: 0.35,
    weightSentiment: 0.20,
    weightVerified: 0.15,
    weightRichness: 0.10,
    weightRecency: 0.10,
    weightRating: 0.10
  });

  // Active drawer/modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  // Run initial Spark Batch compilation on startup
  useEffect(() => {
    const res = offlinePipeline.runBatchJob(mockDatabase.getAll());
    setConsoleLogs(res.logs);
    setSearchIndexVersion(prev => prev + 1);
  }, []);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  // Handle simulated offline batch update
  const triggerSparkBatchJob = () => {
    setIsProcessing(true);
    const time = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, `[${time}] [INFO] Triggering Apache Spark distributed batch compilation...`]);

    setTimeout(() => {
      const res = offlinePipeline.runBatchJob(mockDatabase.getAll());
      setConsoleLogs(res.logs);
      setSearchIndexVersion(prev => prev + 1);
      setDbStateClean(true);
      setIsProcessing(false);
    }, 600);
  };

  // Inject coordinated spam bot attack
  const triggerSpamInjection = () => {
    setDbStateClean(false);
    mockDatabase.injectBotAttack("prod-506", {
      count: 20,
      rating: 5,
      text: "AMAZING FIT! Highly recommended buy! Worth every penny. Buy this product!",
      isVerified: false
    });
    mockDatabase.injectBotAttack("prod-337", {
      count: 18,
      rating: 5,
      text: "Best product ever, buy this Roadster polo. Incredible design quality.",
      isVerified: false
    });

    const time = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [
      ...prev,
      `[${time}] [ERROR] ⚠️ DYNAMODB WRITE LOG: Injected 38 unverified fake reviews.`,
      `[${time}] [WARN] Database status: DIRTY (Pending search index compilation).`
    ]);

    alert("Bot Attack Injected! 38 fake reviews added. Run the Spark Batch Job in the console to filter them!");
  };

  // Reset entire simulation to initial clean state
  const resetSystem = () => {
    mockDatabase.reset();
    const res = offlinePipeline.runBatchJob(mockDatabase.getAll());
    setConsoleLogs(res.logs);
    setSearchIndexVersion(prev => prev + 1);
    setDbStateClean(true);
    setIsProcessing(false);
    alert("System database and Elasticsearch index successfully reset.");
  };

  // Handle weight change slider
  const handleWeightChange = (key, val) => {
    setWeights(prev => ({
      ...prev,
      [key]: parseFloat(val)
    }));
  };

  const weightsSum = useMemo(() => {
    return Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  }, [weights]);

  // Run Real-Time Query Engine
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

  // Prepare Raw JSON of exactly top 500 for export
  const rawExportJson = useMemo(() => {
    const exportList = searchResult.results.map((p, idx) => ({
      rank: idx + 1,
      id: p.id,
      brand: p.brand,
      title: p.title,
      price: p.price,
      category: p.category,
      ratingScore: parseFloat((p.rawAvgRating).toFixed(2)),
      genuineRatingScore: parseFloat((p.averageGenuineRating).toFixed(2)),
      totalReviews: p.totalReviewsCount,
      relevanceScore: parseFloat(p.relevanceScore.toFixed(4)),
      authenticityScore: parseFloat(p.authenticityScore.toFixed(4)),
      sentimentScore: parseFloat(p.sentimentScore.toFixed(4)),
      verifiedRatio: parseFloat(p.verifiedRatio.toFixed(4)),
      richnessScore: parseFloat(p.richnessScore.toFixed(4)),
      recencyScore: parseFloat(p.recencyScore.toFixed(4)),
      finalRankingScore: parseFloat(p.finalRankingScore.toFixed(4))
    }));
    return JSON.stringify(exportList, null, 2);
  }, [searchResult.results]);

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const getPercentageWeight = (val) => {
    return Math.round((val / weightsSum) * 100);
  };

  const resetWeights = () => {
    setWeights({
      weightAuthenticity: 0.35,
      weightSentiment: 0.20,
      weightVerified: 0.15,
      weightRichness: 0.10,
      weightRecency: 0.10,
      weightRating: 0.10
    });
  };

  // User friendly feedback summaries
  const getAuthenticityFeedback = (score, isFlagged) => {
    if (isFlagged) {
      return {
        badge: "Suspicious Activity",
        class: "danger-pill",
        text: "Our engine detected rating manipulation. Fake reviews have been discarded to display the genuine rating."
      };
    }
    if (score > 0.9) {
      return {
        badge: "100% Genuine Reviews",
        class: "success-pill",
        text: "Excellent review health. All reviews are unique, natural, and verified as authentic purchases."
      };
    }
    return {
      badge: "High Credibility",
      class: "success-pill",
      text: "Solid review profiles. High rating diversity and reliable purchase behavior."
    };
  };

  const getSentimentFeedback = (score) => {
    if (score > 0.8) return "Exceptionally Positive: Customers are highly satisfied and actively recommend this product.";
    if (score > 0.6) return "Mostly Positive: Highly rated for fit, style, and fabric quality.";
    return "Mixed Feedback: Some customers reported concerns with fit or material longevity.";
  };

  return (
    <div className="app-container">
      {/* Sticky Myntra Header */}
      <header className="myntra-header">
        <a href="/" className="logo-container" onClick={(e) => { e.preventDefault(); setSearchQuery(""); }}>
          <svg className="logo-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff3f6c" />
                <stop offset="100%" stopColor="#ff6f43" />
              </linearGradient>
            </defs>
            <path d="M15,85 L40,20 L60,60 L85,20 L85,85 L70,85 L70,45 L55,75 L45,75 L20,30 L20,85 Z" fill="url(#logoGrad)" />
          </svg>
          <div className="logo-text">Myntra<span>Rank</span></div>
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
                    onClick={() => setActiveCategory(cat)}
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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Header Actions & Mode Toggle */}
        <div className="header-actions">
          <div className="toggle-mode-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: devMode ? 'var(--myntra-brand)' : 'var(--myntra-secondary)' }}>
              Developer View
            </span>
            <button 
              className={`dev-switch ${devMode ? 'active' : ''}`}
              onClick={() => setDevMode(!devMode)}
              title="Toggle Developer View to customize weights and export JSON raw list"
              style={{
                width: '44px',
                height: '22px',
                borderRadius: '11px',
                backgroundColor: devMode ? 'var(--myntra-brand)' : '#ccc',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s',
                padding: '2px'
              }}
            >
              <div 
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: devMode ? '24px' : '2px',
                  transition: 'left 0.2s'
                }}
              />
            </button>
          </div>

          {devMode && (
            <button className="btn btn-outline" style={{ padding: '8px 12px', fontSize: '11px' }} onClick={() => setShowJsonModal(true)}>
              Export JSON
            </button>
          )}
        </div>
      </header>

      {/* SubHeader Metrics Bar */}
      <div className="stats-subheader">
        <div>
          Search results: <strong>{finalSortedProducts.length}</strong> items
          {searchQuery && <span> for "<strong>{searchQuery}</strong>"</span>}
        </div>
        
        {devMode && (
          <div className="stats-pills">
            <div className="stats-pill" title="Precomputed Elasticsearch Index Document Count">
              Index Size: <span className="metric">{searchResult.candidateCount} docs</span>
            </div>
            <div className="stats-pill" title="Query execution time (retrieving precomputed scores)">
              Elasticsearch Query: <span className="metric" style={{ color: 'var(--myntra-green)' }}>{searchResult.queryTime}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="main-layout">
        
        {/* Left Sidebar Filter & Weight Controls */}
        <aside className="sidebar">
          
          {/* Developer Weight Controls */}
          {devMode ? (
            <div className="sidebar-section">
              <div className="sidebar-title">
                <span>Ranking Weights</span>
                <button 
                  onClick={resetWeights} 
                  style={{ background: 'none', border: 'none', color: 'var(--myntra-brand)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                >
                  RESET
                </button>
              </div>
              
              <div className="weight-control-group">
                <div className="weight-control">
                  <div className="weight-label-row">
                    <span>Authenticity</span>
                    <span className="weight-percentage">{getPercentageWeight(weights.weightAuthenticity)}%</span>
                  </div>
                  <div className="weight-desc">Penalizes copy-paste reviews & rating spikes</div>
                  <div className="slider-container">
                    <input 
                      type="range" min="0" max="1" step="0.05" className="slider"
                      value={weights.weightAuthenticity} 
                      onChange={(e) => handleWeightChange("weightAuthenticity", e.target.value)}
                    />
                  </div>
                </div>

                <div className="weight-control">
                  <div className="weight-label-row">
                    <span>Sentiment Quality</span>
                    <span className="weight-percentage">{getPercentageWeight(weights.weightSentiment)}%</span>
                  </div>
                  <div className="weight-desc">Favors positive reviews using NLP sentiment</div>
                  <div className="slider-container">
                    <input 
                      type="range" min="0" max="1" step="0.05" className="slider"
                      value={weights.weightSentiment} 
                      onChange={(e) => handleWeightChange("weightSentiment", e.target.value)}
                    />
                  </div>
                </div>

                <div className="weight-control">
                  <div className="weight-label-row">
                    <span>Verified Purchase</span>
                    <span className="weight-percentage">{getPercentageWeight(weights.weightVerified)}%</span>
                  </div>
                  <div className="weight-desc">Multiplies the score of verified buyer reviews</div>
                  <div className="slider-container">
                    <input 
                      type="range" min="0" max="1" step="0.05" className="slider"
                      value={weights.weightVerified} 
                      onChange={(e) => handleWeightChange("weightVerified", e.target.value)}
                    />
                  </div>
                </div>

                <div className="weight-control">
                  <div className="weight-label-row">
                    <span>Review Richness</span>
                    <span className="weight-percentage">{getPercentageWeight(weights.weightRichness)}%</span>
                  </div>
                  <div className="weight-desc">Favors long reviews with image attachments</div>
                  <div className="slider-container">
                    <input 
                      type="range" min="0" max="1" step="0.05" className="slider"
                      value={weights.weightRichness} 
                      onChange={(e) => handleWeightChange("weightRichness", e.target.value)}
                    />
                  </div>
                </div>

                <div className="weight-control">
                  <div className="weight-label-row">
                    <span>Recency Decay</span>
                    <span className="weight-percentage">{getPercentageWeight(weights.weightRecency)}%</span>
                  </div>
                  <div className="weight-desc">Gives higher weight to recent reviews</div>
                  <div className="slider-container">
                    <input 
                      type="range" min="0" max="1" step="0.05" className="slider"
                      value={weights.weightRecency} 
                      onChange={(e) => handleWeightChange("weightRecency", e.target.value)}
                    />
                  </div>
                </div>

                <div className="weight-control">
                  <div className="weight-label-row">
                    <span>Base Rating</span>
                    <span className="weight-percentage">{getPercentageWeight(weights.weightRating)}%</span>
                  </div>
                  <div className="weight-desc">Standard star rating value of genuine reviews</div>
                  <div className="slider-container">
                    <input 
                      type="range" min="0" max="1" step="0.05" className="slider"
                      value={weights.weightRating} 
                      onChange={(e) => handleWeightChange("weightRating", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Customer summary sidebar detailing the E-Commerce Review Filter
            <div className="sidebar-section" style={{ borderBottom: '1px solid var(--myntra-border)', paddingBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--myntra-brand)', fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>🛡️</span> Trust Audit Active
              </div>
              <p style={{ fontSize: '12px', color: 'var(--myntra-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Ratings are audited to exclude fake/bot spam and unverified purchase floods.
              </p>
            </div>
          )}

          {/* Engine Parameters */}
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

          {/* Interactive Systems Dashboard (Only visible when Dev View active) */}
          {devMode && (
            <section className="diagnostics-section">
              <div className="diagnostics-header">
                <span className="diagnostics-title">⚙️ Distributed System Diagnostics & Bot Simulator</span>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={resetSystem}>
                  Reset Pipeline
                </button>
              </div>

              {/* System Architecture Diagram */}
              <div className="system-diagram">
                <div className={`diagram-node ${!dbStateClean ? 'active' : ''}`} style={{ borderColor: !dbStateClean ? 'var(--myntra-red)' : '' }}>
                  <div className="diagram-node-title">Database</div>
                  <span>DynamoDB Raw</span>
                  <div style={{ fontSize: '9px', marginTop: '2px', color: !dbStateClean ? 'var(--myntra-red)' : 'var(--myntra-secondary)' }}>
                    {!dbStateClean ? '⚠️ State Dirty' : '✓ Synced'}
                  </div>
                </div>

                <div className="diagram-arrow"></div>

                <div className={`diagram-node ${isProcessing ? 'active' : ''}`}>
                  <div className="diagram-node-title">Batch Worker</div>
                  <span>Apache Spark</span>
                  <div style={{ fontSize: '9px', marginTop: '2px', color: isProcessing ? 'var(--myntra-brand)' : 'var(--myntra-secondary)' }}>
                    {isProcessing ? '⚡ Auditing...' : 'Idle'}
                  </div>
                </div>

                <div className="diagram-arrow"></div>

                <div className="diagram-node" style={{ borderColor: 'var(--myntra-green)' }}>
                  <div className="diagram-node-title">Search Index</div>
                  <span>Elasticsearch</span>
                  <div style={{ fontSize: '9px', marginTop: '2px', color: 'var(--myntra-green)' }}>
                    {searchResult.candidateCount} docs cached
                  </div>
                </div>

                <div className="diagram-arrow"></div>

                <div className="diagram-node" style={{ borderColor: '#3b82f6' }}>
                  <div className="diagram-node-title">Query Client</div>
                  <span>Query Engine</span>
                  <div style={{ fontSize: '9px', marginTop: '2px', color: '#3b82f6' }}>
                    Rank speed: {searchResult.queryTime}ms
                  </div>
                </div>
              </div>

              {/* Simulation triggers */}
              <div className="sim-actions">
                <button className="btn btn-inject" onClick={triggerSpamInjection}>
                  💥 Inject Bot Spam Attack
                </button>
                <button 
                  className={`btn btn-spark ${isProcessing ? 'running' : ''}`} 
                  onClick={triggerSparkBatchJob}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing Batch Job...' : '🔄 Run Spark Batch Job'}
                </button>
              </div>

              {/* Terminal log console */}
              <div className="console-container">
                <div className="console-header">
                  <span>Spark Console Terminal Logs</span>
                  <span>Cluster Status: ACTIVE</span>
                </div>
                <div className="console-body">
                  {consoleLogs.map((log, index) => {
                    let logClass = "log-info";
                    if (log.includes("[WARN]")) logClass = "log-warn";
                    else if (log.includes("[ERROR]")) logClass = "log-error";
                    else if (log.includes("[SUCCESS]")) logClass = "log-success";
                    
                    return (
                      <div key={index} className={`console-log ${logClass}`}>
                        {log}
                      </div>
                    );
                  })}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </section>
          )}

          {/* Clean, single-row toggle banner */}
          <div 
            className="filter-toggle-banner" 
            style={{
              background: filterLowReviews 
                ? 'linear-gradient(135deg, rgba(255, 63, 108, 0.02) 0%, rgba(255, 111, 67, 0.02) 100%)' 
                : '#ffffff',
              border: filterLowReviews ? '1px solid var(--myntra-brand)' : '1px solid var(--myntra-border)',
              borderRadius: '8px',
              padding: '12px 20px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: filterLowReviews ? '0 2px 10px rgba(255, 63, 108, 0.02)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', color: filterLowReviews ? 'var(--myntra-brand)' : 'var(--myntra-secondary)' }}>🛡️</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--myntra-dark)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Hide products with less than 10 reviews
              </span>
            </div>
            <button
              className="btn"
              onClick={() => setFilterLowReviews(!filterLowReviews)}
              style={{
                backgroundColor: filterLowReviews ? 'var(--myntra-brand)' : '#282c3f',
                color: '#fff',
                fontSize: '11px',
                padding: '8px 16px',
                borderRadius: '4px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: filterLowReviews ? '0 3px 8px rgba(255, 63, 108, 0.2)' : 'none'
              }}
            >
              {filterLowReviews ? "Turn Off" : "Turn On"}
            </button>
          </div>

          <div className="toolbar">
            <div className="results-count">
              Ranked Products <span>(Showing verified products sorted by trust score)</span>
            </div>

            <div className="sort-container">
              <span>Sort by</span>
              <select className="sort-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="rank">⭐ Recommended (Trust Score)</option>
                <option value="rating">★ Customer Rating (Raw Average)</option>
                <option value="price-asc">₹ Price: Low to High</option>
                <option value="price-desc">₹ Price: High to Low</option>
              </select>
            </div>
          </div>

          {finalSortedProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No Products Match Your Criteria</div>
              <div className="empty-state-subtitle">
                Try modifying your search query, selecting a different category, or toggling off "Remove Fake-Review Products".
              </div>
            </div>
          ) : (
            <div className="product-grid">
              {finalSortedProducts.map((product, index) => {
                const genuineStars = Math.round(product.averageGenuineRating * 10) / 10;
                
                return (
                  <div 
                    key={product.id} 
                    className="product-card"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {/* Rank Indicator */}
                    <div className="rank-badge">{index + 1}</div>

                    {/* Fake Ribbon */}
                    {!removeSuspicious && product.isFlaggedAsFake && (
                      <div className="fake-ribbon" style={{ backgroundColor: 'var(--myntra-red)' }}>SUSPICIOUS</div>
                    )}

                    {/* Product Image */}
                    <div className="card-img-container">
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="product-img" 
                        loading="lazy" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&q=80";
                        }}
                      />
                      
                      {/* Ratings Pill */}
                      <div className="rating-badge">
                        <span>{genuineStars}</span>
                        <StarIcon />
                        <span className="rating-count">{product.totalReviewsCount}</span>
                      </div>
                    </div>

                    {/* Card Description */}
                    <div className="card-details">
                      <div className="card-brand">{product.brand}</div>
                      <div className="card-title">{product.title.replace(product.brand, '').trim()}</div>
                      
                      <div className="card-price-row">
                        <span className="price-current">₹{product.price}</span>
                        <span className="price-original">₹{product.originalPrice}</span>
                        <span className="discount-badge">({product.discountPercent}% OFF)</span>
                      </div>
                    </div>

                    {/* Hover Stats Panel (Dynamic view based on devMode) */}
                    <div className="hover-info-panel">
                      {devMode ? (
                        <div className="metric-bar-group">
                          <div className="metric-bar-row">
                            <span className="metric-bar-label">Authenticity</span>
                            <span className="metric-bar-value">{Math.round(product.authenticityScore * 100)}%</span>
                          </div>
                          <div className="metric-progress-bg">
                            <div 
                              className="metric-progress-fill" 
                              style={{ 
                                width: `${product.authenticityScore * 100}%`,
                                backgroundColor: product.authenticityScore < 0.65 ? 'var(--myntra-red)' : 'var(--myntra-brand)'
                              }}
                            ></div>
                          </div>

                          <div className="metric-bar-row">
                            <span className="metric-bar-label">Sentiment</span>
                            <span className="metric-bar-value">{Math.round(product.sentimentScore * 100)}%</span>
                          </div>
                          <div className="metric-progress-bg">
                            <div className="metric-progress-fill sentiment" style={{ width: `${product.sentimentScore * 100}%` }}></div>
                          </div>

                          <div className="metric-bar-row">
                            <span className="metric-bar-label">Relevance</span>
                            <span className="metric-bar-value">{Math.round(product.relevanceScore * 100)}%</span>
                          </div>
                          <div className="metric-progress-bg">
                            <div className="metric-progress-fill relevance" style={{ width: `${product.relevanceScore * 100}%` }}></div>
                          </div>

                          <div className="ranking-score-summary" style={{ marginTop: '8px' }}>
                            <span>Engine Score:</span>
                            <span className="score">{(product.finalRankingScore).toFixed(4)}</span>
                          </div>
                        </div>
                      ) : (
                        // Clean visual text for shopper
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center', padding: '5px 0' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: product.isFlaggedAsFake ? 'var(--myntra-red)' : 'var(--myntra-green)' }}>
                            {product.isFlaggedAsFake ? "⚠️ Review Warning" : "✓ Trusted Choice"}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--myntra-secondary)' }}>
                            {product.isFlaggedAsFake ? "Manipulated review pattern detected" : `${Math.round(product.authenticityScore * 100)}% authentic reviewer feedback`}
                          </span>
                        </div>
                      )}
                      
                      <div className="hover-action-text" style={{ fontSize: '11px', padding: '6px 0', marginTop: '4px' }}>
                        View Review Insights
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Review Intelligence Drawer */}
      <div 
        className={`drawer-backdrop ${selectedProduct ? "open" : ""}`}
        onClick={() => setSelectedProduct(null)}
      />
      
      <div className={`drawer ${selectedProduct ? "open" : ""}`}>
        {selectedProduct && (
          <>
            <div className="drawer-header">
              <div className="drawer-title-row">
                <span className="drawer-brand">{selectedProduct.brand}</span>
                <span className="drawer-title">{selectedProduct.title}</span>
              </div>
              <button className="drawer-close" onClick={() => setSelectedProduct(null)}>×</button>
            </div>

            <div className="drawer-content">
              
              {/* Shopper-Friendly Score Breakdown Card */}
              <div className="intelligence-summary-card" style={{ backgroundColor: selectedProduct.isFlaggedAsFake ? '#fdf2f2' : '#f4faf6', border: '1px solid', borderColor: selectedProduct.isFlaggedAsFake ? '#fcd2d2' : '#def7ec', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div 
                    style={{ 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      textTransform: 'uppercase',
                      backgroundColor: selectedProduct.isFlaggedAsFake ? 'var(--myntra-red)' : 'var(--myntra-green)',
                      color: '#fff'
                    }}
                  >
                    {getAuthenticityFeedback(selectedProduct.authenticityScore, selectedProduct.isFlaggedAsFake).badge}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: selectedProduct.isFlaggedAsFake ? 'var(--myntra-red)' : 'var(--myntra-dark)' }}>
                    Review Health Summary
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#535665', lineHeight: '1.4' }}>
                  {getAuthenticityFeedback(selectedProduct.authenticityScore, selectedProduct.isFlaggedAsFake).text}
                </p>
              </div>

              {/* Genuine Star Rating Recalculator */}
              <div className="comparison-stars-container" style={{ margin: '0 0 20px', padding: '15px 0' }}>
                <div className="star-comp-box">
                  <span className="star-comp-label">Standard Star Rating</span>
                  <div className="star-comp-rating">
                    {selectedProduct.rawAvgRating.toFixed(2)}
                    <span className="out-of">/5</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--myntra-secondary)' }}>
                    Based on all {selectedProduct.totalReviewsCount} reviews
                  </div>
                </div>
                
                <div className="star-comp-box" style={{ borderLeft: '1px solid var(--myntra-border)', paddingLeft: '25px' }}>
                  <span className="star-comp-label" style={{ color: 'var(--myntra-green)' }}>Verified Genuine Rating</span>
                  <div className="star-comp-rating" style={{ color: 'var(--myntra-green)' }}>
                    {selectedProduct.averageGenuineRating.toFixed(2)}
                    <span className="out-of">/5</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--myntra-green)', fontWeight: '600' }}>
                    Calculated from {selectedProduct.genuineCount} verified reviews
                  </div>
                </div>
              </div>

              {/* Developer Technical Section (Only visible when Dev View toggle is checked) */}
              {devMode && (
                <div style={{ marginBottom: '25px', backgroundColor: '#fafbfc', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--myntra-secondary)', marginBottom: '12px' }}>
                    ⚙️ Technical Engine Signals (Developer Only)
                  </div>
                  
                  <div className="radar-score-grid" style={{ gap: '12px', marginBottom: '0' }}>
                    <div className="radar-score-card" style={{ padding: '10px' }}>
                      <div className="radar-score-header">
                        <span className="radar-score-name">Auth Score</span>
                        <span className="radar-score-val">{Math.round(selectedProduct.authenticityScore * 100)}%</span>
                      </div>
                      <div className="metric-progress-bg">
                        <div className="metric-progress-fill" style={{ width: `${selectedProduct.authenticityScore * 100}%`, backgroundColor: selectedProduct.authenticityScore < 0.65 ? 'var(--myntra-red)' : 'var(--myntra-brand)' }}></div>
                      </div>
                    </div>

                    <div className="radar-score-card" style={{ padding: '10px' }}>
                      <div className="radar-score-header">
                        <span className="radar-score-name">NLP Sentiment</span>
                        <span className="radar-score-val">{Math.round(selectedProduct.sentimentScore * 100)}%</span>
                      </div>
                      <div className="metric-progress-bg">
                        <div className="metric-progress-fill" style={{ width: `${selectedProduct.sentimentScore * 100}%`, backgroundColor: 'var(--myntra-green)' }}></div>
                      </div>
                    </div>

                    <div className="radar-score-card" style={{ padding: '10px' }}>
                      <div className="radar-score-header">
                        <span className="radar-score-name">Verified Buy</span>
                        <span className="radar-score-val">{Math.round(selectedProduct.verifiedRatio * 100)}%</span>
                      </div>
                      <div className="metric-progress-bg">
                        <div className="metric-progress-fill" style={{ width: `${selectedProduct.verifiedRatio * 100}%`, backgroundColor: '#fd7e14' }}></div>
                      </div>
                    </div>

                    <div className="radar-score-card" style={{ padding: '10px' }}>
                      <div className="radar-score-header">
                        <span className="radar-score-name">Richness</span>
                        <span className="radar-score-val">{Math.round(selectedProduct.richnessScore * 100)}%</span>
                      </div>
                      <div className="metric-progress-bg">
                        <div className="metric-progress-fill" style={{ width: `${selectedProduct.richnessScore * 100}%`, backgroundColor: '#3b82f6' }}></div>
                      </div>
                    </div>

                    <div className="radar-score-card" style={{ padding: '10px' }}>
                      <div className="radar-score-header">
                        <span className="radar-score-name">Recency Decay</span>
                        <span className="radar-score-val">{Math.round(selectedProduct.recencyScore * 100)}%</span>
                      </div>
                      <div className="metric-progress-bg">
                        <div className="metric-progress-fill" style={{ width: `${selectedProduct.recencyScore * 100}%`, backgroundColor: '#6f42c1' }}></div>
                      </div>
                    </div>

                    <div className="radar-score-card" style={{ padding: '10px' }}>
                      <div className="radar-score-header">
                        <span className="radar-score-name">Relevance</span>
                        <span className="radar-score-val">{Math.round(selectedProduct.relevanceScore * 100)}%</span>
                      </div>
                      <div className="metric-progress-bg">
                        <div className="metric-progress-fill" style={{ width: `${selectedProduct.relevanceScore * 100}%`, backgroundColor: '#20c997' }}></div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--myntra-secondary)', textAlign: 'right', fontFamily: 'monospace' }}>
                    Combined Score: {selectedProduct.finalRankingScore.toFixed(6)}
                  </div>
                </div>
              )}

              {/* Reviewer Feedback Detail Summary */}
              <div className="drawer-section-title">Verified Buyer Sentiment</div>
              <p style={{ fontSize: '13px', color: '#535665', lineHeight: '1.4', marginBottom: '20px' }}>
                {getSentimentFeedback(selectedProduct.sentimentScore)}
              </p>

              {/* Reviews listing inside drawer */}
              <div className="drawer-section-title">Customer Reviews ({selectedProduct.reviews.length})</div>
              
              <div className="drawer-reviews-list">
                {selectedProduct.reviews.map((review) => {
                  return (
                    <div 
                      key={review.id} 
                      className={`drawer-review-card ${review.isSuspicious ? "flagged" : ""}`}
                      style={{
                        opacity: !devMode && review.isSuspicious ? 0.45 : 1
                      }}
                    >
                      <div className="review-card-header">
                        <div className="review-user-row">
                          <span>{review.reviewerName}</span>
                          {review.verified && <span className="review-verified-badge"><CheckIcon /> Verified Buyer</span>}
                          
                          {review.isDuplicate && (
                            <span className="review-flag-badge">
                              {devMode ? "⚠️ Duplicate Content" : "⚠️ Flagged Review"}
                            </span>
                          )}
                          {review.isSpiked && !review.isDuplicate && (
                            <span className="review-flag-badge">
                              {devMode ? "⚠️ Velocity Spike" : "⚠️ Flagged Review"}
                            </span>
                          )}
                        </div>
                        <span className="review-date">{formatDate(review.date)}</span>
                      </div>

                      <div className="review-stars-row">
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <StarIcon 
                            key={starNum} 
                            filled={starNum <= review.rating} 
                            className={`review-star ${starNum <= review.rating ? "filled" : ""}`} 
                          />
                        ))}
                      </div>

                      <p className="review-text" style={{ textDecoration: review.isSuspicious && !devMode ? 'line-through' : 'none' }}>
                        {review.text}
                      </p>

                      {review.images && review.images.length > 0 && (
                        <div className="review-images-row">
                          {review.images.map((imgUrl, imgIdx) => (
                            <img key={imgIdx} src={imgUrl} alt="Review attachment" className="review-img" />
                          ))}
                        </div>
                      )}

                      {/* Display calculations only in devMode */}
                      {devMode && (
                        <div className="review-metrics-row">
                          <span className="review-metric-pill">
                            Sentiment: <span>{Math.round(review.sentiment * 100)}%</span>
                          </span>
                          <span className="review-metric-pill">
                            Richness: <span>{Math.round(review.richness * 100)}%</span>
                          </span>
                          <span className="review-metric-pill">
                            Decay: <span>{review.recency.toFixed(2)}x</span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </>
        )}
      </div>

      {/* Raw JSON modal for copy-paste export (Only triggerable in devMode) */}
      {showJsonModal && (
        <div className="json-modal-backdrop" onClick={() => setShowJsonModal(false)}>
          <div className="json-modal" onClick={(e) => e.stopPropagation()}>
            <div className="json-modal-header">
              <span className="json-modal-title">Top 500 Ranked Products (Raw JSON Output)</span>
              <button className="json-modal-close" onClick={() => setShowJsonModal(false)}>×</button>
            </div>
            
            <div className="json-modal-content">
              <div style={{ fontSize: '12px', color: 'var(--myntra-secondary)', marginBottom: '10px' }}>
                Copy the raw text below to retrieve only the top 500 products sorted by score, with no descriptions or explanations.
              </div>
              <textarea 
                className="json-textarea" 
                readOnly 
                value={rawExportJson}
                onClick={(e) => e.target.select()}
              />
            </div>

            <div className="json-modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  navigator.clipboard.writeText(rawExportJson);
                  alert("Copied to clipboard!");
                }}
              >
                Copy to Clipboard
              </button>
              <button className="btn btn-primary" onClick={() => setShowJsonModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
