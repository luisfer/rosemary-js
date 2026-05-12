#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const RosemaryLLM = require('../src/llm/RosemaryLLM');

const evalFile = process.argv[2] || path.join(__dirname, '../evals/agent-context.json');

function loadEval(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function buildBrain(setup) {
  const brain = new RosemaryLLM({ autoSave: false });
  (setup.leaves || []).forEach(leaf => {
    const model = require('../src/Leaf').fromJSON({
      id: leaf.id,
      content: leaf.content,
      tags: leaf.tags || [],
      metadata: leaf.metadata || {},
      createdAt: leaf.createdAt || Date.now(),
      lastModified: leaf.lastModified || Date.now()
    });
    brain.leaves.set(model.id, model);
    brain.addTags(Array.from(model.tags));
  });
  brain.stem = require('../src/Stem').fromJSON(setup.connections || []);
  return brain;
}

async function runTask(task) {
  const brain = buildBrain(task.setup || {});
  const action = task.action || {};
  let actual;

  if (action.tool === 'resolve') {
    const result = await brain.resolve(action.input);
    actual = { canonicalId: result.canonical && result.canonical.id };
  } else if (action.tool === 'infer') {
    actual = {
      leafIds: brain.infer(action.leafId, action.relationshipType).map(item => item.leaf.id)
    };
  } else if (action.tool === 'bridge') {
    const bridge = brain.bridge(action.fromId, action.toId);
    actual = { pathIds: bridge ? bridge.path.map(leaf => leaf.id) : [] };
  } else if (action.tool === 'context') {
    const context = brain.buildPromptContext(action.leafId, {
      depth: action.depth,
      maxTokens: action.maxTokens,
      responseFormat: 'concise'
    });
    actual = { relatedCount: context.related.length };
  } else {
    throw new Error(`Unknown eval tool: ${action.tool}`);
  }

  const passed = Object.entries(task.expect || {}).every(([key, expected]) => {
    return JSON.stringify(actual[key]) === JSON.stringify(expected);
  });

  return { id: task.id, passed, actual, expect: task.expect };
}

async function main() {
  const suite = loadEval(evalFile);
  const results = [];
  for (const task of suite.tasks || []) {
    results.push(await runTask(task));
  }

  const failed = results.filter(result => !result.passed);
  console.log(JSON.stringify({
    suite: suite.name,
    passed: results.length - failed.length,
    failed: failed.length,
    results
  }, null, 2));

  if (failed.length > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
