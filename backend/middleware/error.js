exports.notFound = (req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Method ${req.method} on ${req.url} is not defined`
  });
};

exports.errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};
