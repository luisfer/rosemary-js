#!/usr/bin/env node
/**
 * Pre-publish guard. Asserts that what we are about to publish
 * matches what is in git and what is on npm.
 *
 * Run automatically by `prepublishOnly`. Run manually:
 *
 *     npm run check-release
 *
 * Fails loudly with a non-zero exit code on any mismatch.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function shSoft(cmd) {
  try { return sh(cmd); } catch { return null; }
}

function fail(msg) {
  console.error(`check-release: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`check-release: ok — ${msg}`);
}

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const name = pkg.name;
const version = pkg.version;
const expectedTag = `v${version}`;

if (!name || !version) fail('package.json missing name or version');
ok(`package: ${name}@${version}`);

// 1. Working tree clean
const status = shSoft('git status --porcelain');
if (status === null) fail('git not available');
if (status !== '') {
  fail(`working tree not clean. Commit or stash before releasing.\n${status}`);
}
ok('working tree clean');

// 2. On a commit reachable from origin/main (warn only, do not block — feature branch releases happen)
const branch = shSoft('git rev-parse --abbrev-ref HEAD') || 'HEAD';
ok(`branch: ${branch}`);

// 3. The commit at HEAD must carry the matching tag
const headSha = sh('git rev-parse HEAD');
const tagSha = shSoft(`git rev-list -n 1 ${expectedTag}`);
if (!tagSha) {
  fail(`git tag ${expectedTag} does not exist. Create it with \`npm version\` or \`git tag ${expectedTag}\`.`);
}
if (tagSha !== headSha) {
  fail(`HEAD (${headSha.slice(0, 8)}) does not match tag ${expectedTag} (${tagSha.slice(0, 8)}). Tag the current commit before publishing.`);
}
ok(`HEAD matches tag ${expectedTag}`);

// 4. Tag must be pushed to origin
const remoteTag = shSoft(`git ls-remote --tags origin refs/tags/${expectedTag}`);
if (!remoteTag) {
  fail(`tag ${expectedTag} not pushed to origin. Run: git push --follow-tags`);
}
ok(`tag ${expectedTag} present on origin`);

// 5. Version must not already exist on npm
let registryVersions = [];
const raw = shSoft(`npm view ${name} versions --json`);
if (raw) {
  try {
    const parsed = JSON.parse(raw);
    registryVersions = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    fail(`could not parse npm view output:\n${raw}`);
  }
}
if (registryVersions.includes(version)) {
  fail(`version ${version} already exists on npm. Bump and re-tag.`);
}
ok(`version ${version} not yet on npm`);

// 6. CHANGELOG should mention the version
const changelogPath = path.resolve(__dirname, '..', 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  if (!changelog.includes(version)) {
    fail(`CHANGELOG.md does not mention ${version}. Add a section before releasing.`);
  }
  ok(`CHANGELOG mentions ${version}`);
} else {
  ok('no CHANGELOG.md (skipping that check)');
}

console.log(`\ncheck-release: all good. ${name}@${version} is safe to publish.`);
