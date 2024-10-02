const Stem = require('../Stem');

describe('Stem Class', () => {
  let stem;

  beforeEach(() => {
    stem = new Stem();
  });

  it('should add a connection between two leaves', () => {
    stem.addConnection('leaf1', 'leaf2', 'related');
    
    expect(stem.connections.has('leaf1')).toBe(true);
    expect(stem.connections.get('leaf1').get('leaf2')).toBe('related');
    expect(stem.connections.has('leaf2')).toBe(true);
    expect(stem.connections.get('leaf2').get('leaf1')).toBe('related');
  });

  it('should retrieve connected leaves correctly', () => {
    stem.addConnection('leaf1', 'leaf2', 'linked');
    stem.addConnection('leaf1', 'leaf3', 'associated');
    
    const connections = stem.getConnectedLeaves('leaf1');
    expect(connections.length).toBe(2);
    expect(connections).toContainEqual(['leaf2', 'linked']);
    expect(connections).toContainEqual(['leaf3', 'associated']);
  });

  it('should serialize to JSON correctly', () => {
    stem.addConnection('leaf1', 'leaf2', 'related');
    const json = stem.toJSON();
    
    expect(json).toEqual([
      {
        leafId: 'leaf1',
        connections: [['leaf2', 'related']]
      },
      {
        leafId: 'leaf2',
        connections: [['leaf1', 'related']]
      }
    ]);
  });

  it('should deserialize from JSON correctly', () => {
    const json = [
      {
        leafId: 'leaf1',
        connections: [['leaf2', 'related']]
      },
      {
        leafId: 'leaf2',
        connections: [['leaf1', 'related']]
      }
    ];
    
    const newStem = Stem.fromJSON(json);
    
    expect(newStem.connections.size).toBe(2);
    expect(newStem.connections.get('leaf1').get('leaf2')).toBe('related');
    expect(newStem.connections.get('leaf2').get('leaf1')).toBe('related');
  });
});