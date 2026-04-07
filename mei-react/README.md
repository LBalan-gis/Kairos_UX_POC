# Mei · KairOS Rendering Engine

A multi-tenant, enterprise-ready process intelligence visualization engine. Decoupled from all company-specific configuration by design.

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  src/tenants/factory/index.js                                  │
│                                                                 │
│  FactoryConfig = {                                             │
│    entities, relations,   ← graph nodes & edges                 │
│    physics, propagation,  ← engine parameters                   │
│    scenarios,             ← prediction interventions            │
│    zoneMap, zoneLabels,   ← layout configuration                │
│    pinnedIds, liveIds,    ← board + signal config               │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │  passed as prop
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/main.jsx  →  <App config={FactoryConfig} />               │
└────────────────────────┬────────────────────────────────────────┘
                         │  useEffect on mount
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/App.jsx  →  initEngine(config)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │  single store write
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/store/useAppStore.js  (Zustand)                            │
│                                                                 │
│  State populated by initEngine():                               │
│    entities, relations, entityMap                               │
│    entityPhysics, relationPropagation                           │
│    scenarios, predictions   ← predict() runs here once          │
│    zoneMap, zoneLabels, liveIds                                 │
│    pinnedIds, visibleIds                                        │
│                                                                 │
│  Runtime state (user interactions):                             │
│    positions, focusId, focusNeighborhood                        │
│    simulatedTime, activeScenario                                │
│    signalTimestamps                                             │
│                                                                 │
│  Persisted to localStorage (positions + dark only):             │
│    mei_graph_state_v16                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │  useAppStore(s => s.xyz)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Components & Hooks  (read-only from store)                     │
│                                                                 │
│  GraphWhiteboardLayer  ← graph canvas, drag, focus              │
│  ├── ZoneSwimlanes     ← lane backgrounds (zoneMap, zoneLabels) │
│  ├── EdgeLayer         ← SVG edges (edgeStyle.js)               │
│  ├── NodeLayer                                                  │
│  │   └── NodeCard      ← draggable cards (Framer Motion)        │
│  └── MiniMap           ← overview thumbnail                     │
│                                                                 │
│  FloorMapLayer         ← 3D factory floor (Three.js / R3F)      │
│                                                                 │
│  useLiveSignal         ← ticks signalTimestamps (liveIds)       │
│  useLayout             ← computes card positions (zoneMap)      │
└─────────────────────────────────────────────────────────────────┘
```

### Engine pipeline (pure functions — no React, no side effects)

```
src/engine/predict.js
  predict(entityPhysics, relationPropagation, relations, scenarios, entities)
    → runs at initEngine() time
    → returns sampled timeline per scenario (steps × entity states)
    → consumed by GraphWhiteboardLayer for scrubber overlays

src/engine/relations.js
  buildProjectionRelations(entities, relations)
    → pure filter — scopes visible edges to the current board
    → called each render inside GraphWhiteboardLayer
```

---

## SOLID Principles Applied

### S — Single Responsibility

Each module has exactly one reason to change.

| Module | Responsibility |
|--------|---------------|
| `tenants/factory/` | Factory-specific data only |
| `engine/predict.js` | Prediction algorithm only |
| `engine/relations.js` | Relation filtering algorithm only |
| `store/useAppStore.js` | Runtime state management only |
| `components/graph/edgeStyle.js` | Edge rendering constants only |
| `NodeCard.jsx` | Single card render + drag gesture only |
| `EdgeLayer.jsx` | SVG edge rendering only |
| `ZoneSwimlanes.jsx` | Lane background bands only |

`data/entities.js` previously violated SRP by mixing entity data, `EDGE_STYLE` (rendering), and `buildProjectionRelations` (algorithm). All three are now separated into their correct modules.

---

### O — Open / Closed

The engine is open for extension (new tenants) and closed for modification (no engine files change when a tenant is added).

To add a new tenant:
1. Create `src/tenants/company_b/index.js` with a `CompanyBConfig` object
2. Change one line in `main.jsx`

No engine, component, hook, or store file is touched.

---

### L — Liskov Substitution

Any config object satisfying the config shape can replace `FactoryConfig` without breaking the application:

```js
// Config shape
{
  entities:    Entity[],
  relations:   Relation[],
  physics:     Record<string, PhysicsDef>,
  propagation: Record<string, PropagationDef>,
  scenarios:   Scenario[],
  zoneMap:     Record<string, string>,     // entityId → zone letter
  zoneLabels:  Record<string, string>,     // zone letter → display label
  pinnedIds:   string[],
  liveIds:     string[],
}
```

A `CompanyBConfig` with a different factory, physics, and zone structure — substituted into `<App config={...} />` — produces a correctly functioning application with no other changes.

---

### I — Interface Segregation

Components receive only the slices of store state they need. No component subscribes to the whole store.

```js
// ZoneSwimlanes only needs zone rendering data — passed as props
<ZoneSwimlanes zoneMap={zoneMap} zoneLabels={zoneLabels} ... />

// EdgeLayer only needs edge rendering constants — local import
import { EDGE_STYLE } from './edgeStyle';

// useLiveSignal only needs two things
const liveIds    = useAppStore((s) => s.liveIds);
const bumpSignal = useAppStore((s) => s.bumpSignal);
```

---

### D — Dependency Inversion

High-level modules (components, hooks, engine) depend on abstractions (the store interface, the config shape), not on concrete data files.

**Before:**
```
GraphWhiteboardLayer  →  import { ZONE_MAP } from '../data/zoneMap'
useLiveSignal         →  import { LIVE_IDS } from '../data/zoneMap'
FloorMapLayer         →  import { RELATION_PROPAGATION } from '../data/physics'
predict.js            →  import { ENTITIES } from '../data/entities'
```

**After:**
```
GraphWhiteboardLayer  →  useAppStore((s) => s.zoneMap)
useLiveSignal         →  useAppStore((s) => s.liveIds)
FloorMapLayer         →  useAppStore((s) => s.relationPropagation)
predict(... entities) →  entities injected as a parameter
```

No component or engine module knows the factory tenant exists. They depend only on the store's abstract interface, which is populated at boot by whoever calls `initEngine`.

---

## Adding a New Tenant

```
src/
  tenants/
    astellas/
      index.js       ← FactoryConfig (existing)
    company_b/
      index.js       ← CompanyBConfig  ← create this
      entities.js
      physics.js
      scenarios.js
      zoneMap.js
```

```js
// main.jsx — the only file that changes
import { CompanyBConfig } from './tenants/company_b/index';

createRoot(...).render(<App config={CompanyBConfig} />);
```

---

## Config Data Structure

The full shape expected by `initEngine(config)`. Every field is optional at the JS level — missing fields default to `[]` / `{}` — but a complete tenant config should supply all of them.

---

### Top-level shape

```js
{
  tenantId:    string,                          // e.g. 'factory'
  siteName:    string,                          // display name in the toolbar
  entities:    Entity[],
  relations:   Relation[],
  physics:     Record<entityId, PhysicsDef>,    // keyed by entity id
  propagation: Record<relationId, PropDef>,     // keyed by relation id
  scenarios:   Scenario[],
  zoneMap:     Record<entityId, string>,        // entity id → zone letter
  zoneLabels:  Record<string, string>,          // zone letter → display label
  pinnedIds:   string[],                        // permanently visible on load
  liveIds:     string[],                        // receive live signal ticks
  walkthrough: WalkthroughStep[],               // guided tour steps
}
```

---

### Entity

```js
{
  id:                     string,     // unique, used as key throughout
  type:                   string,     // 'Sensor' | 'Asset' | 'Batch' | 'SimulationScenario'
                                      // | 'FinancialImpact' | 'ExternalSystem' | 'GoldenBatch'
  label:                  string,     // display name on the card
  state:                  string,     // 'normal' | 'warning' | 'critical' | 'failure'
                                      // | 'simulation' | 'external'
  chart:                  string|null, // 'bearing' | 'golden' | 'current' | 'finance' | null
  rankHint:               number,     // layout order hint (0 = leftmost)
  projectionRole:         string,     // 'cause' | 'live' | 'consequence' | 'reference'
                                      // | 'simulation' | 'endpoint'
  root_cause_probability: number|null, // 0–1 or null
  metadata: {
    description: string,
    detail:      string,              // longer tooltip / panel text
    confidence?: string,              // e.g. '0.91'
    pathType?:   string,              // 'risk' | 'recovery'  (SimulationScenario only)
  },
  metrics:  Record<string, string>,   // key/value pairs shown on the card
  insight?: string,                   // one-line callout below metrics
  action?:  string,                   // recommended operator action
}
```

**Example:**
```js
{
  id: 'film_tension',
  type: 'Sensor',
  label: 'FT-1101 · Film Tension',
  state: 'warning',
  chart: 'bearing',
  rankHint: 1,
  projectionRole: 'cause',
  root_cause_probability: 0.83,
  metadata: {
    description: 'Film tension sensor',
    confidence: '0.91',
    detail: 'Film tension drifting low since 08:14 — causing inconsistent blister forming',
  },
  metrics: { Target: '42 N', Actual: '34 N', Delta: '−8 N' },
  insight: 'Tension drift detected 48 min ago',
  action: 'Adjust tension roller to 42 N',
}
```

---

### Relation

```js
{
  id:   string,   // unique, matches propagation keys (e.g. 'r1')
  from: string,   // source entity id
  to:   string,   // target entity id
  type: string,   // semantic label: 'causes_drift' | 'drives' | 'starves' | 'causes'
                  // | 'accumulates' | 'affects' | 'reduces' | 'measures'
                  // | 'references' | 'simulated_as' | 'impacts_cost' | 'mitigates'
                  // | 'triggers' | 'logged_in' | 'approved_by'
                  // (type maps to edge colour/style via edgeStyle.js)
}
```

**Example:**
```js
{ id: 'r1', from: 'film_tension', to: 'blister_machine', type: 'causes_drift' }
{ id: 'r3', from: 'blister_machine', to: 'cartoner',     type: 'starves'      }
```

---

### PhysicsDef (physics map value)

One entry per entity id. The `type` field determines the shape.

#### `sensor` — physical reading with drift and thresholds
```js
{
  type: 'sensor',
  currentValue:      number,     // current sensor reading
  targetValue:       number,     // setpoint / normal
  unit:              string,
  driftRate:         number,     // units/min — negative = degrading downward
  degradeDirection:  string,     // 'up' | 'down'
  thresholds: [
    { value: number, severity: 'warning' | 'critical' | 'failure' },
  ],
  recoveryRate: number,          // units/min when operator intervenes
}
```

#### `asset` — machine whose throughput is a multiplier of its state
```js
{
  type: 'asset',
  unit:     string,
  setpoint: number,
  currentValue: number,
  stateMultipliers: {
    normal:   number,  // 1.0 = full speed
    warning:  number,
    critical: number,
    failure:  number,
  },
  uiMapper?: (state, physics) => Record<string, string>,
}
```

#### `derived` — mirrors a sibling entity's state
```js
{
  type: 'derived',
  unit: string,
  setpoint: number,
  currentValue: number,
  uiMapper?: (state, physics, getSibling) => Record<string, string>,
}
```

#### `quality` — reject / defect rate tied to machine state
```js
{
  type: 'quality',
  unit: string,
  limitRate:   number,   // acceptable ceiling
  currentRate: number,
  rateByMachineState: Record<'normal'|'warning'|'critical'|'failure', number>,
  uiMapper?: (state, physics) => Record<string, string>,
}
```

#### `accumulator` — value grows over time based on upstream state
```js
{
  type: 'accumulator',
  unit: string,
  currentLoss: number,   // minutes lost so far this shift
  rateByState: Record<'normal'|'warning'|'critical'|'failure', number>,
                         // min loss per real min at each state
  uiMapper?: (state) => Record<string, string>,
}
```

#### `gap` — divergence between plan and actual
```js
{
  type: 'gap',
  unit: string,
  currentGap: number,
  gapRateByState: Record<'normal'|'warning'|'critical'|'failure', number>,
                  // units/min gap widens at each machine state
}
```

#### `queue` — buffer that fills/drains based on upstream throughput
```js
{
  type: 'queue',
  unit: string,
  queueCurrent: number,
  thresholds: [
    { value: number, severity: 'warning' | 'critical' },
  ],
  uiMapper?: (state) => Record<string, string>,
}
```

#### `batch` — batch-level outcome reference
```js
{
  type: 'batch',
  unitValueGBP: number,   // £ per unit packed
  targetUnits:  number,
  currentUnits: number,
}
```

---

### PropDef (propagation map value)

One entry per relation id.

```js
{
  delayMin:      number,   // minutes before downstream entity feels the change
  type:          string,   // 'immediate' | 'gradual'
  dampingFactor: number,   // 0–1: >0.7 = full propagation, <0.5 = absorbed
}
```

**Example:**
```js
// r1: film_tension → blister_machine — instant full propagation
{ delayMin: 1, type: 'immediate', dampingFactor: 1.0 }

// r3: blister_machine → cartoner — buffered, one severity level absorbed
{ delayMin: 2, type: 'gradual', dampingFactor: 0.9 }
```

---

### Scenario

```js
{
  id:          string,   // referenced by activeScenario in store
  label:       string,   // display name
  description: string,
  color:       string,   // hex — used for scrubber + prediction overlay
  confidence:  number,   // 0–1
  interventions: [
    {
      at:        number,   // minutes from NOW when intervention fires
      entityId:  string,
      action:    string,   // 'set_drift_rate' | 'set_value'
      value:     number,
      resolvedAt?: number, // computed by engine if omitted
    },
  ],
}
```

**Example:**
```js
{
  id: 'corrected',
  label: 'Tension roller adjusted',
  description: 'Adjust FT-1101 tension roller to 42 N',
  color: '#22AA44',
  confidence: 0.94,
  interventions: [
    { at: 0, entityId: 'film_tension', action: 'set_drift_rate', value: 2.5 },
  ],
}
```

---

### zoneMap / zoneLabels

```js
// zoneMap: entity id → zone letter
zoneMap: {
  film_tension:    'B',
  blister_machine: 'C',
  hidden_loss:     'D',
  batch_current:   'E',
  // ...
}

// zoneLabels: zone letter → swimlane heading
zoneLabels: {
  A: 'Reference',
  B: 'Root Cause',
  C: 'Equipment',
  D: 'Impact',
  E: 'Batch / Simulation',
  F: 'Systems',
}
```

Zone letters are arbitrary — use any single character. The engine sorts zones alphabetically to determine swimlane order left-to-right.

---

### pinnedIds / liveIds

```js
// pinnedIds: always visible on the graph board on load
pinnedIds: ['batch_golden', 'film_tension', 'blister_machine', ...]

// liveIds: receive a signal pulse on each useLiveSignal tick
liveIds: ['film_tension', 'blister_machine', 'blister_speed', ...]
```

---

### WalkthroughStep

```js
{
  id:   string,   // entity id to highlight
  role: string,   // label shown in the walkthrough UI
  note: string,   // explanatory text for this step
}
```

**Example:**
```js
{ id: 'film_tension', role: 'Root cause', note: 'Film tension drift on BM-1101 — 34 min above baseline' }
```

---

## Directory Structure

```
src/
  tenants/          ← company-specific data (one folder per tenant)
    astellas/
      index.js      ← single export: FactoryConfig
      entities.js   ← nodes + edges
      physics.js    ← physics parameters
      scenarios.js  ← prediction scenarios
      zoneMap.js    ← zone assignments + labels
  engine/           ← pure algorithms (no company data, fully testable)
    predict.js
    relations.js
  store/
    useAppStore.js  ← hollow Zustand store, populated by initEngine()
  components/
    graph/
      edgeStyle.js  ← rendering constants (shared across tenants)
      EdgeLayer.jsx
      NodeCard.jsx
      NodeLayer.jsx
      ZoneSwimlanes.jsx
      MiniMap.jsx
      GraphBoard.jsx
    GraphWhiteboardLayer.jsx
    FloorMapLayer.jsx
  hooks/
    useLayout.js    ← layout algorithm (accepts zoneMap as parameter)
    useLiveSignal.js
  App.jsx           ← injects config into store on mount
  main.jsx          ← tenant selection point
```
