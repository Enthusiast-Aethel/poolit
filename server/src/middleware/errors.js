export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 doesn't catch async errors, so we wrap every handler
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res) =>
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });

export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  if (["ValidationError", "CastError"].includes(err.name) || err.code === 11000) status = 400;
  if (status === 500) console.error(err);
  res.status(status).json({ message: err.message });
};