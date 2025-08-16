const d3Presets = {
  mindMap: { type: 'd3', config: { width: 800, height: 600, nodeRadius: 6, fontSize: 12, charge: -120 } },
  ganttChart: { type: 'd3', config: { width: 900, height: 500, margin: { top: 20, right: 20, bottom: 30, left: 50 }, colors: ['#6baed6', '#9ecae1', '#c6dbef'] } },
};

const visJsPresets = {
  network: { type: 'vis', config: { physics: { stabilization: true }, interaction: { hover: true } } },
  timeline: { type: 'vis', config: { orientation: 'top' } },
};

const chartJsPresets = {
  heatmap: { type: 'chartjs', config: { backgroundColor: 'rgba(0,0,0,0.1)' } },
};

const libraries = {
  d3: { name: 'd3', cdn: 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js' },
  vis: { name: 'vis', cdn: [
    'https://cdn.jsdelivr.net/npm/vis-data@7/standalone/umd/vis-data.min.js',
    'https://cdn.jsdelivr.net/npm/vis-network@9/standalone/umd/vis-network.min.js',
    'https://cdn.jsdelivr.net/npm/vis-timeline@7/standalone/umd/vis-timeline-graph2d.min.js'
  ] },
  chartjs: { name: 'chartjs', cdn: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js' },
};

const templates = {
  basic: {
    template: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{title}}</title>
  {{libraries}}
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 16px; }
  </style>
  </head>
  <body>
    {{visualizations}}
    <script>
    {{script}}
    </script>
  </body>
  </html>`
  },
  dashboard: {
    template: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{title}}</title>
  {{libraries}}
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 16px; background: #0b132b; color: #e0e1dd; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
    .visualization-card { background: #1c2541; border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  </style>
  </head>
  <body>
    <div class="grid">
      {{visualizations}}
    </div>
    <script>
    {{script}}
    </script>
  </body>
  </html>`
  }
};

module.exports = { d3Presets, visJsPresets, chartJsPresets, templates, libraries };

