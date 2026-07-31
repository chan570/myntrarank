export function validateReviewInput(req, res, next) {
  const { productId, reviewerName, rating, text, verified } = req.body;

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ status: 'error', message: 'productId must be a non-empty string' });
  }

  if (!reviewerName || typeof reviewerName !== 'string') {
    return res.status(400).json({ status: 'error', message: 'reviewerName must be a non-empty string' });
  }

  if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ status: 'error', message: 'rating must be a number between 1 and 5' });
  }

  if (!text || typeof text !== 'string' || text.trim().length < 5) {
    return res.status(400).json({ status: 'error', message: 'text must be a string of at least 5 characters' });
  }

  if (verified !== undefined && typeof verified !== 'boolean') {
    return res.status(400).json({ status: 'error', message: 'verified must be a boolean' });
  }

  next();
}
