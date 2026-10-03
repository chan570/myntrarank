export function validateReviewInput(req, res, next) {
  const { productId, rating, text, verified } = req.body;

  if (!productId || typeof productId !== 'string' || !productId.trim()) {
    return res.status(400).json({ status: 'error', message: 'productId must be a non-empty string' });
  }

  if (rating === undefined || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ status: 'error', message: 'rating must be a whole number between 1 and 5' });
  }

  if (!text || typeof text !== 'string' || text.trim().length < 5 || text.trim().length > 2000) {
    return res.status(400).json({ status: 'error', message: 'text must be 5 to 2000 characters' });
  }

  if (verified !== undefined && typeof verified !== 'boolean') {
    return res.status(400).json({ status: 'error', message: 'verified must be a boolean' });
  }

  if (verified === true) {
    return res.status(400).json({ status: 'error', message: 'Purchase verification is not available in this demo' });
  }

  next();
}
