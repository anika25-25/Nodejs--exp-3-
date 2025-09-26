// Enhanced error handler for booking system
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request format',
      details: err.message
    });
  }
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      details: err.message
    });
  }
  
  // Handle timeout errors
  if (err.code === 'TIMEOUT') {
    return res.status(408).json({
      success: false,
      error: 'Request timeout',
      details: 'The operation took too long to complete'
    });
  }
  
  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({ 
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;