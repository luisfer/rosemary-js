export const RESERVED_EDGE_TYPES: Readonly<Record<string, string>>;
export const TRANSITIVE_EDGE_TYPES: ReadonlySet<string>;
export function isReservedEdgeType(type: string): boolean;
export function isTransitiveEdgeType(type: string): boolean;
