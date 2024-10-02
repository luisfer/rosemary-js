const Rosemary = require('../../src/Rosemary');
const path = require('path');

const brain = new Rosemary();
const dataFile = path.join(__dirname, 'scifi_novel_ideas.csv');

// Function to analyze and log results
function analyzeIdeas() {
  console.log(`Imported ${brain.getAllLeaves().length} science fiction ideas.\n`);

  // Connect ideas with similar tags
  brain.connectSimilarLeaves(2);  // Connect leaves with at least 2 common tags

  // Analyze tags
  console.log('Top 10 most used tags:');
  brain.getMostUsedTags(10).forEach(tag => {
    console.log(`${tag.name}: ${tag.count} ideas`);
  });

  console.log('\nIdeas with the most connections:');
  brain.getMostConnectedLeaves(5).forEach(leaf => {
    console.log(`- "${leaf.content}" (${brain.stem.getConnectedLeaves(leaf.id).length} connections)`);
    console.log(`  Tags: ${Array.from(leaf.tags).join(', ')}`);
  });

  console.log('\nRandom idea chain:');
  const randomChain = brain.getRandomConnectedChain(null, 5);
  randomChain.forEach(leaf => {
    console.log(`- ${leaf.content}`);
  });
}

// Main execution
brain.importFromCSV(dataFile)
  .then(() => {
    analyzeIdeas();
  })
  .catch(error => console.error('Error:', error));