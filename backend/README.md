# UXCheck Backend API

Backend for the UXCheck browser extension, handling authentication, scan limits, and Stripe subscriptions.

## Features
- JWT and API Key Authentication
- Stripe Subscription Management (Pro/Agency tiers)
- Monthly scan limit enforcement
- UX Audit report storage
- Integration test suite with Supertest and Jest

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   Required variables:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key.
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret.
   - `JWT_SECRET`: Secret for signing JWT tokens.
   - `PRO_PRICE_ID`: Stripe Price ID for the Pro plan.
   - `AGENCY_PRICE_ID`: Stripe Price ID for the Agency plan.

3. Start the server:
   ```bash
   npm start
   ```

## Development & Testing

- **Run tests**:
  ```bash
  npm test
  ```
- **Local testing**:
  Use `tests/test_api.js` for a quick end-to-end sanity check (requires server running on port 3000).

## Production Hardening

- **Security**: 
  - Express middleware for CORS is enabled.
  - Authentication required for all sensitive endpoints.
  - Error handling middleware prevents leaking stack traces in production.
- **Error Handling**:
  - Centralized error handler in `middleware/error.js`.
  - Proper 404 handling for undefined routes.
  - Request validation helpers in `middleware/validate.js`.
- **Configuration**:
  - Prefers environment variables over `config.json` values.
  - Uses `dotenv` to load local configuration.

## Deployment Instructions

1. **Environment**: Ensure all variables in `.env.example` are set in your production environment.
2. **Database**: The app uses SQLite by default. Ensure the `database.sqlite` file is in a persistent volume if deploying via containers. Set `DB_PATH` to customize the location.
3. **Port**: The app listens on `0.0.0.0` and defaults to port 3000. Use the `PORT` env var to change this.
4. **Stripe Webhooks**: Point your Stripe webhook listener to `https://your-domain.com/api/webhook/stripe`.

## API Endpoints

### Authentication
- `POST /api/auth/register`
  - Body: `{ "email": "...", "password": "..." }`
- `POST /api/auth/login`
  - Body: `{ "email": "...", "password": "..." }`

### User Status
- `GET /api/status`
  - Headers: `Authorization: Bearer <token>` OR `x-api-key: <api_key>`

### Scans & Reports
- `POST /api/reports/record`
  - Records a scan for limit tracking.
- `POST /api/reports` (Pro/Agency only)
  - Body: `{ "url": "...", "issues": [...] }`
- `GET /api/reports` (Pro/Agency only)
- `GET /api/reports/:id`

### Stripe Integration
- `POST /api/create-checkout`
  - Body: `{ "plan": "pro" }` or `{ "plan": "agency" }`
- `GET /api/portal`
- `POST /api/webhook/stripe` (Webhook listener)
