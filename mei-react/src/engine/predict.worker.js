// ── Prediction Engine Web Worker ───────────────────────────────────────────────
// Runs predict() off the main thread so physics simulation never blocks rendering.
//
// Protocol:
//   main → worker : { entityPhysics, relationPropagation, relations, scenarios, entities }
//   worker → main : prediction[] (the resolved array from predict())

import { predict } from './predict.js';

self.onmessage = ({ data }) => {
  const { entityPhysics, relationPropagation, relations, scenarios, entities } = data;
  const predictions = predict(entityPhysics, relationPropagation, relations, scenarios, entities);
  self.postMessage(predictions);
};
