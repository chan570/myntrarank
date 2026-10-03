const DEMO_IMAGES = {
  tops: [
    'https://images.unsplash.com/photo-1561872726-bd3a5497939f?auto=format&fit=crop&w=760&q=80',
    'https://images.unsplash.com/photo-1565753872647-91a08dc96986?auto=format&fit=crop&w=760&q=80',
    'https://images.unsplash.com/photo-1491438685042-6e6d559f350a?auto=format&fit=crop&w=760&q=80',
  ],
  dresses: [
    'https://images.unsplash.com/photo-1541657333963-d31b55f58de1?auto=format&fit=crop&w=760&q=80',
    'https://images.unsplash.com/photo-1511130558090-00af810c21b1?auto=format&fit=crop&w=760&q=80',
  ],
  bottoms: [
    'https://images.unsplash.com/photo-1573531790266-9edcea1f8132?auto=format&fit=crop&w=760&q=80',
    'https://images.unsplash.com/photo-1491438685042-6e6d559f350a?auto=format&fit=crop&w=760&q=80',
  ],
  jackets: [
    'https://images.unsplash.com/photo-1609269342027-d1598b8ef8b5?auto=format&fit=crop&w=760&q=80',
    'https://images.unsplash.com/photo-1545911825-6bfa5b0c34a9?auto=format&fit=crop&w=760&q=80',
  ],
  intimate: [
    'https://images.unsplash.com/photo-1541657333963-d31b55f58de1?auto=format&fit=crop&w=760&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1561872726-bd3a5497939f?auto=format&fit=crop&w=760&q=80',
  ],
};
const PUBLIC_BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export function getProductImage(product, demoOnly = false) {
  const image = product?.image;
  // The source dataset has no product photos. Use representative Unsplash
  // fashion photos and keep the local category art as a no-network fallback.
  if (!demoOnly && image && !image.endsWith('/clothing-placeholder.svg') && image !== '/clothing-placeholder.svg') return image;
  const category = `${product?.category || ''} ${product?.brand || ''} ${product?.title || ''}`.toLowerCase();
  const imageKey = Object.keys(DEMO_IMAGES).find((key) => key !== 'default' && category.includes(key));
  const choices = DEMO_IMAGES[imageKey] || DEMO_IMAGES.default;
  if (demoOnly) {
    const fallbackKey = imageKey === 'intimate' ? 'intimates' : imageKey === 'jackets' ? 'jackets' : imageKey || 'tops';
    return `${PUBLIC_BASE}demo-images/${fallbackKey}.svg`;
  }
  const stableId = String(product?.id || product?.title || '').split('').reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
  return choices[stableId % choices.length];
}
