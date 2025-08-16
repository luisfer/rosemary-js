const Rosemary = require('../../src/Rosemary');
const path = require('path');

const brain = new Rosemary({ autoSave: false });

// Seed leaves as papers and authors
const papers = [
  { id: 'p1', title: 'Morphology of Rosemary (Rosmarinus officinalis)', tags: ['botany', 'morphology'] },
  { id: 'p2', title: 'Essential Oils and Aromatic Profiles of Rosemary Types', tags: ['chemistry', 'aromatics'] },
  { id: 'p3', title: 'Adaptive Traits in Mediterranean Aromatic Herbs', tags: ['ecology', 'adaptation'] },
];
const authors = [
  { id: 'a1', name: 'Dr. Arp' },
  { id: 'a2', name: 'Dr. Tuscan' },
  { id: 'a3', name: 'Dr. Blue' }
];

for (const p of papers) brain.leaves.set(p.id, { id: p.id, content: p.title, tags: new Set(p.tags), createdAt: Date.now(), lastModified: Date.now() });
for (const a of authors) brain.leaves.set(a.id, { id: a.id, content: a.name, tags: new Set(['author']), createdAt: Date.now(), lastModified: Date.now() });
brain.addTags(['botany','morphology','chemistry','aromatics','ecology','adaptation','author']);

// Connect authors to papers
brain.connectLeaves('a1','p1','authored');
brain.connectLeaves('a2','p2','authored');
brain.connectLeaves('a3','p3','authored');

// Connect related papers
brain.connectLeaves('p1','p2','related');
brain.connectLeaves('p2','p3','related');

// Output a network dataset suitable for visualization
const dataset = brain.buildNetworkDataset();
console.log(JSON.stringify(dataset, null, 2));