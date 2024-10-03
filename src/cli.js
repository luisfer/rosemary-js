#!/usr/bin/env node

const { program } = require('commander');
const Rosemary = require('./Rosemary');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

program
  .option('-d, --data-file <path>', 'specify the data file location')
  .parse(process.argv);

const brain = new Rosemary();
brain.loadData();

// Command to add a new leaf interactively
program
  .command('add')
  .description('Add a new leaf')
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
    brain.saveData();
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
      brain.saveData();
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

// Command to delete a leaf
program
  .command('delete <id>')
  .description('Delete a leaf')
  .action((id) => {
    try {
      brain.deleteLeaf(id);
      console.log(chalk.green(`Leaf with ID ${id} has been deleted.`));
      brain.saveData();
    } catch (error) {
      console.error(chalk.red(error.message));
    }
  });

// Command to clear all data
program
  .command('clear')
  .description('Clear all data and start fresh')
  .action(async () => {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to clear all your ideas? This action cannot be undone.',
        default: false
      }
    ]);

    if (confirm) {
      brain.clearAllData();
      console.log(chalk.green('All data has been cleared. You now have a fresh Rosemary.js setup.'));
    } else {
      console.log(chalk.yellow('Operation cancelled. Your data remains intact.'));
    }
  });

// Easter egg: rosemary rosemary
program
  .command('rosemary')
  .description('Learn about Rosemary')
  .action(() => {
    console.log(chalk.green('\n🌿 About Rosemary.js:'));
    console.log(chalk.cyan('Rosemary.js is a knowledge management tool that helps you organize and connect your ideas.'));
    console.log(chalk.cyan('It allows you to create "leaves" of information, tag them, and connect related concepts.'));
    console.log(chalk.cyan('\nHow to use Rosemary.js:'));
    console.log(chalk.cyan('1. Add new leaves with the "add" command'));
    console.log(chalk.cyan('2. Connect related leaves using the "connect" command'));
    console.log(chalk.cyan('3. Search your knowledge base with the "search" command'));
    console.log(chalk.cyan('4. Explore related ideas with the "related" command'));
    console.log(chalk.cyan('\nBenefits of using Rosemary.js:'));
    console.log(chalk.cyan('- Organize your thoughts and ideas efficiently'));
    console.log(chalk.cyan('- Discover connections between different concepts'));
    console.log(chalk.cyan('- Easily retrieve and expand your knowledge'));
    console.log(chalk.cyan('- Enhance your creativity and problem-solving skills'));
    console.log(chalk.blue('\n----\n'));
  });

// Easter egg: rosemary hello
program
  .command('hello')
  .description('Get a friendly greeting')
  .action(() => {
    console.log(chalk.blue('\n🌟 Hello! You are amazing, and you matter! 🌟'));
    console.log(chalk.yellow('Wishing you a fantastic day filled with inspiration and joy!'));
    console.log(chalk.green('Remember, every small step forward is progress. Keep growing! 🌱\n'));
  });

function displayCustomHelp() {
  console.log(chalk.blue('\n🌿 Welcome to Rosemary - Your Knowledge Management Tool 🌿\n'));
  console.log(chalk.blue('\n----\n'));
  console.log(chalk.yellow('Available Commands:'));
  console.log(chalk.green('  add') + '                 Add a new leaf interactively');
  console.log(chalk.green('  report') + '              Print a report of all leaves');
  console.log(chalk.green('  search <query>') + '      Search leaves by content');
  console.log(chalk.green('  connect <id1> <id2>') + ' Connect two leaves');
  console.log(chalk.green('  related <id>') + '        Get related leaves');
  console.log(chalk.green('  delete <id>') + '         Delete a leaf');
  console.log(chalk.green('  clear') + '               Clear all data and start fresh');
  console.log(chalk.green('  import-csv [filepath]') + ' Import data from a CSV file');
  console.log(chalk.green('  export-csv [filepath]') + ' Export data to a CSV file');
  console.log(chalk.green('  creative-wizard') + '     Start the Creative Writing Wizard');
  console.log(chalk.green('  rosemary') + '            Learn about Rosemary.js');
  console.log(chalk.green('  hello') + '               Get a friendly greeting');
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