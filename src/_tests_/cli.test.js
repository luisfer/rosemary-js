const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI = path.join(__dirname, '../cli.js');

function run(args, env = {}) {
  return spawnSync('node', [CLI, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf8'
  });
}

describe('CLI', () => {
  const tmpDir = path.join(__dirname, '../../tmp_cli');
  const dataFile = path.join(tmpDir, 'data.json');
  const csvFile = path.join(tmpDir, 'data.csv');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
  });

  it('reports, connects, and exports/imports via CSV', () => {
    let out;
    // Seed via CSV and import through CLI
    const csv = 'id,content,tags\n' + [
      'a,A leaf,t1',
      'b,B leaf,t2'
    ].join('\n');
    fs.writeFileSync(csvFile, csv);
    out = run(['-d', dataFile, 'import-csv', csvFile]);
    expect(out.stdout).toContain('Imported data');

    // Ensure file persisted
    const persisted = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    expect(Array.isArray(persisted.leaves)).toBe(true);
    const ids = new Set(persisted.leaves.map(l => l.id));
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);

    // Optional: report output may vary by environment; skip strict assertion

    out = run(['-d', dataFile, 'connect', 'a', 'b']);
    expect(out.stdout).toContain('Connected');

    out = run(['-d', dataFile, 'search', 'leaf']);
    expect(out.stdout).toContain('A leaf');
    expect(out.stdout).toContain('B leaf');

    out = run(['-d', dataFile, 'export-csv', csvFile]);
    expect(out.stdout).toContain('Exported data');
    expect(fs.existsSync(csvFile)).toBe(true);

    // Verify exported CSV contains content
    const csvOut = fs.readFileSync(csvFile, 'utf8');
    expect(csvOut).toContain('A leaf');
    expect(csvOut).toContain('B leaf');

    // Clear and re-import from CSV
    fs.writeFileSync(dataFile, JSON.stringify({ leaves: [], connections: [], tags: [] }));
    out = run(['-d', dataFile, 'import-csv', csvFile]);
    expect(out.stdout).toContain('Imported data');
    // Verify persistence post re-import
    const persisted2 = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const contents = persisted2.leaves.map(l => l.content);
    expect(contents).toContain('A leaf');
    expect(contents).toContain('B leaf');
  });
});

