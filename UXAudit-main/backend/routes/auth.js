const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');

const { requireFields } = require('../middleware/validate');

// Register
router.post('/register', requireFields(['email', 'password']), async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = `ux_${uuidv4().replace(/-/g, '')}`;
    const userId = uuidv4();

    const insert = db.prepare('INSERT INTO users (id, email, password, api_key) VALUES (?, ?, ?, ?)');
    insert.run(userId, email, hashedPassword, apiKey);

    res.status(201).json({ id: userId, email, api_key: apiKey });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(err);
  }
});

// Login
router.post('/login', requireFields(['email', 'password']), async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, config.jwt_secret, { expiresIn: '24h' });

    res.json({ token, user: { id: user.id, email: user.email, plan: user.plan, api_key: user.api_key } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
