export const BUILDING_IDS = ['buy-sell', 'starter-apartment', 'real-estate', 'nursery'] as const;
export type BuildingId = typeof BUILDING_IDS[number];

export const BUILDING_GRAPHICS_ERAS = ['atari-bw', 'green-crt', 'atari-colour'] as const;
export type BuildingGraphicsEra = typeof BUILDING_GRAPHICS_ERAS[number];
export type BuildingOperationalState = 'operational' | 'vacant' | 'locked' | 'under-construction';

export interface BuildingProgress {
  operationalState: BuildingOperationalState;
  graphicsEra: BuildingGraphicsEra;
}

export type BuildingProgressState = Record<BuildingId, BuildingProgress>;

export const DEFAULT_BUILDING_PROGRESS: BuildingProgressState = {
  'buy-sell': { operationalState: 'operational', graphicsEra: 'green-crt' },
  'starter-apartment': { operationalState: 'operational', graphicsEra: 'green-crt' },
  'real-estate': { operationalState: 'operational', graphicsEra: 'green-crt' },
  nursery: { operationalState: 'vacant', graphicsEra: 'atari-bw' },
};

export type BuildingUpgradeRequirement =
  | { id: string; kind: 'building-graphics-era'; buildingId: BuildingId; minimumEra: BuildingGraphicsEra; playerLabel: string }
  | { id: string; kind: 'task-complete'; taskId: string; playerLabel: string }
  | { id: string; kind: 'coins'; amount: number; playerLabel: string };

export interface BuildingUpgradeDefinition {
  id: string;
  buildingId: BuildingId;
  targetEra: BuildingGraphicsEra;
  requirements: readonly BuildingUpgradeRequirement[];
}

// New upgrade definitions belong in this central registry. No future costs,
// rewards, ordering or cross-building dependencies are activated yet.
export const BUILDING_UPGRADES: readonly BuildingUpgradeDefinition[] = [];

export function graphicsEraRank(era: BuildingGraphicsEra): number {
  return BUILDING_GRAPHICS_ERAS.indexOf(era);
}

export function validateBuildingUpgradeDefinitions(definitions: readonly BuildingUpgradeDefinition[]): void {
  const ids = new Set<string>();
  const requirementIds = new Set<string>();
  for (const definition of definitions) {
    if (ids.has(definition.id)) throw new Error(`Duplicate building upgrade id: ${definition.id}`);
    ids.add(definition.id);
    for (const requirement of definition.requirements) {
      if (requirementIds.has(requirement.id)) throw new Error(`Duplicate building requirement id: ${requirement.id}`);
      requirementIds.add(requirement.id);
      if (requirement.kind === 'coins' && (!Number.isFinite(requirement.amount) || requirement.amount < 0)) {
        throw new Error(`Invalid coin requirement: ${requirement.id}`);
      }
    }
  }

  const producers = new Map<string, BuildingUpgradeDefinition>();
  for (const definition of definitions) {
    const key = `${definition.buildingId}:${definition.targetEra}`;
    if (producers.has(key)) throw new Error(`Multiple upgrades produce ${key}`);
    producers.set(key, definition);
  }

  const dependencies = new Map<string, string[]>();
  for (const definition of definitions) {
    const edges: string[] = [];
    for (const requirement of definition.requirements) {
      if (requirement.kind !== 'building-graphics-era') continue;
      if (graphicsEraRank(DEFAULT_BUILDING_PROGRESS[requirement.buildingId].graphicsEra) >= graphicsEraRank(requirement.minimumEra)) continue;
      const producer = definitions
        .filter((candidate) => candidate.buildingId === requirement.buildingId
          && graphicsEraRank(candidate.targetEra) >= graphicsEraRank(requirement.minimumEra))
        .sort((left, right) => graphicsEraRank(left.targetEra) - graphicsEraRank(right.targetEra))[0];
      if (!producer) throw new Error(`Building requirement ${requirement.id} has no reachable producer.`);
      edges.push(producer.id);
    }
    dependencies.set(definition.id, edges);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new Error(`Circular building upgrade dependency detected at ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of dependencies.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  definitions.forEach((definition) => visit(definition.id));
}

if (import.meta.env.DEV) validateBuildingUpgradeDefinitions(BUILDING_UPGRADES);
