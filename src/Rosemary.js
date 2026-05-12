const Leaf = require('./Leaf');
const Stem = require('./Stem');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const marked = require('marked');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const Fuse = require('fuse.js');
const chalk = require('chalk');
const os = require('os');
const {
  RESERVED_EDGE_TYPES,
  isReservedEdgeType,
  isTransitiveEdgeType
} = require('./edges');

const SCHEMA_VERSION = 2;

class Rosemary {
  constructor(options = {}) {
    this.dataFile = options.dataFile || path.join(process.cwd(), 'rosemary-data.json');
    this.leaves = new Map();
    this.stem = new Stem();
    this.tags = new Set();
    this.autoSave = options.autoSave !== undefined ? options.autoSave : true;
    this.schemaVersion = SCHEMA_VERSION;
  }

  /**
   * Loads data from a file into the Rosemary instance.
   * @param {string} dataFile - The path to the data file.
   */
  loadData(dataFile = this.dataFile) {
    if (fs.existsSync(dataFile)) {
      const jsonData = fs.readFileSync(dataFile, 'utf8');
      this.importData(jsonData);
    } else {
      console.log(chalk.yellow(`No existing data found at ${dataFile}. Initializing with default structure.`));
      this.initializeDefaultData();
    }
  }

  /**
   * Saves the current Rosemary data to a file.
   */
  saveData() {
    if (!this.autoSave) return;

    const data = this.createExportData();

    const jsonData = JSON.stringify(data, null, 2);
   
    fs.writeFileSync(this.dataFile, jsonData);
    console.log(chalk.green(`Data saved to ${this.dataFile}`));
  }

  // Leaf Management Methods
  // ----------------------

  /**
   * Adds a new leaf to the Rosemary instance.
   * @param {string} content - The content of the leaf.
   * @param {string[]} tags - An array of tags for the leaf.
   * @param {Object} metadata - Free-form metadata for the leaf.
   * @returns {string} The ID of the newly created leaf.
   */
  addLeaf(content, tags = [], metadata = {}) {
    const id = this.generateId();
    const leaf = new Leaf(id, content, tags, metadata);
    this.leaves.set(id, leaf);
    this.addTags(tags);
    if (this.autoSave) this.saveData();
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
    if (this.autoSave) this.saveData();
  }

  /**
   * Retrieves leaves connected to a given leaf.
   * @param {string} leafId - The ID of the leaf to find connections for.
   * @returns {Leaf[]} An array of connected leaves.
   */
  getLeavesByConnection(leafId) {
    const connectedIds = this.stem.getConnectedLeaves(leafId).map(([id]) => id);
    return connectedIds.map(id => this.getLeafById(id));
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
    if (this.autoSave) this.saveData();
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
   * @param {string} a - First tag to compare.
   * @param {string} b - Second tag to compare.
   * @param {string} lowercasePartial - Lowercase partial tag for comparison.
   * @returns {number} Comparison result for sorting.
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
    if (leafId1 === leafId2) {
      console.warn(chalk.yellow('Cannot connect a leaf to itself.'));
      return;
    }
    if (!this.leaves.has(leafId1)) {
      throw new Error(`Leaf with id ${leafId1} not found`);
    }
    if (!this.leaves.has(leafId2)) {
      throw new Error(`Leaf with id ${leafId2} not found`);
    }
    this.stem.addConnection(leafId1, leafId2, relationshipType);
    if (this.autoSave) {
      this.saveData();
    }
  }

  /**
   * Connects two leaves with a directed relationship.
   * @param {string} fromLeafId - The source leaf ID.
   * @param {string} toLeafId - The target leaf ID.
   * @param {string} relationshipType - The type of relationship.
   */
  connectDirectedLeaves(fromLeafId, toLeafId, relationshipType = '') {
    if (fromLeafId === toLeafId) {
      console.warn(chalk.yellow('Cannot connect a leaf to itself.'));
      return;
    }
    this.validateLeafIds(fromLeafId, toLeafId);
    this.stem.addDirectedConnection(fromLeafId, toLeafId, relationshipType);
    if (this.autoSave) {
      this.saveData();
    }
  }

