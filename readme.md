# Rosemary.js 🌿

<p align="center">
  <img src="assets/logo-2.png" alt="Rosemary.js Logo" width="300"/>
</p>

Rosemary.js is a flexible and powerful knowledge management library that serves as a canvas for your ideas and data. It provides a foundation for organizing, connecting, and analyzing information in ways that are meaningful to you.

## 🚨 Important Notice

**Version 1.0.0 is deprecated due to critical bugs. Please upgrade to 1.2.0 (Arp) for a more stable and secure experience.**

## 🚀 What's New in 1.2.0 (Arp)

- 🎯 CLI `-d` option now respected; specify custom data file path
- 🔐 Markdown-to-HTML is sanitized by default
- 🆔 Stable IDs via `nanoid`
- 🔎 Better fuzzy search (tags indexed properly)
- 📄 CSV delimiter is consistent and configurable
- 💾 Auto-save is consistent across mutations
- 🔧 New `updateLeaf` API for atomic updates

## 🎨 Your Data, Your Way

Rosemary.js doesn't dictate how you should organize your information. Instead, it offers a set of tools that you can use to create your own unique knowledge management system. Whether you're organizing research notes, analyzing stock market data, or connecting seemingly unrelated ideas, Rosemary.js adapts to your needs.

I'm excited to see the creative ways you'll use Rosemary.js! Every dataset, every collection of ideas, and every problem space is unique. Rosemary.js is designed to be flexible enough to handle this diversity while providing powerful tools for connection and analysis.

## 🌱 Growing Together

I believe that the true potential of Rosemary.js will be realized through the creativity of its users. I encourage you to experiment, to push the boundaries of what's possible, and to share your experiences with the community.

- Have you found an innovative way to use Rosemary.js?
- Did you create a unique visualization of your data?
- Have you integrated Rosemary.js into a larger system in an interesting way?

I'd love to hear about it! Your experiences and use cases can inspire others and help shape the future development of Rosemary.js.

## 🚀 Getting Started

## Installation
```bash
npm install rosemary-js
```

## Quick Start

```javascript
const Rosemary = require('rosemary-js');

const brain = new Rosemary();

// Add a new leaf
const leafId = brain.addLeaf('Rosemary.js is amazing!', ['technology', 'productivity']);

// Get leaf content
console.log(brain.getLeafById(leafId).content);
```

## Features

- **Organic Knowledge Structure**: Create a flexible, interconnected web of information.
- **Effortless Input**: Capture thoughts and ideas quickly and easily.
- **Rich Connections**: Link related concepts across different domains.
- **Smart Tagging System**: Organize information with multi-dimensional tagging.
- **Powerful Search**: Find information quickly with content-based and fuzzy search.
- **Import/Export**: Seamlessly import and export your knowledge base in JSON and CSV formats.
- **Flexible Sorting**: Sort leaves by creation date, last modified date, tag count, or connection count.
- **Related Content Discovery**: Find related leaves based on connections or similar tags.
- **CLI Interface**: Interact with your knowledge base directly from the command line.
- **Visualization Builder**: Generate network/mindmap HTML from your knowledge graph.

## Basic Usage Examples

Here are some examples to help you get started with Rosemary.js:

### Adding and Retrieving Leaves

```javascript
const brain = new Rosemary();

// Add leaves
const leaf1Id = brain.addLeaf('JavaScript is versatile', ['programming', 'web']);
const leaf2Id = brain.addLeaf('Python is great for data science', ['programming', 'data']);

// Retrieve leaves
const leaf1 = brain.getLeafById(leaf1Id);
console.log(leaf1.content); // Output: JavaScript is versatile

// Get all leaves
const allLeaves = brain.getAllLeaves();
console.log(allLeaves.length); // Output: 2
```

### Working with Tags

```javascript
// Get all tags
const allTags = brain.getAllTags();
console.log(allTags); // Output: ['programming', 'web', 'data']

// Find leaves by tag
const programmingLeaves = brain.getLeavesByTag('programming');
console.log(programmingLeaves.length); // Output: 2

// Add a tag to an existing leaf
brain.tagLeaf(leaf1Id, 'frontend');
```

### Connecting Leaves

```javascript
// Connect two leaves
brain.connectLeaves(leaf1Id, leaf2Id, 'related programming languages');

// Get connected leaves
const connectedLeaves = brain.getConnectedLeaves(leaf1Id);
console.log(connectedLeaves.length); // Output: 1
```

### Searching

