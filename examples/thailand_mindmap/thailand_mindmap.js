const Rosemary = require('../../src/Rosemary');
const Builder = require('../../src/Builder');
const path = require('path');

const brain = new Rosemary({ autoSave: false });

// Seed ideas about Thailand
const ideas = [
  ['Bangkok street food', ['thailand','food','bangkok']],
  ['Thai temples and wats', ['thailand','culture','bangkok']],
  ['Chiang Mai digital nomad scene', ['thailand','work','chiangmai']],
  ['Thai islands and diving', ['thailand','travel','islands']],
  ['Songkran festival', ['thailand','culture','festivals']],
];

const ids = ideas.map(([content, tags]) => brain.addLeaf(content, tags));

// Connect similar-tag ideas
brain.connectSimilarLeaves(2);

// Build and save a network visualization
const builder = new Builder(brain);
const data = brain.buildNetworkDataset();
const outfile = path.join(process.cwd(), 'thailand-mindmap.html');

builder.useTemplate('dashboard').addVisualization('network', data, { height: '700px' }).build(outfile, { serve: false });

console.log(`Mindmap written to ${outfile}`);