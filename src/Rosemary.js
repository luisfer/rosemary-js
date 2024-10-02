const Leaf = require('./Leaf');
const Stem = require('./Stem');
const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const marked = require('marked');
const Fuse = require('fuse.js');

class Rosemary {
  constructor(options = {}) {
    this.leaves = new Map();
    this.stem = new Stem();
    this.tags = new Set();
  }

  // Leaf Management Methods
  // ----------------------

  /**
   * Adds a new leaf to the Rosemary instance.
   * @param {string} content - The content of the leaf.
   * @param {string[]} tags - An array of tags for the leaf.
   * @returns {string} The ID of the newly created leaf.
   */
  addLeaf(content, tags = []) {
    const id = this.generateId();
    const leaf = new Leaf(id, content, tags);
    this.leaves.set(id, leaf);
    this.addTags(tags);
    return id;
  }

  /**
   * Retrieves a leaf by its ID.
   * @param {string} id - The ID of the leaf to retrieve.
   * @returns {Leaf} The leaf object.
   * @throws {Error} If the leaf is not found.
   */
  getLeafById(id) {
    const leaf = this.leaves.get(id);
    if (!leaf) {
      throw new Error(`Leaf with id ${id} not found`);
    }
    return leaf;
  }

  /**
   * Retrieves all leaves in the Rosemary instance.
   * @returns {Leaf[]} An array of all leaf objects.
   */
  getAllLeaves() {
    return Array.from(this.leaves.values());
  }

  /**
   * Removes a leaf from the Rosemary instance.
   * @param {string} id - The ID of the leaf to remove.
   */
  removeLeaf(id) {
    const leaf = this.getLeafById(id);
    this.leaves.delete(id);
    
    leaf.tags.forEach(tag => {
      if (!this.getAllLeaves().some(l => l.hasTag(tag))) {
        this.tags.delete(tag);
      }
    });

    this.stem.removeLeafConnections(id);
  }

  // Tag Management Methods
  // ----------------------

  /**
   * Adds tags to the Rosemary instance.
   * @param {string[]} tags - An array of tags to add.
   */
  addTags(tags) {
    tags.forEach(tag => this.tags.add(tag));
  }

  /**
   * Adds tags to a specific leaf.
   * @param {string} leafId - The ID of the leaf to tag.
   * @param {...string} tags - The tags to add to the leaf.
   * @throws {Error} If the leaf is not found.
   */
  tagLeaf(leafId, ...tags) {
    const leaf = this.getLeafById(leafId);
    if (!leaf) throw new Error(`Leaf with id ${leafId} not found`);
    
    this.addTags(tags);
    tags.forEach(tag => leaf.addTag(tag));
  }

  /**
   * Retrieves all tags in the Rosemary instance.
   * @returns {Object[]} An array of tag info objects.
   */
  getAllTags() {
    return Array.from(this.tags).map(tag => this.createTagInfo(tag));
  }

  /**
   * Creates a tag info object for a given tag.
   * @param {string} tag - The tag to create info for.
   * @returns {Object} The tag info object.
   */
  createTagInfo(tag) {
    const leavesWithTag = this.getLeavesByTag(tag);
    return {
      name: tag,
      count: leavesWithTag.length,
      leaves: leavesWithTag.map(leaf => ({
        id: leaf.id,
        content: leaf.content
      }))
    };
  }

  /**
   * Retrieves leaves that have a specific tag.
   * @param {string} tag - The tag to search for.
   * @returns {Leaf[]} An array of leaves with the specified tag.
   */
  getLeavesByTag(tag) {
    return this.getAllLeaves().filter(leaf => leaf.hasTag(tag));
  }

