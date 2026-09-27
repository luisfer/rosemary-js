'use strict';

// The three code changes used in experiments 2 to 4, applied to a copy of the repository.
// c1: a `renameTag` method that changes tags without saving, declared in index.d.ts, no test.
// c2: a `stats` CLI command that the README does not list.
// c3: a test in a new folder that calls exportToJSON and updateLeaf.

const fs = require('fs');
const path = require('path');

function edit(dir, rel, anchor, replacement) {
  const file = path.join(dir, rel);
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(anchor)) throw new Error(`changes: anchor not found in ${rel}`);
  fs.writeFileSync(file, text.replace(anchor, replacement));
}

const CHANGES = {
  c1(dir) {
    edit(dir, 'src/Rosemary.js', '  /**\n   * Retrieves all tags in the Rosemary instance.', `  /**
   * Renames a tag on every leaf that has it.
   * @param {string} oldTag - The tag to rename.
   * @param {string} newTag - The new tag name.
   * @returns {number} The number of leaves changed.
   */
  renameTag(oldTag, newTag) {
    let changed = 0;
    for (const leaf of this.leaves.values()) {
      if (leaf.hasTag(oldTag)) {
        leaf.removeTag(oldTag);
        leaf.addTag(newTag);
        changed++;
      }
    }
    this.tags.delete(oldTag);
    if (changed > 0) this.tags.add(newTag);
    return changed;
  }

  /**
   * Retrieves all tags in the Rosemary instance.`);
    edit(dir, 'index.d.ts', '  tagLeaf(leafId: string, ...tags: string[]): void;\n',
      '  tagLeaf(leafId: string, ...tags: string[]): void;\n  renameTag(oldTag: string, newTag: string): number;\n');
  },
  c2(dir) {
    edit(dir, 'src/cli.js', '// Command to search for leaves', `// Command to print counts of leaves, tags, and connections
program
  .command('stats')
  .description('Print the number of leaves, tags, and connections')
  .action(() => {
    brain.logDataSummary();
  });

// Command to search for leaves`);
  },
  c3(dir) {
    fs.mkdirSync(path.join(dir, 'test/integration'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'test/integration/export.test.js'), `const fs = require('fs');
const os = require('os');
const path = require('path');
const Rosemary = require('../../src/Rosemary');

test('exportToJSON writes the updated leaf', () => {
  const brain = new Rosemary({ autoSave: false });
  const id = brain.addLeaf('A', ['x']);
  brain.updateLeaf(id, { content: 'B' });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rosemary-')), 'out.json');
  brain.exportToJSON(file);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).leaves[0].content).toBe('B');
});
`);
  }
};

function applyChange(dir, name) {
  if (!CHANGES[name]) throw new Error(`changes: unknown change ${name}`);
  CHANGES[name](dir);
}

module.exports = { applyChange, CHANGES };
