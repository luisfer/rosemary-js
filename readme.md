# Rosemary.js 🌿

<p align="center">
  <img src="assets/logo.png" alt="Rosemary.js Logo" width="300"/>
</p>

Rosemary.js is a flexible and powerful knowledge management library that serves as a canvas for your ideas and data. It provides a foundation for organizing, connecting, and analyzing information in ways that are meaningful to you.

## 🎨 Your Data, Your Way

Rosemary.js doesn't dictate how you should organize your information. Instead, it offers a set of tools that you can use to create your own unique knowledge management system. Whether you're organizing research notes, analyzing stock market data, or connecting seemingly unrelated ideas, Rosemary.js adapts to your needs.

We're excited to see the creative ways you'll use Rosemary.js! Every dataset, every collection of ideas, and every problem space is unique. Rosemary.js is designed to be flexible enough to handle this diversity while providing powerful tools for connection and analysis.

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

### CLI Usage

Rosemary.js comes with a powerful CLI for interacting with your knowledge base. To install the CLI globally:

```bash
npm install -g rosemary-js-cli
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

# Start the Creative Writing Wizard
rosemary creative-wizard
```

The Creative Writing Wizard provides an interactive interface for:
- Adding new ideas
- Viewing all ideas
- Connecting similar ideas
- Viewing most connected ideas
- Generating random idea chains
- Searching ideas

## Upcoming Features

We're constantly working to improve Rosemary.js. Here are some features we're excited about:

- **Visualization Module**: Generate mind maps and network graphs of your knowledge base.
- **Leaf Templates**: Create and use templates for common types of information.
- **Periodic Review System**: Implement spaced repetition for effective knowledge reinforcement.
- **Plugin System**: Extend Rosemary.js functionality with a lightweight plugin architecture.

Have an idea for a feature? We'd love to hear it! Feel free to open an issue or contribute to the development.

## Get Involved

Join the Rosemary.js community! Here's how you can get involved:

- **Star the repo**: Show your support and stay updated with GitHub stars.
- **Contribute**: Check out our [Contributing Guide](CONTRIBUTING.md) to get started.
- **Spread the word**: Tell your friends and colleagues about Rosemary.js.
- **Share your experience**: We'd love to hear how you're using Rosemary.js. Share your stories on GitHub Discussions or social media.

## Version Naming Convention

Rosemary.js versions are named after aromatic herbs and spices, reflecting the library's goal of cultivating a rich and flavorful knowledge base. Each major version will be named after a new herb or spice, with minor versions using variations or subspecies.

Current Version: Rosemary Tuscan Blue (1.0)

## Documentation

For full documentation, visit our [GitHub Wiki](https://github.com/luisfer/rosemary-js/wiki).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

Rosemary.js is [MIT licensed](LICENSE).

## About the Author

Rosemary.js is maintained by me, Luisfer Romero Calero, a creative software developer. I created this library from Sevilla, Spain, and Bangkok, Thailand. I had the idea in 2016 and now I am implementing it.

🔍 **Open to New Opportunities**: I'm currently exploring new challenges in software development. Please reach out if you want to work together, or just to chat about software development!

- 📧 Email: luisfer.romero.calero@gmail.com
- 🔗 GitHub: [github.com/luisfer](https://github.com/luisfer)
- 🔗 LinkedIn: [linkedin.com/in/luisferromero](https://www.linkedin.com/in/luis-fernando-romero-calero-2830049b/)

---

Cultivate your knowledge. Let your ideas flourish. Grow your digital second brain with Rosemary.js. 🧠🌿