  /**
   * Retrieves the most used tags.
   * @param {number} limit - The maximum number of tags to return.
   * @returns {Object[]} An array of tag info objects for the most used tags.
   */
  getMostUsedTags(limit = 5) {
    return this.getAllTags()
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Suggests tags based on a partial input.
   * @param {string} partialTag - The partial tag to use for suggestions.
   * @param {number} limit - The maximum number of suggestions to return.
   * @returns {string[]} An array of suggested tags.
   */
  suggestTags(partialTag, limit = 5) {
    const lowercasePartial = partialTag.toLowerCase();
    return Array.from(this.tags)
      .filter(tag => tag.toLowerCase().includes(lowercasePartial))
      .sort((a, b) => this.sortTags(a, b, lowercasePartial))
      .slice(0, limit);
  }

  /**
   * Helper method to sort tags for suggestions.
   * @private
   */
  sortTags(a, b, lowercasePartial) {
    const aStartsWith = a.toLowerCase().startsWith(lowercasePartial);
    const bStartsWith = b.toLowerCase().startsWith(lowercasePartial);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return a.localeCompare(b);
  }

  // Connection Management Methods
  // -----------------------------

  /**
   * Connects two leaves.
   * @param {string} leafId1 - The ID of the first leaf.
   * @param {string} leafId2 - The ID of the second leaf.
   * @param {string} relationshipType - The type of relationship between the leaves.
   */
  connectLeaves(leafId1, leafId2, relationshipType = '') {
    this.validateLeafIds(leafId1, leafId2);
    this.stem.addConnection(leafId1, leafId2, relationshipType);
  }

  /**
   * Validates that all provided leaf IDs exist.
   * @param {...string} leafIds - The leaf IDs to validate.
   * @throws {Error} If any leaf ID is not found.
   */
  validateLeafIds(...leafIds) {
    leafIds.forEach(id => {
      if (!this.leaves.has(id)) {
        throw new Error(`Leaf with id ${id} not found`);
      }
    });
  }

  /**
   * Retrieves leaves related to a given leaf.
   * @param {string} leafId - The ID of the leaf to find related leaves for.
   * @param {number} maxDistance - The maximum distance of relationship to consider.
   * @returns {Leaf[]} An array of related leaves.
   */
  getRelatedLeaves(leafId, maxDistance = 2) {
    const relatedLeaves = new Set();
    const queue = [[leafId, 0]];
    const visited = new Set();

    while (queue.length > 0) {
      const [currentId, distance] = queue.shift();
      if (distance > maxDistance) continue;

      visited.add(currentId);
      const connectedLeaves = this.stem.getConnectedLeaves(currentId);
      
      for (const [connectedId] of connectedLeaves) {
        if (!visited.has(connectedId)) {
          relatedLeaves.add(this.getLeafById(connectedId));
          queue.push([connectedId, distance + 1]);
        }
      }
    }

    return Array.from(relatedLeaves);
  }

  // Search and Sort Methods
  // -----------------------

  /**
   * Retrieves leaves that contain a specific string in their content.
   * @param {string} searchString - The string to search for in leaf content.
   * @returns {Leaf[]} An array of leaves that match the search string.
   */
  getLeavesByContent(searchString) {
    const lowerCaseSearch = searchString.toLowerCase();
    return this.getAllLeaves().filter(leaf => 
      leaf.content.toLowerCase().includes(lowerCaseSearch)
    );
  }

  /**
   * Sorts leaves using a provided sort function.
   * @param {Function} sortFunction - The function to use for sorting.
   * @returns {Leaf[]} An array of sorted leaves.
   */
  sortLeaves(sortFunction) {
    return this.getAllLeaves().sort(sortFunction);
  }

  /**
   * Retrieves leaves sorted by creation date.
   * @param {boolean} ascending - Whether to sort in ascending order.
   * @returns {Leaf[]} An array of leaves sorted by creation date.
   */
  getLeavesSortedByCreationDate(ascending = true) {
    return this.sortLeaves((a, b) => ascending ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
  }

  /**
   * Retrieves leaves sorted by last modified date.
   * @param {boolean} ascending - Whether to sort in ascending order.
   * @returns {Leaf[]} An array of leaves sorted by last modified date.
   */
  getLeavesSortedByLastModified(ascending = true) {
    return this.sortLeaves((a, b) => ascending ? a.lastModified - b.lastModified : b.lastModified - a.lastModified);
  }

  /**
   * Retrieves leaves sorted by tag count.
   * @param {boolean} ascending - Whether to sort in ascending order.
   * @returns {Leaf[]} An array of leaves sorted by tag count.
   */
  getLeavesSortedByTagCount(ascending = true) {
    return this.sortLeaves((a, b) => ascending ? a.tags.size - b.tags.size : b.tags.size - a.tags.size);
  }

  /**
   * Retrieves tags sorted by leaf count.
   * @param {boolean} ascending - Whether to sort in ascending order.
   * @returns {Object[]} An array of tag info objects sorted by leaf count.
   */
  getTagsSortedByLeafCount(ascending = true) {
    return this.getAllTags().sort((a, b) => ascending ? a.count - b.count : b.count - a.count);
  }

  /**
   * Retrieves leaves sorted by connection count.
   * @param {boolean} ascending - Whether to sort in ascending order.
   * @returns {Leaf[]} An array of leaves sorted by connection count.
   */
  getLeavesSortedByConnectionCount(ascending = true) {
    return this.getAllLeaves().sort((a, b) => {
      const aConnections = this.stem.getConnectedLeaves(a.id).length;
      const bConnections = this.stem.getConnectedLeaves(b.id).length;
      return ascending ? aConnections - bConnections : bConnections - aConnections;
    });
  }

  // Import/Export Methods
  // ---------------------

  /**
   * Exports the Rosemary data to a JSON file.
   * @param {string} filename - The name of the file to export to.
   */
  exportToJSON(filename) {
    const data = this.createExportData();
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  }

  /**
   * Creates the export data object.
   * @returns {Object} The export data object.
   */
  createExportData() {
    return {
      leaves: Array.from(this.leaves.values()).map(leaf => leaf.toJSON()),
      connections: this.stem.toJSON(),
      tags: Array.from(this.tags)
    };
  }

  /**
   * Imports Rosemary data from a JSON file.
   * @param {string} filename - The name of the file to import from.
   * @throws {Error} If import fails.
   */
  importFromJSON(filename) {
    try {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      this.leaves = new Map(data.leaves.map(leafData => [leafData.id, Leaf.fromJSON(leafData)]));
      this.stem = Stem.fromJSON(data.connections);
      this.tags = new Set(data.tags);
    } catch (error) {
      throw new Error(`Failed to import from JSON: ${error.message}`);
    }
  }

  /**
   * Exports the Rosemary data to a CSV file.
   * @param {string} filename - The name of the file to export to.
   */
  exportToCSV(filename) {
    const csvWriter = this.createCsvWriter(filename);
    const records = this.createCsvRecords();
    
    csvWriter.writeRecords(records)
      .then(() => console.log('CSV file was written successfully'));
  }

  /**
   * Creates a CSV writer.
   * @param {string} filename - The name of the file to write to.
   * @returns {Object} The CSV writer object.
   */
  createCsvWriter(filename) {
    return createObjectCsvWriter({
      path: filename,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'content', title: 'Content' },
        { id: 'tags', title: 'Tags' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'lastModified', title: 'Last Modified' }
      ]
    });
  }

