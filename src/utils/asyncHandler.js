/**
 * Async error handler wrapper
 * Catches async errors and passes them to Express error handler
 * Prevents unhandled promise rejections
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
