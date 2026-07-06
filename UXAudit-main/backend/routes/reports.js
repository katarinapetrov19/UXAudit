const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const { requireFields } = require('../middleware/validate');

// Record a scan (for limits)
router.post('/record', auth, async (req, res, next) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    
    const scanCount = db.prepare('SELECT count FROM scan_counts WHERE user_id = ? AND month = ?').get(req.user.id, month);
    const currentCount = scanCount ? scanCount.count : 0;

    if (req.user.plan === 'free' && currentCount >= config.free_scan_limit) {
      return res.status(403).json({ error: 'Monthly scan limit reached' });
    }

    if (scanCount) {
      db.prepare('UPDATE scan_counts SET count = count + 1 WHERE user_id = ? AND month = ?').run(req.user.id, month);
    } else {
      db.prepare('INSERT INTO scan_counts (user_id, month, count) VALUES (?, ?, 1)').run(req.user.id, month);
    }

    res.json({ success: true, count: currentCount + 1 });
  } catch (err) {
    next(err);
  }
});

// Save a report
router.post('/', auth, requireFields(['url', 'issues']), async (req, res, next) => {
  try {
    if (req.user.plan === 'free') {
      return res.status(403).json({ error: 'Saving reports is only available for Pro and Agency plans' });
    }

    const { url, issues } = req.body;

    const reportId = uuidv4();
    db.prepare('INSERT INTO reports (id, user_id, url, issues_json) VALUES (?, ?, ?, ?)')
      .run(reportId, req.user.id, url, JSON.stringify(issues));

    res.status(201).json({ id: reportId, url, created_at: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// List reports
router.get('/', auth, async (req, res, next) => {
  try {
    if (req.user.plan === 'free') {
      return res.status(403).json({ error: 'Listing reports is only available for Pro and Agency plans' });
    }

    const reports = db.prepare('SELECT id, url, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

// Get report
router.get('/:id', auth, async (req, res, next) => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: report.id,
      url: report.url,
      issues: JSON.parse(report.issues_json),
      created_at: report.created_at
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
