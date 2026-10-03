import { ProductCard } from './ProductCard';
import { getProductImage } from '../services/productImagery';

const categories = [
  { label: 'Dresses', value: 'Dresses', description: 'Everyday and occasion styles' },
  { label: 'Tops', value: 'Tops', description: 'Blouses, knits and more' },
  { label: 'Bottoms', value: 'Bottoms', description: 'Jeans, skirts and trousers' },
  { label: 'Jackets', value: 'Jackets', description: 'Layers for every day' },
  { label: 'Intimates', value: 'Intimate', description: 'Comfortable everyday essentials' },
];

export function HomePage({ products, isLoading, onChooseCategory, openProductDetail, hasReviewRiskSignals }) {
  return (
    <main className="home-page">
      <section className="home-intro">
        <span className="home-eyebrow">CLOTHING, CHOSEN WITH CONFIDENCE</span>
        <h1>Find a style you’ll love.</h1>
        <p>Search clothing and compare what customers say, with review details to help you choose.</p>
      </section>

      <section className="home-category-section" aria-labelledby="category-heading">
        <div className="home-section-heading">
          <div><span className="home-eyebrow">BROWSE THE COLLECTION</span><h2 id="category-heading">Shop by category</h2></div>
        </div>
        <div className="home-category-grid">
          {categories.map((category) => {
            const imageProduct = { id: `category-${category.value}`, category: category.value, title: category.label };
            return (
              <button className="home-category-card" key={category.value} type="button" onClick={() => onChooseCategory(category.value)}>
                <img
                  src={getProductImage(imageProduct)}
                  alt=""
                  loading="lazy"
                  onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getProductImage(imageProduct, true); }}
                />
                <span className="home-category-shade" />
                <span className="home-category-copy"><strong>{category.label}</strong><small>{category.description}</small><span>Explore category <b aria-hidden="true">→</b></span></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-featured-section" aria-labelledby="featured-heading">
        <div className="home-section-heading">
          <div><span className="home-eyebrow">CUSTOMER-REVIEWED DEMO PICKS</span><h2 id="featured-heading">A few pieces to explore</h2></div>
          <span className="home-demo-note">Example catalog · photos are representative</span>
        </div>
        {isLoading ? (
          <p className="home-loading-note">Loading clothing picks…</p>
        ) : products.length > 0 ? (
          <div className="product-grid trust-product-grid home-product-grid">
            {products.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} index={index} isRiskFlagged={hasReviewRiskSignals(product)} openProductDetail={openProductDetail} />)}
          </div>
        ) : (
          <p className="home-loading-note">The catalog is not available right now. Try again in a moment.</p>
        )}
      </section>

      <footer className="trust-footer home-footer"><span>TRUSTRANK</span><p>Demo catalog built from a public clothing review dataset. Photos are examples, not photos of the exact products.</p><span>CLOTHING REVIEW DEMO</span></footer>
    </main>
  );
}
