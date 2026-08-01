# plaryu Frontend

React (Vite) frontend for the plaryu plastic lifecycle tracking platform,
consuming the Spring Boot backend (`plaryu-backend`).

## What's built

- **Login / Register page** (`/`) — role selection (Manufacturer, Retailer,
  Consumer, Recycler) + email/password, matching the original Figma design
- **AuthContext** — stores the JWT + user info in localStorage, attaches
  the token to every API request automatically via an axios interceptor
- **Dashboard** (`/dashboard`, protected route) — shows:
  - Stat cards (total batches, total weight tracked, circularity rate)
  - Live batch ledger table with status badges and a "Verify chain" button
    per row (hits the hash-chain integrity check on the backend)
  - Role-specific action panel:
    - Manufacturer → mint a new batch
    - Wholesaler/Retailer/Consumer → transfer a batch forward
    - Recycler → close the recycling loop, issue a certificate

## Running it

1. Make sure the backend (`plaryu-backend`) is running on `http://localhost:8080`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:5173`

## Not built yet

- Wholesaler role isn't in the original 4-role Figma design — currently
  folded into the generic "transfer" panel shown to Wholesaler/Retailer/
  Consumer. Decide if it needs its own registration option.
- No dedicated "consumer discard" flow (marking a product as ready for
  collection) — currently just uses the generic transfer form
- No charts/analytics page (the donut chart from the Figma mockup) — the
  dashboard currently shows simple stat cards instead
- No deployment config yet (Vercel is the natural choice once ready)
- Styling is a clean functional pass matching the Figma's light/teal theme,
  not a pixel-exact recreation
