const RESERVED_EDGE_TYPES = Object.freeze({
  IMPLIES: 'implies',
  PREREQUISITE_OF: 'prerequisite-of',
  SUBSET_OF: 'subset-of',
  CO_OCCURS_WITH: 'co-occurs-with',
  CONTRADICTS: 'contradicts',
  AKA: 'aka'
});

const TRANSITIVE_EDGE_TYPES = new Set([
  RESERVED_EDGE_TYPES.IMPLIES,
  RESERVED_EDGE_TYPES.PREREQUISITE_OF,
  RESERVED_EDGE_TYPES.SUBSET_OF,
  RESERVED_EDGE_TYPES.AKA
]);

function isReservedEdgeType(type) {
  return Object.values(RESERVED_EDGE_TYPES).includes(type);
}

function isTransitiveEdgeType(type) {
  return TRANSITIVE_EDGE_TYPES.has(type);
}

module.exports = {
  RESERVED_EDGE_TYPES,
  TRANSITIVE_EDGE_TYPES,
  isReservedEdgeType,
  isTransitiveEdgeType
};
