//errorHandler
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}`, err);
  
// Prisma specific errors (Database)
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired, please login again'
    });
  }

  // Axios errors (external API failures)
  if (err.isAxiosError) {
    return res.status(502).json({
      success: false,
      message: 'Failed to fetch data from external platform',
      detail: err.message
    });
  }

  // validation errors (from Joi)
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: err.details[0].message.replace(/['"]/g, '')
    });
  }

  // default
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

//notFound
const notFound = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
};

module.exports = {notFound,errorHandler};