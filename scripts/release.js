#!/usr/bin/env node
/**
 * One-command release.
 *
 *     npm run release -- patch
 *     npm run release -- minor
 *     npm run release -- major
 *     npm run release -- 1.4.0     # explicit version
 *
 * Steps:
 *   1. Refuse if working tree is dirty.
 *   2. Refuse if not on main (override with --force-branch).
 *   3. Run the test suite.
 *   4. `npm version <bump>` — bumps package.json AND creates a git tag v<version>.
 *   5. `git push --follow-tags`.
 *   6. `npm publish` (which runs `prepublishOnly` -> tests + check-release.js).
 *
 * Single source of truth: the version in package.json.
 * Git tag and npm registry must match. check-release.js enforces this.
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ALLOWED = new Set(['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease']);

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function run(cmd, args, opts = {}) {
  console.log(`+ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    console.error(`release: \`${cmd} ${args.join(' ')}\` failed with exit ${result.status}`);
    process.exit(result.status || 1);
  }
}

function fail(msg) {
  console.error(`release: ${msg}`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const forceBranch = argv.includes('--force-branch');
const dryRun = argv.includes('--dry-run');
const positional = argv.filter(a => !a.startsWith('--'));

if (positional.length === 0) {
  fail('usage: npm run release -- <patch|minor|major|x.y.z> [--force-branch] [--dry-run]');
}

const bump = positional[0];
const isExplicit = /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(bump);
if (!isExplicit && !ALLOWED.has(bump)) {
  fail(`invalid bump: ${bump}. Use patch|minor|major or an explicit x.y.z`);
}

// 1. clean tree
const status = sh('git status --porcelain');
if (status !== '') {
  fail(`working tree not clean. Commit or stash first.\n${status}`);
}

// 2. branch
const branch = sh('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main' && !forceBranch) {
  fail(`not on main (current: ${branch}). Pass --force-branch to override.`);
}

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const beforeVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
console.log(`release: current version ${beforeVersion} on branch ${branch}`);

if (dryRun) {
  console.log(`release: --dry-run set. Would bump ${beforeVersion} -> ${bump}, then push and publish. Stopping.`);
  process.exit(0);
}

// 3. tests first (fast feedback before bumping)
run('npm', ['test', '--silent']);

// 4. bump version + create matching git tag (npm version does both)
//    -m embeds the new version in the commit message via %s
run('npm', ['version', bump, '-m', 'chore(release): %s']);

const afterVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
const tag = `v${afterVersion}`;
console.log(`release: bumped to ${afterVersion}, tag ${tag} created`);

// 5. push commit and tag together
run('git', ['push', '--follow-tags']);

// 6. publish (prepublishOnly hook re-runs tests + check-release.js)
run('npm', ['publish']);

console.log(`\nrelease: ${afterVersion} published. Git tag ${tag} pushed. CHANGELOG should already cover it.`);
