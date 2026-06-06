// Seedable random number generator for deterministic product & review data
function createRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const random = createRandom(42);

// Curated highly-reliable Unsplash images for clothing and fashion categories to resemble Myntra
const images = {
  mens: [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80", // shirt
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80", // suit
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80", // jacket
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80", // white t-shirt
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&q=80", // denim jacket
    "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=400&q=80"  // chinos
  ],
  womens: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80", // dress
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80", // yellow outfit
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80", // summer hat
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80", // dress red
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80", // luxury outfit
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80"  // suit pink
  ],
  kids: [
    "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&q=80", // kid sweater
    "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&q=80", // kid style
    "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&q=80", // kids
    "https://images.unsplash.com/photo-1622244099803-75318257a1dd?w=400&q=80"  // kid shirt
  ],
  footwear: [
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80", // brown sneakers
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", // red sneaker
    "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80", // green nike
    "https://images.unsplash.com/photo-1525966222434-6ad5334a44d8?w=400&q=80", // vans
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80", // pastel airforce
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&q=80"  // boot
  ],
  accessories: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", // white watch
    "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=400&q=80", // watch black
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80", // red bag
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80", // beauty product
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80"  // shades
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

// Helper to get random item from list
const pickRandom = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// Procedural generator
export function generateProducts() {
  const products = [];
  const currentTimestamp = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  // Let's generate 1,100 products to ensure we easily cover the "top 500" requirement
  for (let i = 1; i <= 1100; i++) {
    const rng = createRandom(i * 12345); // Unique seed for each product to keep it deterministic
    
    const categoryObj = pickRandom(categoryTypes, rng);
    const brand = pickRandom(brands, rng);
    const itemBase = pickRandom(categoryObj.items, rng);
    const title = `${brand} ${itemBase}`;
    const description = `This high-quality ${itemBase.toLowerCase()} from ${brand} offers exceptional comfort, design, and styling. Perfect for everyday lifestyle and wardrobe upgrades. Crafted with care and durable materials.`;
    
    // Choose image
    const categoryImages = images[categoryObj.imgKey];
    const image = categoryImages[Math.floor(rng() * categoryImages.length)];
    
    // Price details
    const price = Math.floor(rng() * 4000) + 499;
    const discountPercent = Math.floor(rng() * 60) + 10; // 10% to 70% off
    const originalPrice = Math.floor(price / (1 - discountPercent / 100));

    // Reviews count
    let numReviews = Math.floor(rng() * 45) + 12; // 12 to 56 reviews (majority of products)
    
    // Anomaly/pattern inject:
    let isSuspicious = false;
    let anomalyType = null;

    if (i % 25 === 0) {
      // Product with very few reviews (<10 reviews, to be filtered out)
      numReviews = Math.floor(rng() * 10); // Generates 0 to 9 reviews (includes exactly 0!)
      anomalyType = "low_review_count";
    } else if (i % 33 === 0) {
      // Product with identical/duplicate fake reviews
      isSuspicious = true;
      anomalyType = "duplicate_reviews";
    } else if (i % 40 === 0) {
      // Product with a sudden review spike (velocity attack)
      isSuspicious = true;
      anomalyType = "review_spike";
    } else if (i % 50 === 0) {
      // Product with abnormal perfect rating distribution (flat 5 stars, unverified, short text)
      isSuspicious = true;
      anomalyType = "perfect_rating_no_variance";
    }

    const reviews = [];
    
    // Generate reviews
    if (anomalyType === "low_review_count") {
      for (let r = 0; r < numReviews; r++) {
        reviews.push(generateSingleReview(rng, currentTimestamp, dayInMs, false));
      }
    } else if (anomalyType === "duplicate_reviews") {
      // Generate some normal reviews
      for (let r = 0; r < 5; r++) {
        reviews.push(generateSingleReview(rng, currentTimestamp, dayInMs, true));
      }
      // Inject identical reviews
      const duplicateText = "Amazing fit and excellent premium quality fabric. Highly recommended, must buy!";
      const duplicateRating = 5;
      const duplicateDate = currentTimestamp - (Math.floor(rng() * 3) * dayInMs); // posted within 3 days
      for (let r = 0; r < 12; r++) {
        reviews.push({
          id: `rev-${i}-dup-${r}`,
          reviewerName: pickRandom(reviewReviewers, rng),
          rating: duplicateRating,
          text: duplicateText,
          verified: false, // Fake reviews are rarely verified
          date: duplicateDate,
          images: []
        });
      }
      // Add more normal reviews
      for (let r = 0; r < 10; r++) {
        reviews.push(generateSingleReview(rng, currentTimestamp, dayInMs, true));
      }
    } else if (anomalyType === "review_spike") {
      // Large group of reviews posted on the exact same day, all 5 stars, unverified
      const spikeDate = currentTimestamp - 5 * dayInMs; // 5 days ago
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
      // Add 4 older normal reviews
      for (let r = 0; r < 6; r++) {
        reviews.push(generateSingleReview(rng, currentTimestamp - 100 * dayInMs, dayInMs, true));
      }
    } else if (anomalyType === "perfect_rating_no_variance") {
      // All reviews are 5-star, unverified, very short phrases, no images
      for (let r = 0; r < 25; r++) {
        reviews.push({
          id: `rev-${i}-perf-${r}`,
          reviewerName: pickRandom(reviewReviewers, rng),
          rating: 5,
          text: pickRandom(["good", "nice", "very good", "excellent", "love it", "perfect fit", "recommended"], rng),
          verified: false,
          date: currentTimestamp - Math.floor(rng() * 120) * dayInMs,
          images: []
        });
      }
    } else {
      // Normal products: standard distribution of ratings (average rating around 3.5 - 4.8)
      for (let r = 0; r < numReviews; r++) {
        reviews.push(generateSingleReview(rng, currentTimestamp, dayInMs, true));
      }
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

// Generate a realistic single review
function generateSingleReview(rng, currentTimestamp, dayInMs, realisticRatings) {
  const reviewer = pickRandom(reviewReviewers, rng);
  
  // Decide rating
  let rating = 5;
  if (realisticRatings) {
    const roll = rng();
    if (roll < 0.5) rating = 5;       // 50% 5-star
    else if (roll < 0.8) rating = 4;  // 30% 4-star
    else if (roll < 0.9) rating = 3;  // 10% 3-star
    else if (roll < 0.97) rating = 2; // 7% 2-star
    else rating = 1;                  // 3% 1-star
  }

  // Sentiment phrases
  const phrases = rating >= 4 ? positivePhrases : negativePhrases;
  
  // Richness (longer text, sometimes multiple phrases)
  let text = pickRandom(phrases, rng);
  const detailRoll = rng();
  if (detailRoll < 0.4) {
    text += " " + pickRandom(phrases, rng);
  }
  if (detailRoll < 0.15) {
    text += " " + pickRandom(phrases, rng);
  }

  // Verified purchase (80% chance)
  const verified = rng() < 0.8;

  // Date (within last 365 days, exponential-like representation)
  // We cube rng() to skew it towards recent dates (since 1 - rng()^3 will be closer to 1, i.e., recent)
  const ageDays = Math.floor(Math.pow(rng(), 2.5) * 365);
  const date = currentTimestamp - (ageDays * dayInMs);

  // Review images (12% chance if text is long enough and rating is >= 3)
  const hasImages = rating >= 3 && text.length > 50 && rng() < 0.12;
  const reviewImages = hasImages 
    ? ["https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=150&q=80"] 
    : [];

  return {
    id: `rev-${Math.floor(rng() * 100000000)}`,
    reviewerName: reviewer,
    rating,
    text,
    verified,
    date,
    images: reviewImages
  };
}
