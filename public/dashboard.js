let chartInstance = null;

async function loadDashboard() {
  await Promise.all([
    loadStats(),
    loadChart(),
    loadBreakdowns()
  ]);
}

async function loadStats() {
  const res = await fetch('/api/stats');
  const data = await res.json();
  
  document.getElementById('val-unique-visitors').innerText = data.unique_visitors || 0;
  document.getElementById('val-pageviews').innerText = data.total_pageviews || 0;
  document.getElementById('val-sessions').innerText = data.total_sessions || 0;
  
  const bounce = parseFloat(data.bounce_rate) || 0;
  document.getElementById('val-bounce-rate').innerText = bounce.toFixed(0) + '%';
  
  const duration = parseFloat(data.avg_session_duration) || 0;
  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  document.getElementById('val-session-duration').innerText = 
    duration < 60 ? `${secs}s` : `${mins}m ${secs}s`;
}

async function loadChart() {
  const res = await fetch('/api/chart');
  const data = await res.json();

  const labels = data.map(d => d.date);
  const values = data.map(d => parseInt(d.unique_visitors, 10));

  const ctx = document.getElementById('mainChart').getContext('2d');
  
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Unique Visitors',
        data: values,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0f0f11',
        pointBorderColor: '#22c55e',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { 
          grid: { color: '#27272a', drawBorder: false },
          ticks: { color: '#8b8b93' }
        },
        y: { 
          grid: { color: '#27272a', drawBorder: false },
          ticks: { color: '#8b8b93', precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

function renderList(containerId, data) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = '<div style="color:#8b8b93;text-align:center;padding:20px;">No Data</div>';
    return;
  }

  const maxViews = Math.max(...data.map(d => parseInt(d.views, 10)));

  data.forEach(item => {
    const views = parseInt(item.views, 10);
    const width = Math.max(2, (views / maxViews) * 100);
    
    const row = document.createElement('div');
    row.className = 'row-item';
    row.innerHTML = `
      <div class="row-bar" style="width: ${width}%"></div>
      <div class="row-label">${item.name || 'Unknown'}</div>
      <div class="row-stats">${item.visitors} <span style="color:#4b4b53;font-size:11px;">(${views})</span></div>
    `;
    container.appendChild(row);
  });
}

async function loadBreakdowns() {
  const res = await fetch('/api/breakdowns');
  const data = await res.json();

  renderList('list-pages', data.pages);
  renderList('list-referrers', data.referrers);
  renderList('list-sources', data.sources);
  renderList('list-countries', data.countries);
  renderList('list-os', data.os);
}

// Initialize
loadDashboard();
