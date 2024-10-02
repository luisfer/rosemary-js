/**
 * Represents a Leaf in the Rosemary knowledge graph.
 * A Leaf contains content, tags, and metadata.
 */
class Leaf {
  /**
   * Creates a new Leaf instance.
   * @param {string} id - Unique identifier for the leaf.
   * @param {string} content - The main content of the leaf.
   * @param {string[]} [tags=[]] - Array of tags associated with the leaf.
   */
  constructor(id, content, tags = []) {
    this.id = id;
    this.content = content;
    this.tags = new Set(tags);
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
    const leaf = new Leaf(json.id, json.content, json.tags);
    leaf.createdAt = json.createdAt;
    leaf.lastModified = json.lastModified;
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