import { SearchIcon } from './Icons';

export function Header({
  searchQuery,
  setSearchQuery,
  onSearch,
  user,
  openAuth,
  onLogout,
  isLoading,
  resetToHome,
}) {
  return (
    <header className="trust-header">
      <a href="/" className="trust-brand" onClick={resetToHome} aria-label="TrustRank home">
        <span className="trust-brand-mark">T</span>
        <span>trust<span>rank</span></span>
      </a>

      <form className="trust-search" onSubmit={(event) => { event.preventDefault(); onSearch(searchQuery); }}>
        <SearchIcon />
        <input
          type="search"
          aria-label="Search clothing products"
          placeholder="Try “dress”, “top” or “jeans”…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search and show all products"
            title="Clear search"
            onClick={resetToHome}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
        {isLoading ? <span className="search-progress" aria-label="Searching" /> : (
          <button type="submit" className="search-submit">Search</button>
        )}
      </form>

      <div className="trust-account-actions">
        {user ? (
          <>
            <span className="account-greeting">Hi, {user.name.split(' ')[0]}</span>
            <button type="button" className="account-button account-button-quiet" onClick={onLogout}>Sign out</button>
          </>
        ) : (
          <>
            <button type="button" className="account-button account-button-quiet" onClick={() => openAuth('login')}>Sign in</button>
            <button type="button" className="account-button account-button-primary" onClick={() => openAuth('register')}>Create account</button>
          </>
        )}
      </div>

    </header>
  );
}

export default Header;
