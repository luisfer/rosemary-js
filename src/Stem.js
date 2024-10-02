/**
 * Represents a Stem in the Rosemary knowledge graph.
 * A Stem manages connections between Leaves.
 */
class Stem {
  /**
   * Creates a new Stem instance.
   */
  constructor() {
    this.connections = new Map();
  }

  /**
   * Adds a bidirectional connection between two leaves.
   * @param {string} leafId1 - ID of the first leaf.
   * @param {string} leafId2 - ID of the second leaf.
   * @param {string} [relationshipType=''] - Type of relationship between the leaves.
   */
  addConnection(leafId1, leafId2, relationshipType = '') {
    this._ensureLeafConnection(leafId1, leafId2, relationshipType);
    this._ensureLeafConnection(leafId2, leafId1, relationshipType);
  }

  /**
   * Helper method to ensure a leaf connection exists.
   * @private
   * @param {string} fromLeafId - ID of the source leaf.
   * @param {string} toLeafId - ID of the target leaf.
   * @param {string} relationshipType - Type of relationship.
   */
  _ensureLeafConnection(fromLeafId, toLeafId, relationshipType) {
    if (!this.connections.has(fromLeafId)) {
      this.connections.set(fromLeafId, new Map());
    }
    this.connections.get(fromLeafId).set(toLeafId, relationshipType);
  }

  /**
   * Retrieves all leaves connected to a given leaf.
   * @param {string} leafId - ID of the leaf to get connections for.
   * @returns {Array} An array of [connectedLeafId, relationshipType] pairs.
   */
  getConnectedLeaves(leafId) {
    return Array.from(this.connections.get(leafId) || []);
  }

  /**
   * Converts the Stem to a JSON-friendly object.
   * @returns {Object[]} An array of connection objects.
   */
  toJSON() {
    return Array.from(this.connections.entries()).map(([leafId, connections]) => ({
      leafId,
      connections: Array.from(connections.entries())
    }));
  }

  /**
   * Creates a new Stem instance from a JSON object.
   * @param {Object[]} json - The JSON object to create the Stem from.
   * @returns {Stem} A new Stem instance.
   */
  static fromJSON(json) {
    const stem = new Stem();
    json.forEach(({ leafId, connections }) => {
      stem.connections.set(leafId, new Map(connections));
    });
    return stem;
  }

  /**
   * Removes all connections for a given leaf.
   * @param {string} leafId - ID of the leaf to remove connections for.
   */
  removeLeafConnections(leafId) {
    this.connections.delete(leafId);
    for (const connections of this.connections.values()) {
      connections.delete(leafId);
    }
  }

  /**
   * Checks if a connection exists between two leaves.
   * @param {string} leafId1 - ID of the first leaf.
   * @param {string} leafId2 - ID of the second leaf.
   * @returns {boolean} True if a connection exists, false otherwise.
   */
  hasConnection(leafId1, leafId2) {
    return this.connections.has(leafId1) && this.connections.get(leafId1).has(leafId2);
  }

  /**
   * Gets the relationship type between two leaves.
   * @param {string} leafId1 - ID of the first leaf.
   * @param {string} leafId2 - ID of the second leaf.
   * @returns {string|null} The relationship type, or null if no connection exists.
   */
  getRelationshipType(leafId1, leafId2) {
    if (this.hasConnection(leafId1, leafId2)) {
      return this.connections.get(leafId1).get(leafId2);
    }
    return null;
  }

  /**
   * Gets the total number of unique connections in the Stem.
   * @returns {number} The total number of unique connections.
   */
  getTotalConnections() {
    let totalConnections = 0;
    for (const connections of this.connections.values()) {
      totalConnections += connections.size;
    }
    return totalConnections / 2; // Divide by 2 because connections are bidirectional
  }
}

module.exports = Stem;