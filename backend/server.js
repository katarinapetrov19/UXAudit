require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');

const app = express();
const PORT = config.port || 3000;

// Middleware
app.use(cors());

// Serve landing page at root
const landingDir = path.resolve(__dirname, '..', 'landing');
app.use(express.static(landingDir));

// Webhook handling - MUST be before any other body parser
const stripeRoutes = require('./routes/stripe');
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), stripeRoutes.webhookHandler);

// Standard body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/status', require('./routes/status'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api', stripeRoutes.router); // Covers /create-checkout and /portal

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
const { notFound, errorHandler } = require('./middleware/error');
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UXCheck Backend listening on port ${PORT}`);
  });
}

module.exports = app;