  /**
   * Checks whether a relationship type is part of the reserved vocabulary.
   * @param {string} relationshipType - Relationship type to check.
   * @returns {boolean}
   */
  isReservedEdgeType(relationshipType) {
    return isReservedEdgeType(relationshipType);
  }

  /**
   * Infers all leaves reachable over a transitive relationship type.
   * @param {string} leafId - Starting leaf ID.
   * @param {string} relationshipType - Relationship type to traverse.
   * @returns {Object[]} Inferred leaves with distance and path.
   */
  infer(leafId, relationshipType = RESERVED_EDGE_TYPES.IMPLIES) {
    this.validateLeafIds(leafId);
    if (!isTransitiveEdgeType(relationshipType)) {
      return [];
    }

    const results = [];
    const visited = new Set([leafId]);
    const queue = [[leafId, 0, [leafId]]];

    while (queue.length > 0) {
      const [currentId, distance, pathSoFar] = queue.shift();
      const connections = this.stem.getConnectedLeaves(currentId)
        .filter(([, type]) => type === relationshipType);

      for (const [nextId] of connections) {
        if (visited.has(nextId)) continue;
        const path = [...pathSoFar, nextId];
        visited.add(nextId);
        results.push({
          leaf: this.getLeafById(nextId),
          relationship: relationshipType,
          distance: distance + 1,
          path
        });
        queue.push([nextId, distance + 1, path]);
      }
    }

    return results;
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
    const leaf = this.getLeafById(leafId);
    if (!leaf) {
      throw new Error(`Leaf with id ${leafId} not found`);
    }

    const relatedLeaves = new Set();
    const queue = [[leafId, 0]];
    const visited = new Set([leafId]);

    while (queue.length > 0) {
      const [currentId, distance] = queue.shift();

      if (distance > 0) {
        relatedLeaves.add(this.getLeafById(currentId));
      }

      if (distance < maxDistance) {
        const connections = this.stem.getConnectedLeaves(currentId);
        for (const [connectedId] of connections) {
          if (!visited.has(connectedId)) {
            queue.push([connectedId, distance + 1]);
            visited.add(connectedId);
          }
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
      schemaVersion: this.schemaVersion,
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
      this.importData(fs.readFileSync(filename, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to import from JSON: ${error.message}`);
    }
  }

  /**
   * Exports the Rosemary data to a CSV file.
   * @param {string} filename - The name of the file to export to.
   */
  exportToCSV(filename, { delimiter = ',' } = {}) {
    const csvWriter = this.createCsvWriter(filename, delimiter);
    const records = this.createCsvRecords({ delimiter });
    
    csvWriter.writeRecords(records)
      .then(() => console.log('CSV file was written successfully'));
  }

  /**
   * Creates a CSV writer.
   * @param {string} filename - The name of the file to write to.
   * @returns {Object} The CSV writer object.
   */
  createCsvWriter(filename, delimiter) {
    return createObjectCsvWriter({
      path: filename,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'content', title: 'Content' },
        { id: 'tags', title: 'Tags' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'lastModified', title: 'Last Modified' }
      ],
      fieldDelimiter: delimiter
    });
  }

  /**
   * Creates CSV records from the Rosemary data.
   * @returns {Object[]} An array of CSV record objects.
   */
  createCsvRecords({ delimiter = ',' } = {}) {
    return this.getAllLeaves().map(leaf => ({
      id: leaf.id,
      content: leaf.content,
      tags: Array.from(leaf.tags).join(delimiter),
      createdAt: leaf.createdAt,
      lastModified: leaf.lastModified
    }));
  }

  /**
   * Imports Rosemary data from a CSV file.
   * @param {string} filename - The name of the file to import from.
   * @returns {Promise} A promise that resolves when import is complete.
   */
  importFromCSV(filename, { delimiter = ',' } = {}) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filename)
        .on('error', (error) => reject(new Error(`Failed to read CSV file: ${error.message}`)))
        .pipe(csv({ separator: delimiter }))  // Specify the separator
        .on('data', data => results.push(data))
        .on('error', (error) => reject(new Error(`Failed to parse CSV: ${error.message}`)))
        .on('end', () => {
          try {
            this.processCsvImport(results, { delimiter });
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
  processCsvImport(results, { delimiter = ',' } = {}) {
    results.forEach(row => {
      const id = row.id || row.ID;
      const content = row.content || row.Content;
      const tagsRaw = row.tags || row.Tags || '';
      if (!id || !content) {
        console.warn(`Skipping invalid row: ${JSON.stringify(row)}`);
        return;
      }

      // Split tags by provided delimiter and trim whitespace
      const tags = tagsRaw ? String(tagsRaw).split(delimiter).map(tag => tag.trim()).filter(Boolean) : [];
      const leaf = new Leaf(id, content, tags);

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
    const crypto = require('crypto');
    return crypto.randomBytes(9).toString('base64url');
  }

  /**
   * Converts leaf content to HTML using Markdown.
   * @param {string} leafId - The ID of the leaf to convert.
   * @returns {string|null} The HTML content of the leaf, or null if not found.
   */
  getLeafContentAsHTML(leafId) {
    const leaf = this.getLeafById(leafId);
    if (!leaf) return null;
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);
    const raw = marked(leaf.content);
    return DOMPurify.sanitize(raw);
  }

  /**
   * Imports Rosemary data from a JSON string.
   * @param {string} jsonData - The JSON string to import.
   */
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.importObject(data);
    } catch (error) {
      console.error(chalk.red('Error importing data:'), error.message);
      this.leaves = new Map();
      this.stem = new Stem();
      this.tags = new Set();
    }
  }

  /**
   * Imports Rosemary data from a parsed object.
   * @param {Object} data - Parsed Rosemary data.
   */
  importObject(data = {}) {
    this.schemaVersion = SCHEMA_VERSION;
    this.leaves = new Map((data.leaves || []).map(leaf => [leaf.id, Leaf.fromJSON(leaf)]));
    this.stem = Stem.fromJSON(data.connections || []);
    this.tags = new Set(data.tags || this.collectTagsFromLeaves());
  }

  /**
   * Collects tags from all leaves.
   * @returns {string[]} Tags currently used by leaves.
   */
  collectTagsFromLeaves() {
    const tags = new Set();
    for (const leaf of this.leaves.values()) {
      leaf.tags.forEach(tag => tags.add(tag));
    }
    return Array.from(tags);
  }

  /**
   * Checks if the provided data is empty or invalid.
   * @param {Object} data - The data to check.
   * @returns {boolean} True if the data is empty or invalid, false otherwise.
   */
  isEmptyOrInvalidData(data) {
    return !data || !data.leaves || !Array.isArray(data.leaves) || data.leaves.length === 0;
  }

  /**
   * Initializes the Rosemary instance with default data.
   * @returns {string} The ID of the welcome leaf.
   */
  initializeDefaultData() {
    this.leaves = new Map();
    this.stem = new Stem();
    this.tags = new Set();
    
    const welcomeLeafId = this.addLeaf(
      "Welcome to Rosemary.js! This is your first leaf.",
      ["welcome", "rosemary"]
    );

    this.saveData();
    console.log(chalk.green('Default data initialized and saved.'));
    return welcomeLeafId;
  }

  /**
   * Logs a summary of the current Rosemary data.
   */
  logDataSummary() {
    console.log(chalk.cyan('Data Summary:'));
    console.log(chalk.cyan(`- Leaves: ${this.leaves.size}`));
    console.log(chalk.cyan(`- Tags: ${this.tags.size}`));
    console.log(chalk.cyan(`- Connections: ${this.stem.getTotalConnections()}`));
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
    return this.walk(startLeafId, maxLength, 'random');
  }

  /**
   * Walks through connected leaves using a selectable strategy.
   * @param {string|null} startLeafId - ID of the starting leaf.
   * @param {number} maxLength - Maximum number of leaves to return.
   * @param {string} mode - `random`, `tag-affinity`, `semantic-drift`, or `widest-bridge`.
   * @returns {Leaf[]} Ordered leaves in the walk.
   */
  walk(startLeafId = null, maxLength = 5, mode = 'random') {
    const allLeaves = this.getAllLeaves();
    if (allLeaves.length === 0 || maxLength <= 0) return [];

    let currentLeaf = startLeafId
      ? this.getLeafById(startLeafId)
      : allLeaves[Math.floor(Math.random() * allLeaves.length)];
    const chain = [currentLeaf];
    const usedLeafIds = new Set([currentLeaf.id]);

    for (let i = 1; i < maxLength; i++) {
      const connections = this.stem.getConnectedLeaves(currentLeaf.id)
        .filter(([id]) => !usedLeafIds.has(id));
      if (connections.length === 0) break;

      const nextLeafId = this.pickWalkNextLeaf(currentLeaf, connections, mode);
      currentLeaf = this.getLeafById(nextLeafId);
      chain.push(currentLeaf);
      usedLeafIds.add(currentLeaf.id);
    }

    return chain;
  }

  /**
   * Selects the next leaf for `walk`.
   * @private
   */
  pickWalkNextLeaf(currentLeaf, connections, mode) {
    if (mode === 'random') {
      return connections[Math.floor(Math.random() * connections.length)][0];
    }

    const scored = connections.map(([leafId]) => {
      const leaf = this.getLeafById(leafId);
      return {
        leafId,
        tagOverlap: this.countSharedTags(currentLeaf, leaf),
        degree: this.stem.getConnectedLeaves(leafId).length
      };
    });

    if (mode === 'tag-affinity' || mode === 'semantic-drift') {
      scored.sort((a, b) => b.tagOverlap - a.tagOverlap || b.degree - a.degree || a.leafId.localeCompare(b.leafId));
      return scored[0].leafId;
    }

    if (mode === 'widest-bridge') {
      scored.sort((a, b) => b.degree - a.degree || b.tagOverlap - a.tagOverlap || a.leafId.localeCompare(b.leafId));
      return scored[0].leafId;
    }

    throw new Error(`Unknown walk mode: ${mode}`);
  }

  /**
   * Counts shared tags between two leaves.
   * @param {Leaf} leafA - First leaf.
   * @param {Leaf} leafB - Second leaf.
   * @returns {number}
   */
  countSharedTags(leafA, leafB) {
    return Array.from(leafA.tags).filter(tag => leafB.tags.has(tag)).length;
  }

  /**
   * Finds the shortest typed path between two leaves.
   * @param {string} fromLeafId - Source leaf ID.
   * @param {string} toLeafId - Target leaf ID.
   * @returns {Object|null} Path with leaves and relationship explanations.
   */
  bridge(fromLeafId, toLeafId) {
    this.validateLeafIds(fromLeafId, toLeafId);
    if (fromLeafId === toLeafId) {
      return {
        path: [this.getLeafById(fromLeafId)],
        relationships: [],
        distance: 0
      };
    }

    const visited = new Set([fromLeafId]);
    const queue = [[fromLeafId, [fromLeafId], []]];

    while (queue.length > 0) {
      const [currentId, pathSoFar, relationships] = queue.shift();
      for (const [nextId, type] of this.stem.getConnectedLeaves(currentId)) {
        if (visited.has(nextId)) continue;
        const nextPath = [...pathSoFar, nextId];
        const nextRelationships = [...relationships, { from: currentId, to: nextId, type }];
        if (nextId === toLeafId) {
          return {
            path: nextPath.map(id => this.getLeafById(id)),
            relationships: nextRelationships,
            distance: nextPath.length - 1
          };
        }
        visited.add(nextId);
        queue.push([nextId, nextPath, nextRelationships]);
      }
    }

    return null;
  }

  /**
   * Builds a simple network dataset for visualizations.
   * @returns {{ nodes: Array, edges: Array }}
   */
  buildNetworkDataset() {
    const nodes = this.getAllLeaves().map(leaf => ({ id: leaf.id, label: leaf.content.slice(0, 80), group: Array.from(leaf.tags)[0] || 'default' }));
    const edgesSet = new Set();
    for (const [fromId, connections] of this.stem.connections.entries()) {
      for (const [toId] of connections.entries()) {
        const key = fromId < toId ? `${fromId}::${toId}` : `${toId}::${fromId}`;
        if (!edgesSet.has(key)) edgesSet.add(key);
      }
    }
    const edges = Array.from(edgesSet).map(key => {
      const [a, b] = key.split('::');
      return { from: a, to: b };
    });
    return { nodes, edges };
  }

  /**
   * Performs a fuzzy search on leaves based on content and tags.
   * @param {string} query - The search query.
   * @param {Object} options - Additional options for the fuzzy search.
   * @returns {Array} An array of search results, each containing a leaf and its match score.
   */
  fuzzySearch(query, options = {}) {
    const leaves = Array.from(this.leaves.values()).map(leaf => ({ content: leaf.content, tags: Array.from(leaf.tags), leaf }));
    const fuseOptions = {
      keys: ['content', 'tags'],
      threshold: 0.4,
      ...options
    };
    const fuse = new Fuse(leaves, fuseOptions);
    return fuse.search(query).map(r => ({ ...r, item: r.item.leaf ? r.item.leaf : r.item }));
  }

  /**
   * Resolves a noisy input string to the closest leaf or tag.
   * @param {string} input - Input concept to resolve.
   * @param {Object} options - Resolution options.
   * @returns {Object} Canonical match, candidates, and confidence.
   */
  resolve(input, options = {}) {
    const query = String(input || '').trim();
    const normalized = query.toLowerCase();
    const limit = options.limit || 5;
    if (!normalized) {
      return { canonical: null, candidates: [], confidence: 0 };
    }

    const candidates = [];
    const addCandidate = (candidate) => {
      const key = `${candidate.type}:${candidate.id || candidate.name}`;
      const existing = candidates.find(item => item.key === key);
      if (existing) {
        existing.score = Math.max(existing.score, candidate.score);
        existing.reasons = Array.from(new Set([...existing.reasons, ...candidate.reasons]));
        return;
      }
      candidates.push({ key, ...candidate });
    };

    for (const leaf of this.leaves.values()) {
      const content = String(leaf.content || '').toLowerCase();
      if (content === normalized) {
        addCandidate({ type: 'leaf', id: leaf.id, leaf, score: 1, reasons: ['exact-content'] });
      } else if (content.includes(normalized)) {
        addCandidate({ type: 'leaf', id: leaf.id, leaf, score: 0.75, reasons: ['partial-content'] });
      }

      const aliases = Array.isArray(leaf.metadata.aliases) ? leaf.metadata.aliases : [];
      aliases.forEach(alias => {
        if (String(alias).toLowerCase() === normalized) {
          addCandidate({ type: 'leaf', id: leaf.id, leaf, score: 0.95, reasons: ['metadata-alias'] });
        }
      });

      for (const tag of leaf.tags) {
        const tagNormalized = tag.toLowerCase();
        if (tagNormalized === normalized) {
          addCandidate({ type: 'tag', name: tag, score: 0.92, reasons: ['exact-tag'] });
        } else if (tagNormalized.includes(normalized)) {
          addCandidate({ type: 'tag', name: tag, score: 0.7, reasons: ['partial-tag'] });
        }
      }
    }

    this.fuzzySearch(query, { threshold: options.threshold || 0.45, includeScore: true })
      .forEach(result => {
        addCandidate({
          type: 'leaf',
          id: result.item.id,
          leaf: result.item,
          score: Math.max(0, 1 - (result.score || 0)) * 0.85,
          reasons: ['fuzzy']
        });
      });

    for (const [fromId, connections] of this.stem.connections.entries()) {
      for (const [toId, type] of connections.entries()) {
        if (type !== RESERVED_EDGE_TYPES.AKA) continue;
        const from = this.getLeafById(fromId);
        const to = this.getLeafById(toId);
        if (from.content.toLowerCase() === normalized) {
          addCandidate({ type: 'leaf', id: to.id, leaf: to, score: 0.9, reasons: ['aka-edge'] });
        }
        if (to.content.toLowerCase() === normalized) {
          addCandidate({ type: 'leaf', id: from.id, leaf: from, score: 0.9, reasons: ['aka-edge'] });
        }
      }
    }

    const ranked = candidates
      .sort((a, b) => b.score - a.score || (a.id || a.name).localeCompare(b.id || b.name))
      .slice(0, limit)
      .map(({ key, ...candidate }) => candidate);

    return {
      canonical: ranked[0] || null,
      candidates: ranked,
      confidence: ranked[0] ? ranked[0].score : 0
    };
  }

  /**
   * Deletes a leaf from the Rosemary instance.
   * @param {string} id - The ID of the leaf to delete.
   * @returns {boolean} True if the leaf was successfully deleted, false otherwise.
   * @throws {Error} If the leaf with the given ID is not found.
   */
  deleteLeaf(id) {
    if (!this.leaves.has(id)) {
      throw new Error(`Leaf with ID ${id} not found.`);
    }

    const leafToDelete = this.leaves.get(id);

    // Remove connections
    this.stem.removeLeafConnections(id);

    // Remove tags that are exclusive to this leaf
    leafToDelete.tags.forEach(tag => {
      if (![...this.leaves.values()].some(leaf => leaf.id !== id && leaf.hasTag(tag))) {
        this.tags.delete(tag);
      }
    });

    // Remove the leaf
    this.leaves.delete(id);

    if (this.autoSave) {
      this.saveData();
    }
    return true;
  }

  /**
   * Clears all data in the Rosemary instance and reinitializes with default data.
   */
  clearAllData() {
    this.leaves = new Map();
    this.stem = new Stem();
    this.tags = new Set();
    this.saveData();
    this.initializeDefaultData();
  }

  /**
   * Updates a leaf's content and tags atomically.
   * @param {string} id - Leaf ID
   * @param {Object} updates
   * @param {string} [updates.content]
   * @param {string[]} [updates.tags]
   * @param {Object} [updates.metadata]
   */
  updateLeaf(id, updates = {}) {
    const leaf = this.getLeafById(id);
    if (!leaf) throw new Error(`Leaf with id ${id} not found`);
    if (typeof updates.content === 'string') {
      leaf.updateContent(updates.content);
    }
    if (Array.isArray(updates.tags)) {
      leaf.tags = new Set(updates.tags);
      this.tags = new Set(this.collectTagsFromLeaves());
    }
    if (updates.metadata && typeof updates.metadata === 'object') {
      leaf.updateMetadata(updates.metadata);
    }
    if (this.autoSave) this.saveData();
    return leaf;
  }

  /**
   * Returns the current Rosemary JSON schema version.
   * @returns {number}
   */
  getSchemaVersion() {
    return SCHEMA_VERSION;
  }

}

Rosemary.SCHEMA_VERSION = SCHEMA_VERSION;
Rosemary.RESERVED_EDGE_TYPES = RESERVED_EDGE_TYPES;

module.exports = Rosemary;