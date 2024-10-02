const Rosemary = require('../../src/Rosemary');
const path = require('path');

const brain = new Rosemary();
const dataFile = path.join(__dirname, 'stocks.csv');

function analyzeStocks() {
    const allStocks = brain.getAllLeaves();
    console.log('🌿 Rosemary.js Stock Analyzer 🌿\n');
    console.log(`Analyzed ${allStocks.length} stocks.\n`);

    // Connect stocks with similar tags
    brain.connectSimilarLeaves(2);

    // Display most common tags
    console.log('📊 Top Tags:');
    brain.getMostUsedTags(5).forEach((tag) => {
        console.log(`- ${tag.name}: ${tag.count} stocks`);
    });

    // Generate unexpected watchlists
    console.log('\n🔮 Unexpected Watchlists:');

    // Stocks with AI potential
    const aiStocks = allStocks.filter(
        (stock) => stock.tags.has('ai_potential') || stock.tags.has('ai_leader')
    );
    console.log('\n1. AI-related Stocks:');
    aiStocks.forEach((stock) => console.log(`- ${stock.content}`));

    // High volatility stocks
    const volatileStocks = allStocks.filter((stock) =>
        stock.tags.has('high_volatility')
    );
    console.log('\n2. High Volatility Stocks:');
    volatileStocks.forEach((stock) => console.log(`- ${stock.content}`));

    // Stocks with upcoming earnings
    const earningsStocks = allStocks.filter((stock) =>
        stock.tags.has('earnings_soon')
    );
    console.log('\n3. Stocks with Upcoming Earnings:');
    earningsStocks.forEach((stock) => console.log(`- ${stock.content}`));

    // Random connected chain of stocks
    console.log('\n🎲 Random Connected Stock Chain:');
    const randomChain = brain.getRandomConnectedChain(null, 5);
    randomChain.forEach((stock) => console.log(`- ${stock.content}`));

    // Fuzzy search
    const searchTerm = 'growth';
    console.log(`\n🔍 Fuzzy Search Results for "${searchTerm}":`);
    const searchResults = brain.fuzzySearch(searchTerm);
    searchResults.slice(0, 5).forEach((result) => {
        console.log(
            `- ${result.item.content} (Score: ${result.score.toFixed(2)})`
        );
    });
}

// Main execution
brain
    .importFromCSV(dataFile)
    .then(() => {
        analyzeStocks();
    })
    .catch((error) => console.error('Error:', error));