/**
 * BACKEND DATABASE SEEDER DATA GENERATOR
 * Generates initial seed data (1,100 products & 27,000+ reviews) to populate MongoDB on initial startup.
 */

function createRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const pickRandom = (arr, rng) => arr[Math.floor(rng() * arr.length)];

const images = {
  mens: [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80",
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80",
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&q=80"
  ],
  womens: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80"
  ],
  kids: [
    "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&q=80",
    "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&q=80",
    "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&q=80"
  ],
  footwear: [
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80"
  ],
  accessories: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
    "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=400&q=80",
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80"
  ]
};

const brands = [
  "Nike", "Adidas", "Puma", "Zara", "H&M", "Roadster", "Levis", "Wrogn", 
  "Allen Solly", "Biba", "Fabindia", "Casio", "Fossil", "Wildcraft", 
  "Jack & Jones", "Mango", "ONLY", "Vero Moda"
];

const categoryTypes = [
  { name: "Men's Apparel", tags: ["men", "shirt", "apparel"], imgKey: "mens", items: ["Slim Fit Casual Shirt", "Classic Denim Shirt", "Premium Cotton Polo", "Solid Crewneck T-shirt", "Checked Flannel Shirt", "Cargo Jogger Pants", "Slim Fit Chinos", "Lightweight Hooded Jacket", "Cable Knit Sweater"] },
  { name: "Women's Apparel", tags: ["women", "dress", "apparel"], imgKey: "womens", items: ["Floral Maxi Dress", "A-Line Summer Dress", "High-Rise Skinny Jeans", "Relaxed Fit Cotton Kurta", "Embroidered Anarkali Suit", "Crop Top & Skirt Set", "Oversized Denim Jacket", "Solid Trench Coat", "Casual Cotton T-shirt"] },
  { name: "Footwear", tags: ["shoes", "sneakers", "footwear"], imgKey: "footwear", items: ["Retro Leather Sneakers", "Running Cushion Shoes", "Casual Canvas Slip-ons", "Formal Brogue Leather Shoes", "Strappy Block Heels", "Sporty Gym Trainers", "Classic Chelsea Boots"] },
  { name: "Accessories", tags: ["watch", "bag", "accessory"], imgKey: "accessories", items: ["Minimalist Analog Watch", "Smart Fitness Band", "Leather Crossbody Bag", "Travel Duffel Bag", "Classic Aviator Sunglasses", "Sleek Leather Wallet", "Premium Cologne Spray"] },
  { name: "Kids' Wear", tags: ["kids", "children", "apparel"], imgKey: "kids", items: ["Cotton Printed Playsuit", "Denim Dungarees", "Graphic Crewneck Sweatshirt", "Unisex School Backpack", "Comfort Velcro Sneakers", "Striped Polo T-shirt"] }
];

const reviewReviewers = [
  "Amit Sharma", "Priya Patel", "Rahul Gupta", "Neha Singh", "Vikram Reddy", "Anjali Bose",
  "Siddharth Rao", "Divya Nair", "Rohan Verma", "Sneha Joshi", "John Doe", "Jane Smith",
  "Alex Mercer", "Sara Connor", "Michael Scott", "Dwight Schrute", "Pam Beesly", "Jim Halpert",
  "Arjun Malhotra", "Riya Sen", "Deepak Kumar", "Sunita Rao", "Kunal Shah", "Pooja Hegde"
];

const positivePhrases = [
  "The fabric is absolutely amazing!",
  "It is extremely comfortable to wear.",
  "It looks very premium and stylish.",
  "It exceeded my expectations completely.",
  "The fitting is perfect and snug.",
  "The material is very soft, lightweight, and breathable.",
  "The color is exactly as shown in the pictures.",
  "The stitching is clean and high-quality.",
  "Shipping was super fast and packaging was neat.",
  "I highly recommend it to everyone looking for value.",
  "It is definitely worth the price paid.",
  "Perfect for both casual wear and parties.",
  "Washes well without any color bleeding.",
  "The details on this are superb.",
  "Fits true to size, no complaints!"
];

const negativePhrases = [
  "The fabric feels very cheap and thin.",
  "It is highly uncomfortable to wear for long hours.",
  "It looks quite different and dull compared to the photos.",
  "The fit is terrible, way too loose in the shoulders.",
  "The size runs much smaller than standard charts.",
  "The material faded significantly after the first wash.",
  "The stitching started coming apart within two days.",
  "Shipping took forever and the box was completely damaged.",
  "It is definitely overpriced for this low quality.",
  "I would suggest ordering one or two sizes up.",
  "The zipper is stuck and feels like it will break.",
  "Smells strongly of industrial chemicals.",
  "Color bled all over my other clothes in the wash.",
  "Not recommended at all, very disappointed.",
  "The buttons feel extremely loose."
];

