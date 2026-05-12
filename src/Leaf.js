/**
 * Represents a Leaf in the Rosemary knowledge graph.
 * A Leaf contains content, tags, metadata, and timestamps.
 */
class Leaf {
  /**
   * Creates a new Leaf instance.
   * @param {string} id - Unique identifier for the leaf.
   * @param {string} content - The main content of the leaf.
   * @param {string[]} [tags=[]] - Array of tags associated with the leaf.
   * @param {Object} [metadata={}] - Free-form metadata associated with the leaf.
   */
  constructor(id, content, tags = [], metadata = {}) {
    this.id = id;
    this.content = content;
    this.tags = new Set(tags);
    this.metadata = metadata && typeof metadata === 'object' ? { ...metadata } : {};
    this.createdAt = Date.now();
    this.lastModified = this.createdAt;
  }

  /**
   * Adds a new tag to the leaf.
   * @param {string} tag - The tag to add.
   */
  addTag(tag) {
    this.tags.add(tag);
    this.updateLastModified();
  }

  /**
   * Removes a tag from the leaf.
   * @param {string} tag - The tag to remove.
   * @returns {boolean} True if the tag was removed, false if it didn't exist.
   */
  removeTag(tag) {
    const removed = this.tags.delete(tag);
    if (removed) {
      this.updateLastModified();
    }
    return removed;
  }

  /**
   * Checks if the leaf has a specific tag.
   * @param {string} tag - The tag to check.
   * @returns {boolean} True if the leaf has the tag, false otherwise.
   */
  hasTag(tag) {
    return this.tags.has(tag);
  }

  /**
   * Updates the content of the leaf.
   * @param {string} newContent - The new content to set.
   */
  updateContent(newContent) {
    this.content = newContent;
    this.updateLastModified();
  }

  /**
   * Replaces the leaf metadata.
   * @param {Object} metadata - Free-form metadata to store on the leaf.
   */
  updateMetadata(metadata = {}) {
    this.metadata = metadata && typeof metadata === 'object' ? { ...metadata } : {};
    this.updateLastModified();
  }

  /**
   * Updates the last modified timestamp.
   */
  updateLastModified() {
    this.lastModified = Date.now();
  }

  /**
   * Converts the leaf to a JSON-friendly object.
   * @returns {Object} A plain JavaScript object representing the leaf.
   */
  toJSON() {
    return {
      id: this.id,
      content: this.content,
      tags: Array.from(this.tags),
      metadata: this.metadata,
      createdAt: this.createdAt,
      lastModified: this.lastModified
    };
  }

  /**
   * Creates a new Leaf instance from a JSON object.
   * @param {Object} json - The JSON object to create the leaf from.
   * @returns {Leaf} A new Leaf instance.
   */
  static fromJSON(json) {
    const leaf = new Leaf(json.id, json.content, json.tags || [], json.metadata || {});
    leaf.createdAt = json.createdAt || Date.now();
    leaf.lastModified = json.lastModified || leaf.createdAt;
    return leaf;
  }

  /**
   * Gets the age of the leaf in milliseconds.
   * @returns {number} The age of the leaf in milliseconds.
   */
  getAge() {
    return Date.now() - this.createdAt;
  }

  /**
   * Gets the time since last modification in milliseconds.
   * @returns {number} The time since last modification in milliseconds.
   */
  getTimeSinceLastModified() {
    return Date.now() - this.lastModified;
  }
}

module.exports = Leaf;