  /**
   * Creates CSV records from the Rosemary data.
   * @returns {Object[]} An array of CSV record objects.
   */
  createCsvRecords() {
    return this.getAllLeaves().map(leaf => ({
      id: leaf.id,
      content: leaf.content,
      tags: Array.from(leaf.tags).join(';'),
      createdAt: leaf.createdAt,
      lastModified: leaf.lastModified
    }));
  }

  /**
   * Imports Rosemary data from a CSV file.
   * @param {string} filename - The name of the file to import from.
   * @returns {Promise} A promise that resolves when import is complete.
   */
  importFromCSV(filename) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filename)
        .on('error', (error) => reject(new Error(`Failed to read CSV file: ${error.message}`)))
        .pipe(csv({ separator: ',' }))  // Specify the separator if needed
        .on('data', data => results.push(data))
        .on('error', (error) => reject(new Error(`Failed to parse CSV: ${error.message}`)))
        .on('end', () => {
          try {
            this.processCsvImport(results);
            resolve();
          } catch (error) {
            reject(new Error(`Failed to import from CSV: ${error.message}`));
          }
        });
    });
  }

  /**
   * Processes CSV import data.
   * @param {Object[]} results - The parsed CSV data.
   */
  processCsvImport(results) {
    results.forEach(row => {
      if (!row.id || !row.content) {
        console.warn(`Skipping invalid row: ${JSON.stringify(row)}`);
        return;
      }

      // Split tags by comma and trim whitespace
      const tags = row.tags ? row.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      const leaf = new Leaf(row.id, row.content, tags);

      // We don't have 'Created At' or 'Last Modified' in this CSV, so we'll use current time
      leaf.createdAt = Date.now();
      leaf.lastModified = Date.now();

      this.leaves.set(leaf.id, leaf);
      this.addTags(tags);
    });
  }

  // Utility Methods
  // ---------------

  /**
   * Generates a unique ID.
   * @returns {string} A unique ID.
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Converts leaf content to HTML using Markdown.
   * @param {string} leafId - The ID of the leaf to convert.
   * @returns {string|null} The HTML content of the leaf, or null if not found.
   */
  getLeafContentAsHTML(leafId) {
    const leaf = this.getLeafById(leafId);
    return leaf ? marked(leaf.content) : null;
  }

  /**
   * Saves the current Rosemary data to a file.
   * @param {string} filename - The name of the file to save to.
   */
  saveData(filename) {
    const data = {
      leaves: Array.from(this.leaves.values()).map(leaf => leaf.toJSON()),
      connections: this.stem.toJSON(),
      tags: Array.from(this.tags)
    };

    const jsonData = JSON.stringify(data, null, 2);
   
    fs.writeFileSync(filename, jsonData);
  }

  /**
   * Loads Rosemary data from a file.
   * @param {string} filename - The name of the file to load from.
   */
  loadData(filename) {
    if (fs.existsSync(filename)) {
      const jsonData = fs.readFileSync(filename, 'utf8');
      this.importData(jsonData);
    }
  }

  /**
   * Imports Rosemary data from a JSON string.
   * @param {string} jsonData - The JSON string to import.
   */
  importData(jsonData) {
    const data = JSON.parse(jsonData);
    this.leaves = new Map(data.leaves.map(leafData => [leafData.id, Leaf.fromJSON(leafData)]));
    this.stem = Stem.fromJSON(data.connections);
    this.tags = new Set(data.tags);
  }

  /**
   * Connects leaves with similar tags.
   * @param {number} similarityThreshold - Minimum number of common tags to consider leaves similar.
   */
  connectSimilarLeaves(similarityThreshold = 1) {
    let connectionsMade = 0;
    const leaves = this.getAllLeaves();
    for (let i = 0; i < leaves.length; i++) {
      for (let j = i + 1; j < leaves.length; j++) {
        const commonTags = [...leaves[i].tags].filter(tag => leaves[j].tags.has(tag));
        if (commonTags.length >= similarityThreshold) {
          this.connectLeaves(leaves[i].id, leaves[j].id, `Common tags: ${commonTags.join(', ')}`);
          connectionsMade++;
        }
      }
    }
    console.log(`Connected ${connectionsMade} pairs of leaves based on similar tags.`);
  }

  /**
   * Retrieves the most connected leaves.
   * @param {number} limit - Maximum number of leaves to return.
   * @returns {Leaf[]} An array of the most connected leaves.
   */
  getMostConnectedLeaves(limit = 5) {
    return this.getLeavesSortedByConnectionCount(false).slice(0, limit);
  }

  /**
   * Generates a random chain of connected leaves.
   * @param {string|null} startLeafId - ID of the starting leaf (optional).
   * @param {number} maxLength - Maximum length of the chain.
   * @returns {Leaf[]} An array representing the chain of leaves.
   */
  getRandomConnectedChain(startLeafId = null, maxLength = 5) {
    let currentLeaf = startLeafId 
      ? this.getLeafById(startLeafId) 
      : this.getAllLeaves()[Math.floor(Math.random() * this.getAllLeaves().length)];
    const chain = [currentLeaf];
    const usedLeafIds = new Set([currentLeaf.id]);

    for (let i = 1; i < maxLength; i++) {
      const connections = this.stem.getConnectedLeaves(currentLeaf.id)
        .filter(conn => !usedLeafIds.has(conn[0]));
      if (connections.length === 0) break;
      const nextLeafId = connections[Math.floor(Math.random() * connections.length)][0];
      currentLeaf = this.getLeafById(nextLeafId);
      chain.push(currentLeaf);
      usedLeafIds.add(currentLeaf.id);
    }

    return chain;
  }

  /**
   * Performs a fuzzy search on leaves based on content and tags.
   * @param {string} query - The search query.
   * @param {Object} options - Additional options for the fuzzy search.
   * @returns {Array} An array of search results, each containing a leaf and its match score.
   */
  fuzzySearch(query, options = {}) {
    const leaves = Array.from(this.leaves.values());
    const fuseOptions = {
      keys: ['content', 'tags'],
      threshold: 0.4,
      ...options
    };
    const fuse = new Fuse(leaves, fuseOptions);
    return fuse.search(query);
  }
}

module.exports = Rosemary;