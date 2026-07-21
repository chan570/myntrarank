import React from 'react';
import { Search, Star, ShoppingBag, Heart } from 'lucide-react';

export const SearchIcon = ({ className = "search-icon" }) => (
  <Search className={className} size={18} />
);

export const StarIcon = ({ className = "star-icon" }) => (
  <Star className={className} size={12} fill="#10b981" color="#10b981" style={{ minWidth: '12px', minHeight: '12px', display: 'inline-block' }} />
);

export const BagIcon = () => (
  <ShoppingBag size={20} />
);

export const HeartIcon = () => (
  <Heart size={20} />
);
