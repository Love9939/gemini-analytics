const { clickhouse } = require('./db.js');
async function run() {
  try {
    const rs = await clickhouse.query({
      query: 'SELECT toDate(created_at) as date, COUNT(*) as pageviews, uniqExact(visitor_id) as visitors FROM pageviews WHERE created_at >= now() - INTERVAL 30 DAY GROUP BY date ORDER BY date ASC',
      format: 'JSONEachRow',
    });
    console.log("Chart:", await rs.json());
    
    const rs2 = await clickhouse.query({
      query: 'SELECT url_path as name, COUNT(*) as views, uniqExact(visitor_id) as visitors FROM pageviews WHERE url_path != \'\' GROUP BY url_path ORDER BY views DESC LIMIT 10',
      format: 'JSONEachRow',
    });
    console.log("Breakdowns:", await rs2.json());
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  }
}
run();
