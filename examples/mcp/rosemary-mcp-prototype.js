#!/usr/bin/env node

const RosemaryLLM = require('../../src/llm/RosemaryLLM');

function leafSummary(leaf) {
  return {
    id: leaf.id,
    content: leaf.content,
    tags: Array.from(leaf.tags),
    metadata: leaf.metadata
  };
}

function createRosemaryMcpTools(options = {}) {
  const brain = options.brain || new RosemaryLLM({
    dataFile: options.dataFile || process.env.ROSEMARY_DATA_FILE,
    autoSave: options.autoSave !== undefined ? options.autoSave : true,
    embedder: options.embedder
  });

  if (options.load !== false && brain.dataFile) {
    brain.loadData(brain.dataFile);
  }

  return {
    brain,
    tools: {
      async rosemary_recall({ query, topK = 5, responseFormat = 'concise' }) {
        const results = await brain.semanticSearch(query, { topK });
        return results.map(({ leaf, score }) => ({
          leaf: responseFormat === 'detailed' ? leafSummary(leaf) : { id: leaf.id, content: leaf.content },
          score
        }));
      },

      async rosemary_resolve({ input, limit = 5 }) {
        return brain.resolve(input, { limit });
      },

      rosemary_walk({ startId = null, hops = 5, mode = 'tag-affinity' }) {
        return brain.walk(startId, hops, mode).map(leafSummary);
      },

      rosemary_bridge({ fromId, toId }) {
        const bridge = brain.bridge(fromId, toId);
        if (!bridge) return null;
        return {
          path: bridge.path.map(leafSummary),
          relationships: bridge.relationships,
          distance: bridge.distance
        };
      },

      rosemary_add_note({ content, tags = [], metadata = {} }) {
        const id = brain.addLeaf(content, tags, metadata);
        return { id };
      },

      rosemary_context_pack({ leafId, depth = 2, maxTokens = 1000, responseFormat = 'concise' }) {
        return brain.buildPromptContext(leafId, { depth, maxTokens, responseFormat });
      }
    }
  };
}

module.exports = { createRosemaryMcpTools };

if (require.main === module) {
  const { tools } = createRosemaryMcpTools();
  console.log(JSON.stringify({
    name: 'rosemary-mcp-prototype',
    tools: Object.keys(tools)
  }, null, 2));
}
