# Rosemary MCP Prototype

This is a dependency-free prototype for the eventual `rosemary-mcp` package. It exposes six agent-facing tools:

- `rosemary_recall`
- `rosemary_resolve`
- `rosemary_walk`
- `rosemary_bridge`
- `rosemary_add_note`
- `rosemary_context_pack`

It is not a complete MCP server. It is a testable surface for names, arguments, response formats, and evals before a separate package takes an MCP SDK dependency.

```javascript
const { createRosemaryMcpTools } = require('./rosemary-mcp-prototype');

const { tools } = createRosemaryMcpTools({
  dataFile: './rosemary-data.json'
});

const results = await tools.rosemary_recall({
  query: 'release process',
  topK: 3
});
```
