const { clickhouse } = require('./db.js');
async function run() {
  try {
    const resultSet = await clickhouse.query({
      query: 'SELECT COUNT(*) as total_pageviews, uniqExact(visitor_id) as unique_visitors, uniqExact(session_id) as total_sessions FROM pageviews',
      format: 'JSONEachRow',
    });
    const dataset = await resultSet.json();
    console.log(dataset);
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  }
}
run();
