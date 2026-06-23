const config = require('./config.json');

module.exports = {
  port: process.env.PORT || config.port || 3000,
  free_scan_limit: parseInt(process.env.FREE_SCAN_LIMIT || config.free_scan_limit || 5, 10),
  pro_price_id: process.env.PRO_PRICE_ID || config.pro_price_id,
  agency_price_id: process.env.AGENCY_PRICE_ID || config.agency_price_id,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || config.stripe_webhook_secret,
  jwt_secret: process.env.JWT_SECRET || config.jwt_secret || 'uxcheck_secret_key'
};
