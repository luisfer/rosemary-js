const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { d3Presets, visJsPresets, chartJsPresets, templates, libraries } = require('./presets/visualizations');

class Builder {
  constructor(rosemary) {
    this.rosemary = rosemary;
    this.visualizations = [];
    this.template = templates.basic;
  }

  /**
   * Sets the template to use for visualization
   * @param {string} templateName - Name of the template to use
   */
  useTemplate(templateName) {
    if (!templates[templateName]) {
      console.warn(chalk.yellow(`Template "${templateName}" not found. Using basic template.`));
      return this;
    }
    this.template = templates[templateName];
    return this;
  }

  /**
   * Adds a visualization to the builder
   * @param {string} type - Type of visualization
   * @param {Object} data - Data for the visualization
   * @param {Object} options - Additional options
   */
  addVisualization(type, data, options = {}) {
    const preset = this._getPreset(type);
    if (!preset) {
      console.error(chalk.red(`Visualization type "${type}" not supported.`));
      return this;
    }

    this.visualizations.push({
      type,
      data,
      options: { ...preset.config, ...options },
      library: libraries[preset.type]
    });

    return this;
  }

  /**
   * Gets the preset configuration for a visualization type
   * @private
   */
  _getPreset(type) {
    const parts = [d3Presets[type], visJsPresets[type], chartJsPresets[type]].filter(Boolean);
    if (parts.length === 0) return null;
    return parts.reduce((acc, curr) => ({ ...acc, ...curr }), {});
  }

  /**
   * Generates the visualization HTML
   * @private
   */
  _generateHTML() {
    const usedLibraries = new Set();
    let visualizationsHTML = '';
    let scriptsHTML = '';

    // Collect required libraries and generate visualization containers
    this.visualizations.forEach((viz, index) => {
      usedLibraries.add(viz.library.name);
      
      if (this.template === templates.dashboard) {
        visualizationsHTML += `
          <div class="visualization-card">
            <div id="visualization-${index}"></div>
          </div>`;
      } else {
        visualizationsHTML += `<div id="visualization-${index}"></div>`;
      }

      scriptsHTML += this._generateVisualizationScript(viz, index);
    });

    // Generate library imports
    const librariesHTML = Array.from(usedLibraries)
      .map(libName => {
        const lib = Object.values(libraries).find(l => l.name === libName);
        if (Array.isArray(lib.cdn)) {
          return lib.cdn.map(url => `<script src="${url}"></script>`).join('\n');
        }
        return `<script src="${lib.cdn}"></script>`;
      })
      .join('\n');

    // Replace template placeholders
    return this.template.template
      .replace('{{title}}', 'Rosemary.js Visualization')
      .replace('{{libraries}}', librariesHTML)
      .replace('{{visualizations}}', visualizationsHTML)
      .replace('{{script}}', scriptsHTML);
  }

  /**
   * Generates the JavaScript code for a visualization
   * @private
   */
  _generateVisualizationScript(visualization, index) {
    const containerId = `visualization-${index}`;
    switch (visualization.type) {
      case 'mindMap':
        return this._generateD3MindMap(visualization.data, containerId, visualization.options);
      case 'ganttChart':
        return this._generateD3GanttChart(visualization.data, containerId, visualization.options);
      case 'network':
        return this._generateVisNetwork(visualization.data, containerId, visualization.options);
      case 'timeline':
        return this._generateVisTimeline(visualization.data, containerId, visualization.options);
      case 'heatmap':
        return this._generateChartJsHeatmap(visualization.data, containerId, visualization.options);
      default:
        console.warn(chalk.yellow(`No script generator for visualization type "${visualization.type}"`));
        return '';
    }
  }

  /**
   * Builds and saves the visualization
   * @param {string} outputPath - Path to save the visualization
   * @param {Object} options - Build options
   */
  build(outputPath, options = {}) {
    try {
      console.log(chalk.blue('🔨 Building visualization...'));

      if (this.visualizations.length === 0) {
        throw new Error('No visualizations added to the builder.');
      }

      // Generate HTML
      const html = this._generateHTML();

      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(outputPath, html);
      console.log(chalk.green('✨ Visualization built successfully!'));
      console.log(chalk.cyan(`📁 Output: ${outputPath}`));

      if (options.serve) {
        this._serveVisualization(outputPath);
      }

    } catch (error) {
      console.error(chalk.red('❌ Build failed:'), error.message);
      throw error;
    }
  }