export function generateProducts() {
  const products = [];
  const currentTimestamp = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i <= 1100; i++) {
    const rng = createRandom(i * 12345);
    const categoryObj = pickRandom(categoryTypes, rng);
    const brand = pickRandom(brands, rng);
    const itemBase = pickRandom(categoryObj.items, rng);
    const title = `${brand} ${itemBase}`;
    const description = `High-quality ${itemBase.toLowerCase()} from ${brand} offering exceptional comfort, durability, and modern styling.`;
    
    const categoryImages = images[categoryObj.imgKey];
    const image = categoryImages[Math.floor(rng() * categoryImages.length)];
    
    const price = Math.floor(rng() * 4000) + 499;
    const discountPercent = Math.floor(rng() * 60) + 10;
    const originalPrice = Math.floor(price / (1 - discountPercent / 100));

    let numReviews = Math.floor(rng() * 45) + 12;
    let isSuspicious = false;
    let anomalyType = null;

    if (i % 25 === 0) {
      numReviews = Math.floor(rng() * 10);
      anomalyType = "low_review_count";
    } else if (i % 33 === 0) {
      isSuspicious = true;
      anomalyType = "duplicate_reviews";
    } else if (i % 40 === 0) {
      isSuspicious = true;
      anomalyType = "review_spike";
    } else if (i % 50 === 0) {
      isSuspicious = true;
      anomalyType = "perfect_rating_no_variance";
    }

    const reviews = [];
    if (anomalyType === "duplicate_reviews") {
      const duplicateText = "Amazing fit and excellent premium quality fabric. Highly recommended, must buy!";
      for (let r = 0; r < 12; r++) {
        reviews.push({
          id: `rev-${i}-dup-${r}`,
          reviewerName: pickRandom(reviewReviewers, rng),
          rating: 5,
          text: duplicateText,
          verified: false,
          date: currentTimestamp - (Math.floor(rng() * 3) * dayInMs),
          images: []
        });
      }
    } else if (anomalyType === "review_spike") {
      const spikeDate = currentTimestamp - 5 * dayInMs;
      for (let r = 0; r < 22; r++) {
        reviews.push({
          id: `rev-${i}-spike-${r}`,
          reviewerName: pickRandom(reviewReviewers, rng),
          rating: 5,
          text: pickRandom(positivePhrases, rng) + " Best product ever.",
          verified: false,
          date: spikeDate,
          images: []
        });
      }
    } else if (anomalyType === "perfect_rating_no_variance") {
      for (let r = 0; r < 25; r++) {
        reviews.push({
          id: `rev-${i}-perf-${r}`,
          reviewerName: pickRandom(reviewReviewers, rng),
          rating: 5,
          text: pickRandom(["good", "nice", "very good", "excellent", "love it", "perfect fit"], rng),
          verified: false,
          date: currentTimestamp - Math.floor(rng() * 120) * dayInMs,
          images: []
        });
      }
    }

    for (let r = reviews.length; r < numReviews; r++) {
      reviews.push(generateSingleReview(rng, currentTimestamp, dayInMs));
    }

    products.push({
      id: `prod-${i}`,
      title,
      brand,
      description,
      image,
      price,
      originalPrice,
      discountPercent,
      category: categoryObj.name,
      tags: [...categoryObj.tags, brand.toLowerCase(), itemBase.toLowerCase()],
      reviews,
      anomalyType,
      isSuspicious
    });
  }

  return products;
}

function generateSingleReview(rng, currentTimestamp, dayInMs) {
  const roll = rng();
  const rating = roll < 0.5 ? 5 : roll < 0.8 ? 4 : roll < 0.9 ? 3 : roll < 0.97 ? 2 : 1;
  const phrases = rating >= 4 ? positivePhrases : negativePhrases;
  let text = pickRandom(phrases, rng);
  if (rng() < 0.4) text += " " + pickRandom(phrases, rng);

  const ageDays = Math.floor(Math.pow(rng(), 2.5) * 365);
  return {
    id: `rev-${Math.floor(rng() * 100000000)}`,
    reviewerName: pickRandom(reviewReviewers, rng),
    rating,
    text,
    verified: rng() < 0.8,
    date: currentTimestamp - (ageDays * dayInMs),
    images: rating >= 3 && text.length > 50 && rng() < 0.12 ? ["https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=150&q=80"] : []
  };
}
