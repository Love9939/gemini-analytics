# The Development Journey

This document serves as a chronicle of how this privacy-first, cookieless analytics engine was conceptualized, built, and deployed from scratch to mirror the enterprise capabilities of Pirsch Analytics.

## 1. The Goal
The objective was to build a full-stack, real-time analytics dashboard for an e-commerce store (`choudhary-vastralya`) without using third-party services like Google Analytics. We wanted complete data ownership, cookieless tracking (GDPR compliant), and a beautiful dark-mode UI inspired by Pirsch.

## 2. Architecture & Setup
We chose a high-performance stack capable of handling heavy event-streaming workloads:
- **Database:** ClickHouse (The industry standard for real-time analytics)
- **Backend:** Node.js with Express
- **Frontend (Dashboard):** Vanilla JS and CSS for maximum performance and a lightweight footprint.
- **Hosting:** ClickHouse Cloud (Database) and Render.com (Backend API)

## 3. Building the Tracking Engine
We built a custom frontend tracker (`tracker.js`) that is injected into the React application. 
- It hooks into the browser's `history.pushState` and `popstate` events to track pageviews on Single Page Applications (SPAs) without full page reloads.
- It extracts screen dimensions, language, referrers, and UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`) directly from the URL and browser APIs.
- It uses `navigator.sendBeacon()` to reliably send payloads to our backend even when the user is closing the tab.

## 4. Building the Node.js Backend
The backend (`server.js`) processes the raw payloads:
- **Privacy First (Cookieless):** We used Node's `crypto` module to generate a unique, anonymous visitor ID by hashing the user's IP Address, User-Agent, and a daily rotating Salt. This tracks unique visitors without ever setting a cookie or storing PII.
- **Data Enrichment:** We integrated `geoip-lite` to resolve IP addresses into Countries, Regions, and Cities, and `ua-parser-js` to extract detailed OS, Browser, and Device Types from the User-Agent string.
- **Bot Filtering:** The `isbot` library was added to silently drop crawler/bot traffic, keeping the metrics clean.
- **High-Performance Batching:** Instead of hammering the ClickHouse database with an `INSERT` for every single pageview, we built an in-memory buffer array (`hitBuffer`). The server batches all hits and uses `setInterval` to flush them to ClickHouse in bulk every 5 seconds.

## 5. ClickHouse Database Design
We designed a `MergeTree` table in ClickHouse optimized for analytical queries:
- **Schema:** UUIDs, URL paths, Geospatial data, Devices, and UTMs.
- **Analytics Queries:** We wrote complex SQL queries in `/api/breakdowns` to dynamically calculate:
  - Total Pageviews & Unique Visitors
  - Bounce Rate (Sessions with exactly 1 pageview)
  - Average Session Duration (Time difference between first and last event in a session)
  - Grouped breakdowns for top Pages, Referrers, Locations, and Devices.

## 6. The UI/UX Clone
We reverse-engineered the aesthetics of the Pirsch dashboard:
- Hand-crafted `style.css` using exact hex codes (`#17171a` cards, `#0f0f11` background, `#22c55e` accents).
- Integrated `Chart.js` for the main responsive time-series graph.
- Built a 2-column grid to display interactive breakdown metrics (Pages, Sources, Countries, OS).

## 7. Deployment
- The ClickHouse database was deployed to a managed **ClickHouse Cloud** instance in the AWS Mumbai region.
- The Node.js application was deployed as an always-on Web Service on **Render.com**.
- Environment variables (`CLICKHOUSE_HOST`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `SECRET_SALT`) were securely configured in the Render dashboard.
- We discovered and patched a critical bug where the server initialized with `DROP TABLE IF EXISTS`, ensuring production data is never wiped on server restarts.

## 8. Frontend Integration
Finally, we integrated the engine into the main React e-commerce site:
- Added `<script src="/tracker.js" defer></script>` to the `index.html`.
- Updated the Content-Security-Policy (CSP) `connect-src` to explicitly whitelist our new Render URL.
- Deployed the updated React frontend to Vercel, completing the full-stack data pipeline!
