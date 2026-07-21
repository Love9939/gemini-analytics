const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { isbot } = require('isbot');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const path = require('path');
const { clickhouse, initDB } = require('./db');
require('dotenv').config();

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.text());
app.use(express.static(path.join(__dirname, 'public')));

// --- Memory Buffer for Batch Inserts ---
let hitBuffer = [];

async function flushHits() {
  if (hitBuffer.length === 0) return;
  const batch = [...hitBuffer];
  hitBuffer = [];
  try {
    await clickhouse.insert({
      table: 'pageviews',
      values: batch,
      format: 'JSONEachRow',
    });
    console.log(`[Batch] Flushed ${batch.length} hits to ClickHouse.`);
  } catch (error) {
    console.error("Batch insert failed:", error);
    hitBuffer.push(...batch);
  }
}
setInterval(flushHits, 5000);

function getDailySalt() {
  const dateStr = new Date().toISOString().split('T')[0]; 
  return crypto.createHash('sha256').update(dateStr + (process.env.SECRET_SALT || 'salt')).digest('hex');
}

function generateVisitorId(ip, userAgent, websiteId) {
  const data = `${getDailySalt()}|${ip}|${userAgent}|${websiteId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateSessionId(visitorId) {
  const msIn30Mins = 30 * 60 * 1000;
  const timeBlock = Math.floor(Date.now() / msIn30Mins);
  return crypto.createHash('sha256').update(`${visitorId}|${timeBlock}`).digest('hex');
}

// --- Endpoints ---

app.post('/api/hit', (req, res) => {
  res.status(204).end();

  try {
    const userAgent = req.headers['user-agent'] || '';
    if (isbot(userAgent)) return;

    const ip = req.ip;
    
    let payload;
    if (typeof req.body === 'string') {
      try { payload = JSON.parse(req.body); } catch(e) { payload = {}; }
    } else {
      payload = req.body;
    }

    const { 
      website_id = 1, url = '/', referrer = '', 
      language = '', screen_width = 0, screen_height = 0,
      utm_source = '', utm_medium = '', utm_campaign = '' 
    } = payload;
    
    const urlObj = new URL(url, 'http://localhost'); 
    const url_path = urlObj.pathname;

    const visitor_id = generateVisitorId(ip, userAgent, website_id);
    const session_id = generateSessionId(visitor_id);

    const uaParsed = new UAParser(userAgent);
    const browser = uaParsed.getBrowser().name || '';
    const os = uaParsed.getOS().name || '';
    const device_type = uaParsed.getDevice().type || 'desktop';

    const geo = geoip.lookup(ip);
    const country = geo ? geo.country : '';
    const region = geo ? geo.region : '';
    const city = geo ? geo.city : '';

    hitBuffer.push({
      website_id: parseInt(website_id, 10) || 1,
      visitor_id,
      session_id,
      url_path,
      referrer,
      browser,
      os,
      device_type,
      country,
      city,
      region,
      language,
      screen_width: parseInt(screen_width, 10) || 0,
      screen_height: parseInt(screen_height, 10) || 0,
      utm_source,
      utm_medium,
      utm_campaign
    });
  } catch (err) {
    console.error('Error processing hit:', err);
  }
});

// Overall Stats Header
app.get('/api/stats', async (req, res) => {
  try {
    const resultSet = await clickhouse.query({
      query: `
        SELECT 
          COUNT(*) as total_pageviews,
          uniqExact(visitor_id) as unique_visitors,
          uniqExact(session_id) as total_sessions,
          -- Bounce Rate: (Sessions with only 1 pageview) / (Total Sessions)
          countIf(session_id, session_id IN (
            SELECT session_id FROM pageviews GROUP BY session_id HAVING count(*) = 1
          )) / nullIf(uniqExact(session_id), 0) * 100 as bounce_rate,
          -- Avg Session Duration (Seconds)
          avg(session_duration) as avg_session_duration
        FROM (
          SELECT 
            session_id, 
            visitor_id,
            max(created_at) - min(created_at) as session_duration
          FROM pageviews
          GROUP BY session_id, visitor_id
        ) t
        CROSS JOIN pageviews
      `,
      format: 'JSONEachRow',
    });
    const dataset = await resultSet.json();
    res.json(dataset[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Chart Data (Grouped by Day)
app.get('/api/chart', async (req, res) => {
  try {
    const resultSet = await clickhouse.query({
      query: `
        SELECT 
          toDate(created_at) as date,
          COUNT(*) as pageviews,
          uniqExact(visitor_id) as unique_visitors,
          uniqExact(session_id) as total_sessions
        FROM pageviews
        WHERE created_at >= now() - INTERVAL 30 DAY
        GROUP BY date
        ORDER BY date ASC
      `,
      format: 'JSONEachRow',
    });
    const dataset = await resultSet.json();
    res.json(dataset);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Complex Breakdowns Route
app.get('/api/breakdowns', async (req, res) => {
  try {
    const queryList = [
      { name: 'pages', col: 'url_path' },
      { name: 'referrers', col: 'referrer' },
      { name: 'sources', col: 'utm_source' },
      { name: 'mediums', col: 'utm_medium' },
      { name: 'campaigns', col: 'utm_campaign' },
      { name: 'countries', col: 'country' },
      { name: 'regions', col: 'region' },
      { name: 'cities', col: 'city' },
      { name: 'languages', col: 'language' },
      { name: 'os', col: 'os' },
      { name: 'browsers', col: 'browser' },
      { name: 'platforms', col: 'device_type' }
    ];

    const results = {};
    for (const q of queryList) {
      const resultSet = await clickhouse.query({
        query: `
          SELECT 
            ${q.col} as name,
            COUNT(*) as views,
            uniqExact(visitor_id) as visitors
          FROM pageviews
          WHERE ${q.col} != ''
          GROUP BY ${q.col}
          ORDER BY visitors DESC, views DESC
          LIMIT 10
        `,
        format: 'JSONEachRow',
      });
      results[q.name] = await resultSet.json();
    }
    
    // Screens logic (width x height)
    const screensResultSet = await clickhouse.query({
      query: `
        SELECT 
          concat(toString(screen_width), 'x', toString(screen_height)) as name,
          COUNT(*) as views,
          uniqExact(visitor_id) as visitors
        FROM pageviews
        WHERE screen_width > 0
        GROUP BY name
        ORDER BY visitors DESC, views DESC
        LIMIT 10
      `,
      format: 'JSONEachRow',
    });
    results.screens = await screensResultSet.json();

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Fallback to serving the dashboard
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, async () => {
  console.log(`Analytics server running on port ${PORT}`);
  await initDB();
});
