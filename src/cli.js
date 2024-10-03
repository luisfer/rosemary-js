#!/usr/bin/env node

const program = require('commander');
const Rosemary = require('./Rosemary');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');

const brain = new Rosemary();
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dataFile = path.join(dataDir, 'rosemary-data.json');
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, '{}', 'utf8');
}

// Load existing data if available
if (fs.existsSync(dataFile)) {
  brain.loadData(dataFile);
}

// Command to add a new leaf interactively
program
  .command('add')
  .description('Add a new leaf interactively')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'content',
        message: 'Enter the content of the leaf:',
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Enter tags (comma-separated):',
      },
    ]);

    const tags = answers.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const id = brain.addLeaf(answers.content, tags);
    console.log(chalk.green(`🌿 Added leaf with ID: ${id}`));
    brain.saveData(dataFile); // Ensure dataFile is defined and valid
  });

// Command to print all leaves
program
  .command('report')
  .description('Print a report of all leaves')
  .action(() => {
    const leaves = brain.getAllLeaves();
    console.log(chalk.blue('🌿 Knowledge Base Report:'));
    console.log('---');
    leaves.forEach(leaf => {
      console.log(chalk.yellow(`ID: ${leaf.id}`));
      console.log(chalk.green(`🍃 Content: ${leaf.content}`));
      console.log(chalk.cyan(`🏷️  Tags: ${Array.from(leaf.tags).join(', ')}`));
      console.log('---');
    });
  });

// Command to search for leaves
program
  .command('search <query>')
  .description('Search leaves by content')
  .action((query) => {
    const results = brain.getLeavesByContent(query);
    if (results.length > 0) {
      console.log(chalk.yellow('🔍 Search Results:'));
      results.forEach(leaf => {
        console.log(chalk.cyan(`ID: ${leaf.id}`));
        console.log(chalk.green(`🍃 Content: ${leaf.content}`));
        console.log(chalk.magenta(`🏷️  Tags: ${Array.from(leaf.tags).join(', ')}`));
        console.log('---');
      });
    } else {
      console.log(chalk.red('No results found.'));
    }
  });

// Command to connect two leaves
program
  .command('connect <id1> <id2>')
  .description('Connect two leaves')
  .option('-r, --relationship <type>', 'Specify the relationship type')
  .action((id1, id2, options) => {
    try {
      brain.connectLeaves(id1, id2, options.relationship || '');
      console.log(chalk.green(`🌿 Connected leaf ${id1} and leaf ${id2}`));
      brain.saveData(dataFile); // Save data after connecting
    } catch (error) {
      console.error(chalk.red(error.message));
    }
  });

// Command to get related leaves
program
  .command('related <id>')
  .description('Get related leaves')
  .option('-d, --distance <number>', 'Maximum distance', parseInt, 2)
  .action((id, options) => {
    try {
      const relatedLeaves = brain.getRelatedLeaves(id, options.distance);
      console.log(chalk.yellow(`🌿 Related leaves for ID ${id}:`));
      relatedLeaves.forEach(leaf => {
        console.log(chalk.cyan(`ID: ${leaf.id}`));
        console.log(chalk.green(`🍃 Content: ${leaf.content}`));
        console.log(chalk.magenta(`🏷️  Tags: ${Array.from(leaf.tags).join(', ')}`));
        console.log('---');
      });
    } catch (error) {
      console.error(chalk.red(error.message));
    }
  });

// Command to import from CSV
program
  .command('import-csv [filepath]')
  .description('Import data from a CSV file')
  .action(async (filepath) => {
    try {
      if (!filepath) {
        const { csvPath } = await inquirer.prompt([
          {
            type: 'input',
            name: 'csvPath',
            message: 'Enter the path to the CSV file:',
          },
        ]);
        filepath = csvPath;
      }
      await brain.importFromCSV(filepath);
      console.log(chalk.green('🌿 Successfully imported data from CSV'));
      brain.saveData(dataFile);
    } catch (error) {
      console.error(chalk.red(`Error importing CSV: ${error.message}`));
    }
  });

