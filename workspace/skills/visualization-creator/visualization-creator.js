// 【召唤视觉】Summon Vision - 可视化创建

/**
 * 可视化创建技能
 * 生成图表和可视化代码
 */

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

// 图表类型
const CHART_TYPES = {
  bar: { name: '柱状图', html: 'Chart.js' },
  line: { name: '折线图', html: 'Chart.js' },
  pie: { name: '饼图', html: 'Chart.js' },
  scatter: { name: '散点图', html: 'Chart.js' },
  table: { name: '表格', html: 'HTML Table' }
};

// 初始化状态
function initState() {
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ chart_count: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

// 生成HTML图表
function createChart(data, options = {}) {
  const type = options.type || 'bar';
  const title = options.title || '数据可视化';
  const width = options.width || 600;
  const height = options.height || 400;
  
  const labels = data.labels || [];
  const values = data.values || [];
  
  // 生成Chart.js配置
  const chartConfig = {
    type,
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        backgroundColor: generateColors(labels.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: true, text: title }
      }
    }
  };
  
  // 生成完整HTML
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    .container { max-width: ${width}px; margin: 20px auto; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <canvas id="myChart"></canvas>
  </div>
  <script>
    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, ${JSON.stringify(chartConfig, null, 2)});
  </script>
</body>
</html>`;
  
  return {
    success: true,
    chartType: CHART_TYPES[type]?.name || type,
    title,
    html,
    dataPoints: labels.length
  };
}

// 生成表格HTML
function createTable(data, options = {}) {
  const headers = data.headers || [];
  const rows = data.rows || [];
  const title = options.title || '数据表格';
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    tr:hover { background-color: #ddd; }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('\n      ')}
    </tbody>
  </table>
</body>
</html>`;
  
  return {
    success: true,
    title,
    html,
    rowCount: rows.length,
    columnCount: headers.length
  };
}

// 生成颜色数组
function generateColors(count) {
  const colors = [
    'rgba(255, 99, 132, 0.6)',
    'rgba(54, 162, 235, 0.6)',
    'rgba(255, 206, 86, 0.6)',
    'rgba(75, 192, 192, 0.6)',
    'rgba(153, 102, 255, 0.6)',
    'rgba(255, 159, 64, 0.6)'
  ];
  
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

// 生成数据摘要视图
function createDashboard(data, options = {}) {
  const metrics = data.metrics || [];
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>数据看板</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric-label { color: #666; font-size: 14px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #333; }
    .metric-change { font-size: 12px; color: ${options.upIsGreen ? '#4CAF50' : '#f44336'}; }
  </style>
</head>
<body>
  <h1>${options.title || '数据看板'}</h1>
  <div class="dashboard">
    ${metrics.map(m => `
    <div class="card">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value}</div>
      ${m.change ? `<div class="metric-change">${m.change}</div>` : ''}
    </div>`).join('')}
  </div>
</body>
</html>`;
  
  return {
    success: true,
    html,
    metricCount: metrics.length
  };
}

// 导出
module.exports = {
  createChart,
  createTable,
  createDashboard,
  CHART_TYPES,
  getStats: () => initState()
};
