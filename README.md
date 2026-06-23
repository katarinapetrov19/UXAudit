# UXCheck

UXCheck is a browser extension that instantly audits any live website for UX issues — accessibility violations (WCAG), contrast problems, heading hierarchy, ARIA/semantic errors, keyboard traps, and heuristic breakdowns.

## Project Structure

- `extension/`: Chrome/Firefox extension source code (Manifest V3).
- `backend/`: Node.js/Express API for authentication, user management, and Stripe integration.
- `landing/`: Marketing landing page.
- `store-submission/`: Extension packages and assets for store listing.

## Getting Started

### Backend

1. Navigate to `backend/`.
2. Install dependencies: `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Start the server: `npm start`.

### Extension

1. Open Chrome and go to `chrome://extensions/`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `extension/` folder.

## License

MIT