  /**
   * Serves the visualization using http-server
   * @private
   */
  _serveVisualization(filePath) {
    const httpServer = require('http-server');
    const dir = path.dirname(filePath);
    
    console.log(chalk.blue('🚀 Starting server...'));
    const server = httpServer.createServer({ root: dir });
    
    server.listen(8080, '127.0.0.1', () => {
      const url = `http://localhost:8080/${path.basename(filePath)}`;
      console.log(chalk.green('🌎 Server running at:'), url);
      console.log(chalk.gray('Press Ctrl+C to stop'));
    });
  }

  // Visualization script generators
  _generateD3MindMap(data, containerId, options) {
    return `
      (function(){
      const data = ${JSON.stringify(data)};
      const mindMap = d3.select('#${containerId}')
        .append('svg')
        .attr('width', ${options.width})
        .attr('height', ${options.height});
      
      // D3.js mind map implementation
      const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.edges).id(d => d.id))
        .force('charge', d3.forceManyBody().strength(${options.charge}))
        .force('center', d3.forceCenter(${options.width / 2}, ${options.height / 2}));
      
      // Add links
      const link = mindMap.append('g')
        .selectAll('line')
        .data(data.edges)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6);
      
      // Add nodes
      const node = mindMap.append('g')
        .selectAll('circle')
        .data(data.nodes)
        .join('circle')
        .attr('r', ${options.nodeRadius})
        .attr('fill', d => d3.schemeCategory10[d.group % 10]);
      
      // Add labels
      const label = mindMap.append('g')
        .selectAll('text')
        .data(data.nodes)
        .join('text')
        .text(d => d.label)
        .attr('font-size', ${options.fontSize})
        .attr('dx', 12)
        .attr('dy', 4);
      
      // Update positions
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
        
        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      });
      })();
    `;
  }

  _generateD3GanttChart(data, containerId, options) {
    return `
      (function(){
      const data = ${JSON.stringify(data)};
      const gantt = d3.select('#${containerId}')
        .append('svg')
        .attr('width', ${options.width})
        .attr('height', ${options.height});
      
      const margin = ${JSON.stringify(options.margin)};
      const width = ${options.width} - margin.left - margin.right;
      const height = ${options.height} - margin.top - margin.bottom;
      
      const g = gantt.append('g')
        .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
      
      // Set up scales
      const x = d3.scaleTime()
        .domain([d3.min(data.tasks, d => new Date(d.start_date)),
                d3.max(data.tasks, d => new Date(d.end_date))])
        .range([0, width]);
      
      const y = d3.scaleBand()
        .domain(data.tasks.map(d => d.text))
        .range([0, height])
        .padding(0.1);
      
      // Add axes
      g.append('g')
        .attr('transform', \`translate(0,\${height})\`)
        .call(d3.axisBottom(x));
      
      g.append('g')
        .call(d3.axisLeft(y));
      
      // Add bars
      g.selectAll('.bar')
        .data(data.tasks)
        .join('rect')
        .attr('class', 'bar')
        .attr('y', d => y(d.text))
        .attr('x', d => x(new Date(d.start_date)))
        .attr('width', d => x(new Date(d.end_date)) - x(new Date(d.start_date)))
        .attr('height', y.bandwidth())
        .attr('fill', (d, i) => options.colors[i % options.colors.length]);
      })();
    `;
  }

  _generateVisNetwork(data, containerId, options) {
    return `
      (function(){
      const data = ${JSON.stringify(data)};
      const container = document.getElementById('${containerId}');
      const network = new vis.Network(
        container,
        {
          nodes: new vis.DataSet(data.nodes),
          edges: new vis.DataSet(data.edges)
        },
        ${JSON.stringify(options)}
      );
      })();
    `;
  }

  _generateVisTimeline(data, containerId, options) {
    return `
      (function(){
      const data = ${JSON.stringify(data)};
      const container = document.getElementById('${containerId}');
      const timeline = new vis.Timeline(
        container,
        new vis.DataSet(data.events),
        data.groups,
        ${JSON.stringify(options)}
      );
      })();
    `;
  }

  _generateChartJsHeatmap(data, containerId, options) {
    return `
      (function(){
      const data = ${JSON.stringify(data)};
      const ctx = document.getElementById('${containerId}').getContext('2d');
      new Chart(ctx, {
        type: 'heatmap',
        data: {
          labels: data.labels,
          datasets: [{
            data: data.matrix,
            ...${JSON.stringify(options)}
          }]
        }
      });
      })();
    `;
  }
}

module.exports = Builder; 