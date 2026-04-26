import type { Entity } from '../../types/domain';
import type { GraphContentConfig } from '../../types/config';

export function getGraphNodeClassNames(entity: Entity, graphConfig: GraphContentConfig | null) {
  const classes: string[] = [];

  const typeClass = graphConfig?.typeClasses?.[entity.type];
  if (typeClass) classes.push(typeClass);
  else if (entity.type === 'GoldenBatch') classes.push('anchor-card');
  else if (entity.type === 'SimulationScenario') classes.push('simulation-card');
  else if (entity.type === 'ExternalSystem') classes.push('system-card');
  else classes.push('process-card');

  const explicitClasses = graphConfig?.nodeClasses?.[entity.id] ?? [];
  classes.push(...explicitClasses);

  return classes;
}
