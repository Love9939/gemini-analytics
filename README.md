# Gemini Analytics 🚀

An open-source, privacy-first, cookieless web analytics engine built from scratch to clone the sleek aesthetic and powerful aggregation of Pirsch Analytics.

This backend receives tracking payloads, processes them, stores them in a high-performance ClickHouse Cloud database, and serves a beautiful dark-mode dashboard for real-time visualization.

## Architecture Stack

*   **Database:** ClickHouse (Optimized for real-time analytics and massive datasets)
*   **Backend Server:** Node.js + Express
*   **Frontend Dashboard:** Vanilla HTML/CSS/JS (Lightweight, fast, 100% Pirsch UI clone)
*   **Geospatial Tracking:** `geoip-lite` (Resolves IPs to Countries, Regions, and Cities)
*   **Device Parsing:** `ua-parser-js` (Extracts OS, Browser, Platform, and Device Types)
*   **Bot Protection:** `isbot` (Filters out crawler traffic for accurate human metrics)

## Features

*   **Cookieless Tracking:** Uses a 1-way hashing algorithm (`IP + User-Agent + Daily Salt`) to generate unique anonymous visitor IDs without relying on cookies. GDPR compliant.
*   **Batch Processing:** Tracker payloads are buffered in memory and flushed to ClickHouse every 5 seconds to reduce database strain under high load.
*   **Dynamic Breakdowns:** Real-time aggregation of UTM campaigns, Referrers, Geolocation, Screen sizes, and Devices.
*   **Advanced Metrics:** SQL logic for complex session metrics (e.g., Bounce Rate, Average Session Duration).

## Environment Variables

To run this server locally or in production (e.g. Render.com), you need the following variables in a `.env` file:

```env
# ClickHouse Cloud Connection
CLICKHOUSE_HOST=https://your-clickhouse-host-url.aws.clickhouse.cloud:8443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_super_secret_password

# Analytics Privacy Salt
SECRET_SALT=put_any_random_string_here_like_1a2b3c
```

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server (which automatically initializes the ClickHouse tables if they don't exist):
   ```bash
   node server.js
   ```
3. Visit `http://localhost:3000` to see your dashboard!

## Frontend Tracker Integration

To send data to this server, include the `tracker.js` file in your frontend application (e.g., React, Next.js, Vanilla HTML) and ensure the script runs on every page load.

```html
<script src="/tracker.js" defer></script>
```

*Note: Make sure to update the `ANALYTICS_ENDPOINT` variable inside `tracker.js` to point to your live production server (e.g., `https://gemini-analytics.onrender.com/api/hit`).*

## Production Deployment (Render)

1. Connect this GitHub repository to a new **Web Service** on Render.com.
2. Set the Build Command to `npm install`.
3. Set the Start Command to `node server.js`.
4. Add the 4 Environment Variables listed above.
5. Deploy! Render will keep the Node server running 24/7.
