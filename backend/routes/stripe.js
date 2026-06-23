const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const config = require('../config');
const stripe = require('stripe')(config.stripe_secret_key || 'sk_test_placeholder');

const { requireFields } = require('../middleware/validate');

// POST /api/create-checkout
router.post('/create-checkout', auth, requireFields(['plan']), async (req, res, next) => {
  const { plan } = req.body; // 'pro' or 'agency'
  
  const priceId = plan === 'agency' ? config.agency_price_id : config.pro_price_id;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: req.user.stripe_customer_id || undefined,
      customer_email: req.user.stripe_customer_id ? undefined : req.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}/cancel`,
      metadata: {
        userId: req.user.id,
        plan: plan
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// GET /api/portal
router.get('/portal', auth, async (req, res, next) => {
  if (!req.user.stripe_customer_id) {
    return res.status(400).json({ error: 'No active subscription found' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripe_customer_id,
      return_url: req.headers.origin || 'http://localhost:3000',
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// Webhook handler
const webhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || config.stripe_webhook_secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = session.metadata.userId;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const plan = session.metadata.plan;

      db.prepare('UPDATE users SET stripe_customer_id = ?, subscription_id = ?, plan = ?, subscription_status = ? WHERE id = ?')
        .run(customerId, subscriptionId, plan, 'active', userId);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscriptionId = session.id;
      const status = session.status;
      const plan = status === 'active' ? (session.items.data[0].price.id === config.agency_price_id ? 'agency' : 'pro') : 'free';

      db.prepare('UPDATE users SET plan = ?, subscription_status = ? WHERE subscription_id = ?')
        .run(plan, status, subscriptionId);
      break;
    }
  }

  res.json({ received: true });
};

module.exports = {
  router,
  webhookHandler
};
