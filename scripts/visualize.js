#!/usr/bin/env node
const path = require('path');
const Rosemary = require('../src/Rosemary');
const Builder = require('../src/Builder');

const dataFile = process.env.ROSEMARY_DATA_FILE || path.join(process.cwd(), 'rosemary-data.json');
const outFile = process.argv[2] || path.join(process.cwd(), 'rosemary-network.html');

const brain = new Rosemary({ dataFile });
brain.loadData(dataFile);

const builder = new Builder(brain);
const data = brain.buildNetworkDataset();

builder
  .useTemplate('dashboard')
  .addVisualization('network', data, { height: '600px' })
  .build(outFile, { serve: false });

console.log(`Visualization written to: ${outFile}`);

