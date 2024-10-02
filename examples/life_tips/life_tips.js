const Rosemary = require('../../src/Rosemary');
const path = require('path');

const brain = new Rosemary();
const dataFile = path.join(__dirname, 'life_tips.csv');

function analyzeTips() {
  const allTips = brain.getAllLeaves();
  console.log(`🌿 Rosemary.js Life Tips Organizer 🌿\n`);
  console.log(`Imported ${allTips.length} life tips.\n`);

  // Connect tips with similar tags
  brain.connectSimilarLeaves(1);

  // Display most used categories (tags)
  console.log('📊 Top 5 Life Tip Categories:');
  brain.getMostUsedTags(5).forEach(tag => {
    console.log(`- ${tag.name}: ${tag.count} tips`);
  });

  // Display tips with the most connections
  console.log('\n🔗 Most Versatile Tips (with many connections):');
  brain.getMostConnectedLeaves(3).forEach(tip => {
    console.log(`- "${tip.content}"`);
    console.log(`  Tags: ${Array.from(tip.tags).join(', ')}`);
    console.log(`  Connected to ${brain.stem.getConnectedLeaves(tip.id).length} other tips:`);
    brain.stem.getConnectedLeaves(tip.id).forEach(connectedTip => {
      console.log(`    - "${brain.getLeafById(connectedTip[0]).content}"`);
    });
  });

  // Generate a random tip chain
  console.log('\n🎲 Random Tip Chain (connected ideas):');
  const randomChain = brain.getRandomConnectedChain(null, 4);
  randomChain.forEach(tip => {
    console.log(`- ${tip.content}`);
  });

  // Perform a fuzzy search
  const searchTerm = 'health';
  console.log(`\n🔍 Fuzzy Search Results for "${searchTerm}":`);
  const searchResults = brain.fuzzySearch(searchTerm);
  searchResults.slice(0, 3).forEach(result => {
    console.log(`- ${result.item.content}`);
  });
}

// Main execution
brain.importFromCSV(dataFile)
  .then(() => {
    analyzeTips();
  })
  .catch(error => console.error('Error:', error));