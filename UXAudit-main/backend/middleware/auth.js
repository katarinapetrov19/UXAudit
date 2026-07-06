const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt_secret);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } else if (apiKeyHeader) {
    const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKeyHeader);
    if (!user) return res.status(401).json({ error: 'Invalid API key' });
    req.user = user;
    return next();
  }

  res.status(401).json({ error: 'Authentication required' });
};
