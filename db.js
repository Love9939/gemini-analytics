const { createClient } = require('@clickhouse/client');
require('dotenv').config();

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DATABASE || 'default',
});

async function initDB() {
  try {
    await clickhouse.exec({
      query: `DROP TABLE IF EXISTS pageviews`,
    });

    await clickhouse.exec({
      query: `
        CREATE TABLE IF NOT EXISTS pageviews (
          id UUID DEFAULT generateUUIDv4(),
          website_id UInt32,
          session_id String,
          visitor_id String,
          url_path String,
          referrer String,
          browser String,
          os String,
          device_type String,
          country String,
          city String,
          region String,
          language String,
          screen_width UInt16,
          screen_height UInt16,
          utm_source String,
          utm_medium String,
          utm_campaign String,
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (website_id, created_at, visitor_id);
      `,
    });
    console.log("ClickHouse database schema initialized.");
  } catch (error) {
    console.error('Failed to initialize ClickHouse schema:', error);
  }
}

module.exports = {
  clickhouse,
  initDB,
};
