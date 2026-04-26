import { predict } from './predict';
import type { Entity, Relation } from '../types/domain';
import type { EntityPhysicsMap, RelationPropagationMap, Scenario } from '../types/simulation';

interface PredictWorkerMessage {
  entityPhysics: EntityPhysicsMap;
  relationPropagation: RelationPropagationMap;
  relations: Relation[];
  scenarios: Scenario[];
  entities: Entity[];
}

self.onmessage = ({ data }: MessageEvent<PredictWorkerMessage>) => {
  const { entityPhysics, relationPropagation, relations, scenarios, entities } = data;
  const predictions = predict(entityPhysics, relationPropagation, relations, scenarios, entities);
  self.postMessage(predictions);
};
