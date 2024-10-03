const Rosemary = require('../Rosemary');
const Leaf = require('../Leaf');
const Stem = require('../Stem');

describe('Rosemary Class', () => {
  let brain;

  beforeEach(() => {
    brain = new Rosemary({ autoSave: false });
  });

  it('should initialize with empty leaves, tags, and stem', () => {
    expect(brain.leaves.size).toBe(0);
    expect(brain.tags.size).toBe(0);
    expect(brain.stem.connections.size).toBe(0);
  });

  it('should add a new leaf correctly', () => {
    const id = brain.addLeaf('Test leaf content', ['test', 'leaf']);
    const leaf = brain.getLeafById(id);
    
    expect(leaf).toBeInstanceOf(Leaf);
    expect(leaf.content).toBe('Test leaf content');
    expect(Array.from(leaf.tags)).toEqual(['test', 'leaf']);
    expect(brain.leaves.size).toBe(1);
    expect(brain.tags.has('test')).toBe(true);
    expect(brain.tags.has('leaf')).toBe(true);
  });

  it('should tag a leaf correctly', () => {
    const id = brain.addLeaf('Another test leaf');
    brain.tagLeaf(id, 'newTag1', 'newTag2');
    
    const leaf = brain.getLeafById(id);
    expect(Array.from(leaf.tags)).toEqual(['newTag1', 'newTag2']);
    expect(brain.tags.has('newTag1')).toBe(true);
    expect(brain.tags.has('newTag2')).toBe(true);
  });

  it('should connect two leaves correctly', () => {
    const id1 = brain.addLeaf('Leaf one');
    const id2 = brain.addLeaf('Leaf two');
    
    brain.connectLeaves(id1, id2, 'related');
    
    expect(brain.stem.connections.get(id1).get(id2)).toBe('related');
    expect(brain.stem.connections.get(id2).get(id1)).toBe('related');
  });

  it('should retrieve all leaves correctly', () => {
    const id1 = brain.addLeaf('First leaf');
    const id2 = brain.addLeaf('Second leaf');
    
    const leaves = brain.getAllLeaves();
    expect(leaves.length).toBe(2);
    expect(leaves.map(l => l.id)).toContain(id1);
    expect(leaves.map(l => l.id)).toContain(id2);
  });

  it('should search leaves by content correctly', () => {
    const id1 = brain.addLeaf('JavaScript is awesome');
    const id2 = brain.addLeaf('I love coding in JavaScript');
    const id3 = brain.addLeaf('Python is also great');
    
    const results = brain.getLeavesByContent('javascript');
    expect(results.length).toBe(2);
    expect(results.map(l => l.id)).toContain(id1);
    expect(results.map(l => l.id)).toContain(id2);
  });

  it('should suggest tags based on partial input', () => {
    brain.addLeaf('Leaf one', ['javascript', 'coding']);
    brain.addLeaf('Leaf two', ['jest', 'testing']);
    brain.addLeaf('Leaf three', ['javascript', 'testing']);
    
    const suggestions = brain.suggestTags('test');
    expect(suggestions).toEqual(['testing']);
    
    const partialSuggestions = brain.suggestTags('ja');
    expect(partialSuggestions).toEqual(['javascript']);
  });

  it('should throw an error when tagging a non-existent leaf', () => {
    expect(() => {
      brain.tagLeaf('nonExistentId', 'tag1');
    }).toThrow('Leaf with id nonExistentId not found');
  });

  it('should throw an error when connecting non-existent leaves', () => {
    const brain = new Rosemary({ autoSave: false });
    const id1 = brain.addLeaf('Existing leaf');
    
    expect(() => {
      brain.connectLeaves(id1, 'nonExistentId', 'related');
    }).toThrow('Leaf with id nonExistentId not found');

    expect(() => {
      brain.connectLeaves('nonExistentId', id1, 'related');
    }).toThrow('Leaf with id nonExistentId not found');
  });

  it('should throw an error when getting a non-existent leaf', () => {
    expect(() => {
      brain.getLeafById('nonExistentId');
    }).toThrow('Leaf with id nonExistentId not found');
  });

  it('should remove a leaf correctly', () => {
    const id = brain.addLeaf('Leaf to remove', ['remove']);
    expect(brain.leaves.size).toBe(1);
    expect(brain.tags.has('remove')).toBe(true);

    brain.removeLeaf(id);
    expect(brain.leaves.size).toBe(0);
    expect(brain.tags.has('remove')).toBe(false);
  });

  it('should add tags correctly', () => {
    const brain = new Rosemary();
    brain.addTags(['tag1', 'tag2']);
    expect(brain.tags.size).toBe(2);
    expect(brain.tags.has('tag1')).toBe(true);
    expect(brain.tags.has('tag2')).toBe(true);
  });

  it('should tag a leaf correctly', () => {
    const brain = new Rosemary();
    const leafId = brain.addLeaf('Test content');
    brain.tagLeaf(leafId, 'tag1', 'tag2');
    const leaf = brain.getLeafById(leafId);
    expect(leaf.tags.size).toBe(2);
    expect(leaf.hasTag('tag1')).toBe(true);
    expect(leaf.hasTag('tag2')).toBe(true);
  });

  it('should connect leaves correctly', () => {
    const brain = new Rosemary();
    const leaf1 = brain.addLeaf('Leaf 1');
    const leaf2 = brain.addLeaf('Leaf 2');
    brain.connectLeaves(leaf1, leaf2, 'related');
    const connections = brain.stem.getConnectedLeaves(leaf1);
    expect(connections).toContainEqual([leaf2, 'related']);
  });

  it('should get leaves by tag correctly', () => {
    const brain = new Rosemary();
    const leaf1 = brain.addLeaf('Leaf 1', ['tag1']);
    const leaf2 = brain.addLeaf('Leaf 2', ['tag1', 'tag2']);
    const leaf3 = brain.addLeaf('Leaf 3', ['tag2']);
    const leavesWithTag1 = brain.getLeavesByTag('tag1');
    expect(leavesWithTag1.length).toBe(2);
    expect(leavesWithTag1.map(leaf => leaf.id)).toEqual(expect.arrayContaining([leaf1, leaf2]));
  });

  it('should get leaves by content correctly', () => {
    const brain = new Rosemary();
    brain.addLeaf('Apple pie recipe');
    brain.addLeaf('Banana bread recipe');
    brain.addLeaf('Apple juice');
    const appleLeaves = brain.getLeavesByContent('apple');
    expect(appleLeaves.length).toBe(2);
    expect(appleLeaves.map(leaf => leaf.content)).toEqual(
      expect.arrayContaining(['Apple pie recipe', 'Apple juice'])
    );
  });

  it('should get most used tags correctly', () => {
    const brain = new Rosemary();
    brain.addLeaf('Leaf 1', ['tag1', 'tag2', 'tag3']);
    brain.addLeaf('Leaf 2', ['tag1', 'tag2']);
    brain.addLeaf('Leaf 3', ['tag1']);
    const mostUsedTags = brain.getMostUsedTags(2);
    expect(mostUsedTags.length).toBe(2);
    expect(mostUsedTags[0].name).toBe('tag1');
    expect(mostUsedTags[0].count).toBe(3);
    expect(mostUsedTags[1].name).toBe('tag2');
    expect(mostUsedTags[1].count).toBe(2);
  });

  it('should get related leaves correctly', () => {
    const brain = new Rosemary();
    const leaf1 = brain.addLeaf('Leaf 1');
    const leaf2 = brain.addLeaf('Leaf 2');
    const leaf3 = brain.addLeaf('Leaf 3');
    brain.connectLeaves(leaf1, leaf2);
    brain.connectLeaves(leaf2, leaf3);
    const relatedLeaves = brain.getRelatedLeaves(leaf1);
    expect(relatedLeaves.length).toBe(2);
    expect(relatedLeaves.map(leaf => leaf.id)).toEqual(expect.arrayContaining([leaf2, leaf3]));
  });

  it('should sort leaves by creation date correctly', () => {
    const brain = new Rosemary();
    const leaf1 = brain.addLeaf('Leaf 1');
    const leaf2 = brain.addLeaf('Leaf 2');
    const leaf3 = brain.addLeaf('Leaf 3');
    const sortedLeaves = brain.getLeavesSortedByCreationDate();
    expect(sortedLeaves.map(leaf => leaf.id)).toEqual([leaf1, leaf2, leaf3]);
  });

  it('should export and import JSON correctly', () => {
    const brain = new Rosemary();
    brain.addLeaf('Leaf 1', ['tag1']);
    brain.addLeaf('Leaf 2', ['tag2']);
    const exportedData = brain.createExportData();
    const newBrain = new Rosemary();
    newBrain.importData(JSON.stringify(exportedData));
    expect(newBrain.leaves.size).toBe(2);
    expect(newBrain.tags.size).toBe(2);
  });

  it('should perform fuzzy search correctly', () => {
    const brain = new Rosemary();
    brain.addLeaf('JavaScript programming', ['coding', 'web']);
    brain.addLeaf('Python scripting', ['coding', 'automation']);
    brain.addLeaf('HTML markup', ['web', 'frontend']);

    const results = brain.fuzzySearch('javascript');
    expect(results.length).toBe(1);
    expect(results[0].item.content).toBe('JavaScript programming');

    const looseResults = brain.fuzzySearch('programming', { threshold: 0.8 });
    expect(looseResults.length).toBeGreaterThanOrEqual(1);
    expect(looseResults.map(r => r.item.content)).toContain('JavaScript programming');
  });

  it('should generate a random connected chain correctly', () => {
    const brain = new Rosemary();
    const id1 = brain.addLeaf('Leaf 1');
    const id2 = brain.addLeaf('Leaf 2');
    const id3 = brain.addLeaf('Leaf 3');
    brain.connectLeaves(id1, id2);
    brain.connectLeaves(id2, id3);

    const chain = brain.getRandomConnectedChain(id1, 3);
    expect(chain.length).toBeLessThanOrEqual(3);
    expect(chain[0].id).toBe(id1);
    expect(chain.map(leaf => leaf.id)).toContain(id2);
  });

  it('should connect similar leaves correctly', () => {
    const brain = new Rosemary();
    const id1 = brain.addLeaf('Leaf 1', ['tag1', 'tag2']);
    const id2 = brain.addLeaf('Leaf 2', ['tag2', 'tag3']);
    const id3 = brain.addLeaf('Leaf 3', ['tag3', 'tag4']);

    brain.connectSimilarLeaves(1);

    const connections1 = brain.stem.getConnectedLeaves(id1);
    const connections2 = brain.stem.getConnectedLeaves(id2);
    const connections3 = brain.stem.getConnectedLeaves(id3);

    expect(connections1.length).toBe(1);
    expect(connections2.length).toBe(2);
    expect(connections3.length).toBe(1);

    expect(connections1[0][0]).toBe(id2);
    expect(connections2.map(c => c[0])).toContain(id1);
    expect(connections2.map(c => c[0])).toContain(id3);
    expect(connections3[0][0]).toBe(id2);
  });

  it('should retrieve most connected leaves correctly', () => {
    const brain = new Rosemary();
    const id1 = brain.addLeaf('Leaf 1');
    const id2 = brain.addLeaf('Leaf 2');
    const id3 = brain.addLeaf('Leaf 3');
    const id4 = brain.addLeaf('Leaf 4');

    brain.connectLeaves(id1, id2);
    brain.connectLeaves(id1, id3);
    brain.connectLeaves(id1, id4);
    brain.connectLeaves(id2, id3);

    const mostConnected = brain.getMostConnectedLeaves(2);
    expect(mostConnected.length).toBe(2);
    expect(mostConnected[0].id).toBe(id1);
    expect(mostConnected[1].id).toBe(id2);
  });

  it('should throw an error when importing invalid JSON', () => {
    const brain = new Rosemary();
    expect(() => {
      brain.importFromJSON('nonexistent.json');
    }).toThrow('Failed to import from JSON');
  });

  it('should handle clearing all data correctly', () => {
    brain.addLeaf('Test leaf', ['tag1', 'tag2']);
    brain.clearAllData();
    expect(brain.leaves.size).toBe(1); // Because clearAllData initializes default data
    expect(brain.tags.size).toBe(2); // Default leaf has two tags
    expect(brain.stem.connections.size).toBe(0);
  });

  it('should handle deleting a leaf correctly', () => {
    const id1 = brain.addLeaf('Leaf 1', ['tag1']);
    const id2 = brain.addLeaf('Leaf 2', ['tag1', 'tag2']);
    brain.connectLeaves(id1, id2);

    brain.deleteLeaf(id1);

    expect(brain.leaves.size).toBe(1);
    expect(brain.leaves.has(id2)).toBe(true);
    expect(brain.tags.has('tag1')).toBe(true); // tag1 is still used by Leaf 2
    expect(brain.stem.connections.size).toBe(0);
  });

  it('should handle importing data with missing fields gracefully', () => {
    const brain = new Rosemary();
    const incompleteData = JSON.stringify({
      leaves: [{ id: 'leaf1', content: 'Test content' }],
      // missing connections and tags
    });

    brain.importData(incompleteData);

    expect(brain.leaves.size).toBe(1);
    expect(brain.stem.connections.size).toBe(0);
    expect(brain.tags.size).toBe(0);
  });

  it('should handle fuzzy search with no results gracefully', () => {
    const brain = new Rosemary();
    brain.addLeaf('Test content', ['tag1']);

    const results = brain.fuzzySearch('nonexistent');
    expect(results.length).toBe(0);
  });

  it('should handle getting related leaves for a leaf with no connections', () => {
    const brain = new Rosemary({ autoSave: false });
    const id = brain.addLeaf('Isolated leaf');

    const relatedLeaves = brain.getRelatedLeaves(id);
    expect(relatedLeaves.length).toBe(0);
  });

  it('should handle connecting a leaf to itself gracefully', () => {
    const brain = new Rosemary();
    const id = brain.addLeaf('Self-connected leaf');

    brain.connectLeaves(id, id);

    const connections = brain.stem.getConnectedLeaves(id);
    expect(connections.length).toBe(0);
  });

  it('should return connected leaves when getting related leaves', () => {
    const brain = new Rosemary({ autoSave: false });
    const id1 = brain.addLeaf('Leaf 1');
    const id2 = brain.addLeaf('Leaf 2');
    const id3 = brain.addLeaf('Leaf 3');

    brain.connectLeaves(id1, id2);
    brain.connectLeaves(id2, id3);

    const relatedLeaves = brain.getRelatedLeaves(id1);
    expect(relatedLeaves.length).toBe(2);
    expect(relatedLeaves.map(leaf => leaf.id)).toContain(id2);
    expect(relatedLeaves.map(leaf => leaf.id)).toContain(id3);
  });
});