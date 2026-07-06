const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const config = require('../config');

router.get('/', auth, async (req, res, next) => {
  try {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    let scanCount = db.prepare('SELECT count FROM scan_counts WHERE user_id = ? AND month = ?').get(req.user.id, month);
    const currentCount = scanCount ? scanCount.count : 0;
    
    let remaining = 'unlimited';
    if (req.user.plan === 'free') {
      remaining = Math.max(0, config.free_scan_limit - currentCount);
    }

    res.json({
      user_id: req.user.id,
      email: req.user.email,
      plan: req.user.plan,
      subscription_status: req.user.subscription_status,
      api_key: req.user.api_key,
      scans_this_month: currentCount,
      remaining_scans: remaining
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