program
  .command('creative-wizard')
  .description('Start the Creative Writing Wizard')
  .action(async () => {
    console.log(chalk.blue('🧙 Welcome to the Creative Writing Wizard!'));
    
    while (true) {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'What would you like to do?',
          choices: [
            'Add a new idea',
            'View all ideas',
            'Connect similar ideas',
            'View most connected ideas',
            'Generate random idea chain',
            'Search ideas',
            'Import from CSV',
            'Exit wizard'
          ]
        }
      ]);

      switch (choice) {
        case 'Add a new idea':
          await addIdea();
          break;
        case 'View all ideas':
          viewAllIdeas();
          break;
        case 'Connect similar ideas':
          connectIdeas();
          break;
        case 'View most connected ideas':
          viewMostConnectedIdeas();
          break;
        case 'Generate random idea chain':
          generateRandomChain();
          break;
        case 'Search ideas':
          await searchIdeas();
          break;
        case 'Import from CSV':
          await importFromCSV();
          break;
        case 'Exit wizard':
          console.log(chalk.blue('Thank you for using the Creative Writing Wizard!'));
          return;
      }
    }
  });

async function addIdea() {
  const { content } = await inquirer.prompt([
    {
      type: 'input',
      name: 'content',
      message: 'Enter your idea:'
    }
  ]);
  const { tags } = await inquirer.prompt([
    {
      type: 'input',
      name: 'tags',
      message: 'Enter tags (comma-separated):'
    }
  ]);
  const id = brain.addLeaf(content, tags.split(',').map(tag => tag.trim()));
  console.log(chalk.green(`🌿 Added idea with ID: ${id}`));
  brain.saveData(dataFile);
}

function viewAllIdeas() {
  const ideas = brain.getAllLeaves();
  ideas.forEach(idea => {
    console.log(chalk.yellow(`ID: ${idea.id}`));
    console.log(chalk.green(`🍃 Content: ${idea.content}`));
    console.log(chalk.cyan(`🏷️  Tags: ${Array.from(idea.tags).join(', ')}`));
    console.log('---');
  });
}

function connectIdeas() {
  brain.connectSimilarLeaves(2);
  console.log(chalk.green("🔗 Connected ideas with 2 or more common tags."));
  brain.saveData(dataFile);
}

function viewMostConnectedIdeas() {
  const connectedIdeas = brain.getMostConnectedLeaves(5);
  connectedIdeas.forEach(idea => {
    const connections = brain.stem.getConnectedLeaves(idea.id);
    console.log(chalk.cyan(`🌿 "${idea.content}" (${connections.length} connections)`));
    console.log(chalk.magenta(`🏷️  Tags: ${Array.from(idea.tags).join(', ')}`));
    console.log('---');
  });
}

function generateRandomChain() {
  const chain = brain.getRandomConnectedChain();
  console.log(chalk.magenta("🔗 Random idea chain:"));
  chain.forEach(idea => console.log(chalk.green(`🍃 ${idea.content}`)));
}

async function searchIdeas() {
  const { query } = await inquirer.prompt([
    {
      type: 'input',
      name: 'query',
      message: 'Enter search query:'
    }
  ]);
  const results = brain.getLeavesByContent(query);
  if (results.length > 0) {
    console.log(chalk.yellow("🔍 Search results:"));
    results.forEach(idea => {
      console.log(chalk.green(`🍃 "${idea.content}"`));
      console.log(chalk.cyan(`🏷️  Tags: ${Array.from(idea.tags).join(', ')}`));
      console.log('---');
    });
  } else {
    console.log(chalk.red("No results found."));
  }
}

async function importFromCSV() {
  const { csvPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'csvPath',
      message: 'Enter the path to the CSV file:'
    }
  ]);
  try {
    await brain.importFromCSV(csvPath);
    console.log(chalk.green('🌿 Successfully imported data from CSV'));
    brain.saveData(dataFile);
  } catch (error) {
    console.error(chalk.red(`Error importing CSV: ${error.message}`));
  }
}

function displayCustomHelp() {
  console.log(chalk.blue('\n🌿 Welcome to Rosemary - Your Knowledge Management Tool 🌿\n'));
  console.log(chalk.blue('\n----\n'));
  console.log(chalk.yellow('Available Commands:'));
  console.log(chalk.green('  add') + '                 Add a new leaf interactively');
  console.log(chalk.green('  report') + '              Print a report of all leaves');
  console.log(chalk.green('  search <query>') + '      Search leaves by content');
  console.log(chalk.green('  connect <id1> <id2>') + ' Connect two leaves');
  console.log(chalk.green('  related <id>') + '        Get related leaves');
  console.log(chalk.green('  import-csv [filepath]') + ' Import data from a CSV file');
  console.log(chalk.green('  creative-wizard') + '     Start the Creative Writing Wizard');
  console.log('\nUse ' + chalk.cyan('rosemary [command] --help') + ' for more information about a command.');
}

program
  .option('-h, --help', 'display help for command', displayCustomHelp)
  .action(() => {
    if (!process.argv.slice(2).length) {
      displayCustomHelp();
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  displayCustomHelp();
}