const jwt = require('jsonwebtoken');
const { getCache, buildTokenBlacklistKey } = require('../services/redis');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check Redis token blacklist for revoked/logged-out tokens
    const isBlacklisted = await getCache(buildTokenBlacklistKey(token));
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked (user logged out)' });
    }

    // JWT verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;

module.exports = authMiddleware;