const fs = require('fs');
const path = require('path');
const Rosemary = require('../Rosemary');
const Builder = require('../Builder');

describe('Builder', () => {
  it('generates an HTML file with a network viz', () => {
    const brain = new Rosemary({ autoSave: false });
    const a = brain.addLeaf('Node A', ['g1']);
    const b = brain.addLeaf('Node B', ['g2']);
    const c = brain.addLeaf('Node C', ['g1']);
    brain.connectLeaves(a, b);
    brain.connectLeaves(b, c);

    const builder = new Builder(brain);
    const data = brain.buildNetworkDataset();
    builder.useTemplate('dashboard').addVisualization('network', data, {});

    const out = path.join(__dirname, '../../tmp/builder_test.html');
    builder.build(out);

    const html = fs.readFileSync(out, 'utf8');
    expect(html).toContain('vis.Network');
    expect(html).toContain('visualization-0');
  });
});