```javascript
// Search by content
const results = brain.getLeavesByContent('data');
console.log(results.length); // Output: 1

// Advanced search (if implemented)
const advancedResults = brain.search('JavaScript OR Python', ['programming']);
console.log(advancedResults.length); // Output: 2
```

```javascript
// Fuzzy search (content + tags)
const results = brain.fuzzySearch('javascript');
results.forEach(({ item, score }) => {
  console.log(item.content, score);
});
```

### CLI Usage

Rosemary.js comes with a powerful CLI for interacting with your knowledge base. To use the CLI:

```bash
npm install -g rosemary-js
```

Then you can use the following commands:

```bash
# Add a new leaf
rosemary add

# Print a report of all leaves
rosemary report

# Search leaves by content
rosemary search <query>

# Connect two leaves
rosemary connect <id1> <id2> [-r <relationship>]

# Get related leaves
rosemary related <id> [-d <distance>]

# Delete a leaf
rosemary delete <id>

# Clear all data
rosemary clear

# Import/Export CSV (default delimiter ,)
rosemary import-csv ./ideas.csv -d ./rosemary-data.json
rosemary export-csv ./export.csv -d ./rosemary-data.json

# Specify data file location (can be used with any command)
rosemary <command> -d <data-file-path>
# Or use env var for API server
# ROSEMARY_DATA_FILE=./my-data.json node src/api.js
```

The CLI now supports specifying a custom data file location with the `-d` option, allowing you to manage multiple knowledge bases.

The Creative Writing Wizard provides an interactive interface for:
- Adding new ideas
- Viewing all ideas
- Connecting similar ideas
- Viewing most connected ideas
- Generating random idea chains
- Searching ideas

For more detailed information on each command, use:

```bash
rosemary help <command>
```

## Visualization

Generate a network visualization from your current data file:

```bash
ROSEMARY_DATA_FILE=./rosemary-data.json npm run visualize
```

Or programmatically:

```javascript
const Rosemary = require('rosemary-js');
const Builder = require('rosemary-js/src/Builder');
const brain = new Rosemary({ dataFile: './rosemary-data.json' });
brain.loadData();
const data = brain.buildNetworkDataset();
new Builder(brain).useTemplate('dashboard').addVisualization('network', data, {}).build('./graph.html');
```

## Examples

- Academic: Botany paper/author/tag network (`examples/botany_paper_network/`)
- Thailand: Mindmap of ideas around food, culture, travel (`examples/thailand_mindmap/`)
  - Both examples include CSV and JSON variants and simple terminal commands in their README files.

## Upcoming Features

I will be constantly working to improve Rosemary.js. Here are some features I am excited about:

- **Leaf Templates**: Create and use templates for common types of information.
- **Periodic Review System**: Implement spaced repetition for effective knowledge reinforcement.
- **Plugin System**: Extend Rosemary.js functionality with a lightweight plugin architecture.
- **LLM Connectors**: Optional modules for prompt engineering and token optimization (future work).

Have an idea for a feature? I'd love to hear it! Feel free to open an issue or contribute to the development.

## Get Involved

Join the Rosemary.js community! Here's how you can get involved:

- **Star the repo**: Show your support and stay updated with GitHub stars.
- **Contribute**: Check out our [Contributing Guide](CONTRIBUTING.md) to get started.
- **Spread the word**: Tell your friends and colleagues about Rosemary.js.
- **Share your experience**: I'd love to hear how you're using Rosemary.js. Share your stories on GitHub Discussions or social media.

## Version Naming Convention

Rosemary.js versions are named after aromatic herbs and spices, reflecting the library's goal of cultivating a rich and flavorful knowledge base. Each major version will be named after a new herb or spice, with minor versions using variations or subspecies.

Current Version: Rosemary Arp (1.2.0)

## Contributing

I welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

Rosemary.js is [MIT licensed](LICENSE).

## About the Author

Rosemary.js is maintained by me, Luisfer Romero Calero, a creative software developer. I created this library from Sevilla, Spain, and Bangkok, Thailand. I had the idea in 2016 and now I am implementing it.

🔍 **Open to New Opportunities**: I'm currently exploring new challenges in software development. Please reach out if you want to work together, or just to chat about software development!

- 📧 Email: luisfer.romero.calero@gmail.com
- 💻 GitHub: [github.com/luisfer](https://github.com/luisfer)
- 🔗 LinkedIn: [linkedin.com/in/luisferromero](https://www.linkedin.com/in/luisfer-romero-calero/)

---

Cultivate your knowledge. Let your ideas flourish. Grow your digital second brain with Rosemary.js. 🧠🌿
