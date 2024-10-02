const Leaf = require('../Leaf');

describe('Leaf Class', () => {
  it('should create a leaf with given id, content, and tags', () => {
    const leaf = new Leaf('leaf1', 'Test content', ['tag1', 'tag2']);
    
    expect(leaf.id).toBe('leaf1');
    expect(leaf.content).toBe('Test content');
    expect(Array.from(leaf.tags)).toEqual(['tag1', 'tag2']);
    expect(leaf.createdAt).toBeDefined();
    expect(leaf.lastModified).toBeDefined();
  });

  it('should add a new tag correctly', async () => {
    const leaf = new Leaf('1', 'Test content');
    const initialLastModified = leaf.lastModified;
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    leaf.addTag('newTag');
    expect(Array.from(leaf.tags)).toContain('newTag');
    expect(leaf.lastModified).toBeGreaterThan(initialLastModified);
  });

  it('should correctly determine if it has a specific tag', () => {
    const leaf = new Leaf('leaf3', 'Content here', ['existingTag']);
    
    expect(leaf.hasTag('existingTag')).toBe(true);
    expect(leaf.hasTag('nonExistentTag')).toBe(false);
  });

  it('should serialize to JSON correctly', () => {
    const leaf = new Leaf('leaf4', 'Serialization test', ['jsonTag']);
    const json = leaf.toJSON();
    
    expect(json).toEqual({
      id: 'leaf4',
      content: 'Serialization test',
      tags: ['jsonTag'],
      createdAt: leaf.createdAt,
      lastModified: leaf.lastModified
    });
  });

  it('should deserialize from JSON correctly', () => {
    const json = {
      id: 'leaf5',
      content: 'Deserialization test',
      tags: ['deserializeTag'],
      createdAt: 1625077800000,
      lastModified: 1625077805000
    };
    
    const leaf = Leaf.fromJSON(json);
    
    expect(leaf.id).toBe('leaf5');
    expect(leaf.content).toBe('Deserialization test');
    expect(Array.from(leaf.tags)).toEqual(['deserializeTag']);
    expect(leaf.createdAt).toBe(1625077800000);
    expect(leaf.lastModified).toBe(1625077805000);
  });
});