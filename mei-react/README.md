# Mei · KairOS Rendering Engine

A multi-tenant, enterprise-ready process intelligence platform. Combines a causal knowledge graph, a 3D factory floor, a physics simulation engine, and a generative UI chat layer into a single offline-capable operator interface.

---

## Contents

1. [Architecture overview](#architecture-overview)
2. [Design philosophy](#design-philosophy)
3. [Directory structure](#directory-structure)
4. [Data flow](#data-flow)
5. [Widget system](#widget-system)
6. [LLM integration & AEGIS](#llm-integration--aegis)
7. [KairOS compound component](#kairos-compound-component)
8. [Tenant config reference](#tenant-config-reference)

> **Recent changes:** Web Worker physics engine · delta-threshold noise filter · KairOS compound component split · full widget dark/light theming · composable panel modification via chat · Layer 1.5 AEGIS namespace tag check · WidgetRenderer split (WidgetGate / WidgetMount / WidgetPrimitives)

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Tenant Config  (src/tenants/factory/)                         │
│  entities, relations, physics, scenarios, zoneMap              │
└────────────────────────┬────────────────────────────────────────┘
                         │ initEngine(config)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Zustand Store  (src/store/useAppStore.js)                      │
│  Single source of truth — populated once on boot               │
└────────────┬───────────────────────┬───────────────────────────┘
             │                       │
     ┌───────▼──────┐       ┌────────▼────────┐
     │ Graph View   │       │  Floor View     │
     │ (D3 nodes)   │       │  (Three.js R3F) │
     └──────────────┘       └────────┬────────┘
                                     │
                            ┌────────▼────────┐
                            │  KairOS Panel   │
                            │  (chat + AI)    │
                            └────────┬────────┘
                                     │ JSON payload
                                     ▼
                            ┌────────────────┐
                            │ WidgetRenderer │  ← pure, no store
                            └────────┬───────┘
                                     │
                   ┌─────────────────┼──────────────────┐
              Gauge  Chart  Stat  Table  Action  Control  Layout
              (lazy chunks — only load when used)
```

### Live data & physics pipeline

```
Supabase WebSocket (event-driven INSERT)
  │
  ▼
useLiveData — delta filter
  │  skip if |Δvalue| < 0.5% AND state unchanged
  │  (drops instrument noise before it reaches the store)
  ▼
applyLiveReading — store write (entities + entityPhysics only)
  │  no predict() call here — main thread stays free
  │
  ▼  entityPhysics reference changes
usePredictWorker — Zustand.subscribe (no React re-render)
  │  debounce 200 ms — batches burst readings into one compute
  │
  ▼  postMessage
predict.worker.js  ←── OS thread boundary ───────────────────┐
  │  predict() runs entirely off the main / render thread     │
  │  (safe for 500+ machines, no frame drops)                 │
  ◄──────────────────────────────────────────────────────────┘
  │  postMessage(predictions[])
  ▼
setPredictions — one clean store write → subscribers re-render
```

---

## Design philosophy

### SOLID

| Principle | How it's applied |
|-----------|-----------------|
| **S — Single Responsibility** | `KairOSOverlay` is a 122-line composer. Logic lives in `KairosContext`, intent in `kairosIntent.js`, payload generation in `widgetFactory.js`. Each file has one reason to change. |
| **O — Open/Closed** | Adding a new widget type = create one file in `src/widgets/types/` + one entry in `registry.js`. Nothing else changes. Adding a new intent = add a keyword set to `kairosIntent.js`. No component is touched. |
| **L — Liskov Substitution** | Any `FactoryConfig` satisfying the config shape can replace the existing tenant config in `main.jsx` without changing any engine, store, or component file. Widget components are fully substitutable — `WidgetRenderer` uses only the registry interface. |
| **I — Interface Segregation** | Components subscribe to exactly the store slices they need. `WidgetRenderer` receives only `liveDataProvider` — it does not import the store. Widget leaf components receive only plain props — no context, no store. |
| **D — Dependency Inversion** | `liveDataProvider: (tag) => number` is injected top-down. Widget components never know where data comes from. `detectIntent` and `buildWidgetPayload` are pure functions injected into `KairosContext` — not baked into a component. |

### YAGNI

- No feature was built speculatively. The step/process widget, operator mode, and event log are not in the codebase yet because they haven't been started.
- `WIDGET_PRESETS` is a module-level constant, not a class, not a registry, not a plugin system — it's a plain object because that's all it needs to be.

### KISS

- `detectIntent` is a plain function that returns a string. No state machine, no ML model, no plugin system — just readable keyword matching.
- `WidgetRenderer` is a ~75-line orchestrator with three sequential steps: gate, resolve, mount. Each step is a pure function or a separate component — no step knows about the others. `WidgetMount` receives a `renderChild` callback instead of importing `WidgetRenderer` directly, which avoids a circular import without any dynamic require hacks.
- Compound components share state via a single React context. No prop drilling, no event bus, no pub/sub.
- The Web Worker protocol is two lines: `postMessage(inputData)` → `postMessage(predictions)`. No shared memory, no transferables, no complex serialisation — the physics data is small JSON.
- The delta filter is a `useRef` map and two arithmetic comparisons. No RxJS, no observable streams, no complex state machine.

---

## Directory structure

```
src/
├── tenants/                   ← company-specific data only
│   └── factory/
│       ├── index.js           ← single export: FactoryConfig
│       ├── entities.js        ← graph nodes + edges
│       ├── physics.js         ← physics parameters
│       ├── scenarios.js       ← prediction scenarios
│       └── zoneMap.js         ← zone assignments + labels
│
├── engine/                    ← pure algorithms — no React, no store
│   ├── predict.js             ← physics simulation engine (pure function)
│   ├── predict.worker.js      ← Web Worker wrapper — runs predict() off-thread
│   └── relations.js           ← relation graph filtering
│
├── lib/                       ← pure utility functions
│   ├── kairosIntent.js        ← KNOWLEDGE base, detectIntent(), resolveMachineId()
│   ├── widgetFactory.js       ← buildWidgetPayload() — widget JSON generation
│   └── kairosCharts.js        ← Chart.js dataset definitions
│
├── store/
│   └── useAppStore.js         ← Zustand store — populated by initEngine()
│
├── widgets/
│   ├── registry.js            ← WIDGET_REGISTRY + buildAegisManifest()
│   ├── schema.js              ← validatePayload() + checkConfidence()
│   └── types/
│       ├── Gauge.jsx          ← radial / linear KPI gauge
│       ├── Chart.jsx          ← Chart.js wrapper (line, bar, area...)
│       ├── Stat.jsx           ← single numeric stat + delta
│       ├── Table.jsx          ← data table with status LEDs
│       ├── Action.jsx         ← CFR Part 11 gated command button
│       ├── Control.jsx        ← form controls (12 types)
│       └── Layout.jsx         ← pure composable container
│
├── components/
│   ├── KairOSOverlay.jsx      ← 122-line composer (entry point)
│   ├── WidgetRenderer.jsx     ← thin orchestrator: gate → resolve → mount
│   ├── widget/                ← WidgetRenderer sub-modules
│   │   ├── WidgetGate.jsx     ← gateWidget() — 3-layer validation pipeline
│   │   ├── WidgetMount.jsx    ← pure renderer: shell, strips, lazy leaf, children
│   │   └── WidgetPrimitives.jsx ← BlockedWidget, WidgetSkeleton
│   ├── FloorMapLayer.jsx      ← 3D factory floor (R3F / Three.js)
│   ├── GraphWhiteboardLayer.jsx
│   ├── KPIDashboard.jsx
│   ├── kairos/                ← KairOS compound components
│   │   ├── KairOS.jsx         ← compound export: KairOS.Provider etc.
│   │   ├── KairosContext.jsx  ← shared state + submit logic
│   │   ├── KairosThread.jsx   ← message list + Bubble + report cards
│   │   ├── KairosChipRail.jsx ← quick chip rail
│   │   ├── KairosInput.jsx    ← input bar + send button
│   │   └── KairosCFRGate.jsx  ← CFR Part 11 authorization modal
│   └── floor/
│       ├── FloorSpatialWidgets.jsx ← spatial HUD pin layer
│       ├── FloorMetrics.jsx        ← line metrics + OpsCard sidebar
│       ├── FloorMapEquipment.jsx
│       ├── FloorMapEnvironment.jsx
│       ├── FloorMapAnimations.jsx
│       ├── OpenClawTerminal.jsx
│       └── PredictionTimeline.jsx
│
├── hooks/
│   ├── useLiveData.js         ← Supabase WebSocket ingestion + delta-threshold filter
│   ├── usePredictWorker.js    ← Web Worker lifecycle + debounced physics dispatch
│   ├── useLiveSignal.js       ← signal animation ticks
│   └── useLayout.js           ← card layout algorithm
│
└── App.jsx                    ← calls initEngine() on mount
```

---

## Data flow

### Boot

```
main.jsx
  → <App config={FactoryConfig} />
      → initEngine(config)            ← single store write on mount
          → store: entities, relations, entityMap
          → store: entityPhysics, relationPropagation
          → store: scenarios, predictions  ← predict() runs once
          → store: zoneMap, pinnedIds, liveIds
```

### Live sensor ingestion

```
Supabase WebSocket INSERT → useLiveData hook
  │
  ├─ delta filter (per entity, in a useRef — no React re-render)
  │    skip if: |new_value − last_value| < max(0.01, |last| × 0.5%)
  │             AND state label unchanged
  │    → drops instrument noise (e.g. ±0.001 N pressure fluctuation)
  │    → at 20 Hz, ~19 of 20 readings are suppressed on a stable line
  │
  └─ applyLiveReading(entityId, state, metrics, value)
       → updates entities[], entityPhysics[id].currentValue
       → does NOT call predict() — main thread stays free

usePredictWorker (Zustand.subscribe — no React re-render)
  → detects entityPhysics reference change
  → debounces 200 ms (batches burst readings into one compute)
  → postMessage → predict.worker.js (OS thread)
  → worker responds → setPredictions([]) → subscribers re-render
```

**Why event-driven and not polling:**
Supabase `postgres_changes` uses a persistent WebSocket. The client receives a push notification only when a row is inserted — there is no 1-second poll, no unnecessary network round-trips, and no React renders for rows that never arrive.

**Why the delta filter matters:**
Without it, a pressure sensor sampled at 20 Hz with ±0.001 N instrument noise produces 1,200 store writes per minute. With the filter, only readings that cross a meaningful threshold (0.5% deviation or a state transition) reach the store — roughly 1–5 writes per minute on a stable line. This is the difference between 60 fps and 40 fps on the 3D floor view at scale.

### Performance architecture

| Concern | Solution | Result |
|---------|----------|--------|
| Physics simulation blocking render thread | `predict()` moved to `predict.worker.js` — runs on a separate OS thread | 3D floor stays at 60 fps even on 500-machine configs |
| Sensor noise causing redundant store writes | Delta filter in `useLiveData` — 0.5% relative threshold + absolute floor 0.01 | ~95% of noise readings dropped before reaching Zustand |
| Burst readings flooding the worker | 200 ms debounce in `usePredictWorker` | Multiple rapid sensor ticks → one physics compute |
| Polling overhead | Supabase `postgres_changes` WebSocket — push only on INSERT | Zero polling; no unnecessary round-trips |
| Widget chunk size | Each widget type is a separate Vite code-split chunk | Chart.js (~200 kB) only loads when a chart widget is rendered |

### Generative widget flow (chat → rendered widget)

```
User message
  → detectIntent(text, currentPanel)     ← pure fn, src/lib/kairosIntent.js
      → 'widget' | 'panel_modify' | 'report' | 'question' | ...
  → buildWidgetPayload(text)             ← pure fn, src/lib/widgetFactory.js
      → { type, confidence, props, spatialBinding?, children? }

  WidgetRenderer (thin orchestrator — src/components/WidgetRenderer.jsx)
    │
    ├─ 1. Gate — gateWidget(payload, liveDataProvider, liveTagIds)
    │     Layer 1   validatePayload()     ← structural JSON check
    │     Layer 1.5 checkTagExists()      ← namespace integrity (see below)
    │     Layer 2   checkConfidence()     ← threshold gating
    │     → 'blocked' → <BlockedWidget>
    │     → 'render'  → { confidenceStatus, namespaceAmber, entry }
    │
    ├─ 2. Resolve — liveDataProvider(tag)
    │     If props.live && props.tag: inject current sensor reading
    │     Widget components receive a plain number — never import the store
    │
    └─ 3. Mount — <WidgetMount renderChild={...} />
          Shell, amber strip, CFR strip, layout title
          Suspense + lazy(WidgetType)     ← code-split chunk
          Children via renderChild() callback (breaks circular import)
```

---

## Widget system

### Payload schema

Every widget — whether generated by the LLM, hardcoded in a demo, or built by panel modification — is a plain JSON payload conforming to this shape:

```jsonc
{
  "type":       "gauge",   // required — must exist in WIDGET_REGISTRY
  "confidence": 0.94,      // required — 0.0..1.0, LLM's certainty score

  "props": {               // optional — passed directly to the widget component
    // type-specific fields — see per-type reference below
  },

  "spatialBinding": {      // optional — pin widget to a 3D entity in the floor view
    "entityId": "vis_1101",
    "anchor":   "top"
  },

  "children": [            // optional — nested widget payloads (any type)
    { "type": "stat", "confidence": 0.91, "props": { ... } },
    { "type": "action", "confidence": 0.97, "props": { ... } }
  ]
}
```

`children` is recursive. A `layout` widget is a pure container — it has no UI of its own and renders only its children.

---

### Confidence gating

| Condition | Outcome |
|-----------|---------|
| Invalid JSON structure | **Hard block** — `validatePayload` (Layer 1) fails immediately |
| `live: true` tag not in `liveTagIds` namespace | **Amber** — `⊘ TAG NOT IN NAMESPACE` banner (Layer 1.5) |
| `confidence < threshold` AND `requiresAuth: true` | **Hard block** — widget not rendered, red error shown |
| `confidence < threshold` AND `requiresAuth: false` | **Amber** — `⚠ UNVERIFIED` banner with confidence % |
| `confidence >= threshold` | **OK** — normal render |

Per-type thresholds:

| Type | Threshold | Auth-gated |
|------|-----------|-----------|
| `gauge` | 0.75 | No |
| `chart` | 0.75 | No |
| `stat` | 0.72 | No |
| `table` | 0.75 | No |
| `control` | 0.78 | No |
| `layout` | 0.70 | No |
| `action` | **0.95** | **Yes** — always triggers CFR Part 11 PIN gate |

---

### Per-type prop reference

#### `gauge`

```jsonc
{
  "type": "gauge",
  "confidence": 0.94,
  "props": {
    "label":         "OEE · BM-1101",
    "value":         78.4,           // current reading
    "max":           100,
    "unit":          "%",
    "variant":       "radial",       // "radial" | "linear"
    "warnAt":        85,             // amber threshold
    "critAt":        70,             // red threshold
    "lowerIsBetter": false,          // flip threshold direction (e.g. for OEE)
    "live":          true,           // show LIVE badge
    "tag":           "KPI-OEE-L1"   // live tag id — overrides value if live data available
  }
}
```

#### `chart`

```jsonc
{
  "type": "chart",
  "confidence": 0.91,
  "props": {
    "chartType": "line",             // "line" | "bar" | "area" | "doughnut" | "radar" | "scatter"
    "label":     "Film Tension · FT-1101",
    "unit":      "N",
    "height":    140,                // px
    "xLabel":    "Time",
    "yLabel":    "Tension (N)",
    "datasets": [
      {
        "label": "FT-1101",
        "data":  [42, 41.8, 40.5, 38.4, 36.0, 34.8],
        "color": "#F59E0B",
        "fill":  true                // area fill below line
      }
    ],
    "labels": ["08:10", "08:22", "08:34", "08:46", "08:50", "08:56"]
  }
}
```

#### `stat`

```jsonc
{
  "type": "stat",
  "confidence": 0.91,
  "props": {
    "label":       "Speed",
    "value":       "218",
    "unit":        "bpm",
    "delta":       -6,              // signed — negative = below target
    "deltaLabel":  "vs target",
    "tag":         "SPD-BM1101"    // live tag — overrides value if available
  }
}
```

#### `table`

```jsonc
{
  "type": "table",
  "confidence": 0.89,
  "props": {
    "title":     "Line Status",
    "columns":   ["Line", "OEE", "Speed", "Status"],
    "statusCol": "Status",          // column to render as coloured LED badge
    "rows": [
      { "Line": "L1 · BM-1101", "OEE": "78.4%", "Speed": "218 bpm", "Status": "warning" },
      { "Line": "L2 · BM-1201", "OEE": "93.4%", "Speed": "224 bpm", "Status": "ok" }
    ]
  }
}
```

Status badge values: `"ok"` · `"warning"` · `"critical"`

#### `action`

```jsonc
{
  "type": "action",
  "confidence": 0.97,              // must be ≥ 0.95 or hard-blocked
  "props": {
    "label":     "Apply Tension Correction → 42 N",
    "action":    "adjust_tension_ft1101",  // action key sent to onAction handler
    "machineId": "bf_1101",
    "risk":      "medium"          // "low" | "medium" | "high"
  }
}
```

Clicking triggers the CFR Part 11 PIN modal. The `onAction` callback fires only after the operator enters a valid PIN.

#### `control`

```jsonc
{
  "type": "control",
  "confidence": 0.88,
  "props": {
    "controlType": "slider",        // see subtypes below
    "label":       "Tension Setpoint · FT-1101",
    "value":       42,
    "min":         20,
    "max":         60,
    "step":        0.5,
    "unit":        "N",
    "action":      "set_tension_ft1101",
    "machineId":   "bf_1101"
  }
}
```

Control subtypes and their additional props:

| `controlType` | Key props |
|---------------|-----------|
| `switch` | `value` (bool) |
| `slider` | `value`, `min`, `max`, `step`, `unit` |
| `radio` | `value`, `options` (string[]) |
| `checkbox` | `value` (string or string[]), `options` (string[]) |
| `select` | `value`, `options` (string[]) |
| `number` | `value`, `min`, `max`, `step` |
| `text` | `value`, `options[0]` as placeholder |
| `textarea` | `value`, `options[0]` as placeholder |
| `calendar` | `value` (ISO date string YYYY-MM-DD) |
| `clock` | `value` (HH:MM) |
| `button` | `label` (button text) |
| `label` | `label` (display text), `options[0]` as subtitle |
| `badge` | `label`, `value` ("info" \| "ok" \| "warning" \| "critical") |

#### `layout`

```jsonc
{
  "type": "layout",
  "confidence": 0.93,
  "props": {
    "title":     "BM-1101 Monitor",  // optional header
    "direction": "column"            // "row" | "column" (flex direction)
  },
  "children": [
    {
      "type": "layout",
      "confidence": 0.93,
      "props": { "direction": "row" },
      "children": [
        { "type": "gauge", "confidence": 0.94, "props": { "label": "OEE", "value": 78.4, "max": 100, "unit": "%" } },
        { "type": "stat",  "confidence": 0.91, "props": { "label": "Speed", "value": "218", "unit": "bpm" } }
      ]
    },
    { "type": "chart",   "confidence": 0.91, "props": { "chartType": "line", "label": "Film Tension", ... } },
    { "type": "control", "confidence": 0.88, "props": { "controlType": "slider", ... } },
    { "type": "action",  "confidence": 0.97, "props": { "label": "Apply Correction", ... } }
  ]
}
```

---

### Adding a new widget type

1. Create `src/widgets/types/MyWidget.jsx` with a named export `WidgetMyWidget`
2. Add one entry to `src/widgets/registry.js`:

```js
mywidget: {
  component:           lazy(() => import('./types/MyWidget.jsx').then(m => ({ default: m.WidgetMyWidget }))),
  confidenceThreshold: 0.75,
  requiresAuth:        false,
  description:         'Human-readable description for the AEGIS LLM manifest.',
},
```

No other file changes. `WidgetRenderer` picks it up automatically.

---

## LLM integration & AEGIS

### How it works

The widget pipeline is designed so that any LLM — local (Ollama, llama.cpp) or remote (Claude, GPT-4) — can generate the widget JSON without hallucinating sensors or fabricating actions.

**AEGIS** (Authenticated Entity Governance & Inference Shield) is a three-layer runtime safety system applied by `gateWidget()` on every widget render:

```
Layer 1 — Structural validation  (validatePayload)
  JSON must conform to the widget schema — unknown types hard-blocked.
  Runs first; a malformed payload never reaches the sensor check.

Layer 1.5 — Namespace integrity  (checkTagExists)
  If a widget declares live: true + tag, the tag must exist in
  the registered liveTagIds namespace (store.liveIds, from tenant config).
  → Tag found     → ok (no penalty)
  → Tag missing   → namespaceAmber = true → amber "⊘ TAG NOT IN NAMESPACE"
  → No liveTagIds → skip (backwards-compatible, no penalty)

  This catches hallucinated sensor references that slip past LLM confidence.
  The amber label is distinct from Layer 2 amber so operators can tell
  "LLM was uncertain" apart from "LLM fabricated a sensor".

Layer 2 — Confidence gating  (checkConfidence)
  Each widget type has a minimum confidence threshold.
  Action widgets (requiresAuth: true) are hard-blocked below 0.95.
  Display widgets amber-wrapped below their threshold.
```

**The LLM manifest side of AEGIS** (prompt injection prevention) runs before inference: the LLM receives only the sensors listed in `liveTagIds`. Layer 1.5 is a defence-in-depth backstop for when the LLM ignores the manifest.

### AEGIS manifest

The manifest is generated at inference time from the widget registry and the live tag namespace:

```js
import { buildAegisManifest } from './src/widgets/registry.js';

const manifest = buildAegisManifest(liveTagIds);
// {
//   registeredWidgets: [
//     { type: 'gauge',   confidenceThreshold: 0.75, requiresAuth: false, description: '...' },
//     { type: 'action',  confidenceThreshold: 0.95, requiresAuth: true,  description: '...' },
//     ...
//   ],
//   liveTagIds: ['KPI-OEE-L1', 'SPD-BM1101', 'FT-1101', ...],
//   generatedAt: '2026-04-23T12:00:00.000Z'
// }
```

Inject this into the LLM system prompt:

```
You are KairOS. You can generate UI widgets as JSON payloads.
Only use widget types and live tag IDs listed in the manifest below.
Always include a confidence score (0.0–1.0) reflecting your certainty.
For action widgets, confidence must be ≥ 0.95 or they will be blocked.

AEGIS MANIFEST:
{{ JSON.stringify(manifest) }}

Respond with a JSON payload conforming to the widget schema.
```

### LLM system prompt template

```
SYSTEM:
You are KairOS, an industrial process intelligence assistant.
You have access to live sensor data from the Unified Namespace.

RULES:
1. Only reference sensors listed in the AEGIS manifest liveTagIds.
2. Only generate widget types listed in the AEGIS manifest registeredWidgets.
3. Always set confidence accurately — it controls whether widgets render.
4. For action widgets: confidence ≥ 0.95 required; risk must be "low", "medium", or "high".
5. For composable panels: use type "layout" with direction "column" or "row".
6. spatialBinding.entityId must be a valid entity ID from the namespace.
7. Never fabricate sensor readings. Use the tag field — live data is injected at render time.

AEGIS MANIFEST:
{{ buildAegisManifest(liveTagIds) }}

USER:
{{ operator_message }}

RESPOND WITH:
{
  "text": "Explanation of what you're showing and why.",
  "widget": { ...widget payload... }
}
```

### Live tag injection

When a widget payload contains `"live": true` and a `"tag"` field, `WidgetRenderer` resolves the current reading via the `liveDataProvider` callback before passing props to the widget:

```js
// WidgetRenderer.jsx (simplified)
const liveValue = props.live && props.tag
  ? liveDataProvider(props.tag)   // injected from KairosContext → entityPhysics store
  : undefined;

const resolvedProps = liveValue !== undefined
  ? { ...props, value: liveValue }
  : props;
```

The widget component never imports the store. It receives a plain number and renders it.

### Panel modification

Once a `layout` widget is active (`currentPanel` state in `KairosContext`), the user can modify it conversationally:

```
User: "show composable monitor panel bm-1101"
→ layout widget created, setCurrentPanel(widget)

User: "add a table"
→ detectIntent returns 'panel_modify'
→ handlePanelModify clones panel, appends table preset to children
→ new message posted with updated widget

User: "remove the chart"
→ first child with type 'chart' spliced out
→ updated panel re-rendered
```

Widget presets for modification are defined in `src/lib/widgetFactory.js` as `WIDGET_PRESETS`.

---

## KairOS compound component

`KairOS` is a compound component — a single import where each sub-component is a named key:

```jsx
import { KairOS } from './kairos/KairOS';

// Full panel
<KairOS.Provider>
  <KairOS.Thread />
  <KairOS.ChipRail />
  <KairOS.Input />
  <KairOS.CFRGate />
</KairOS.Provider>

// Minimal read-only thread in a custom layout
<KairOS.Provider>
  <MyCustomShell>
    <KairOS.Thread />
  </MyCustomShell>
</KairOS.Provider>
```

Sub-components and responsibilities:

| Sub-component | File | Purpose |
|---------------|------|---------|
| `KairOS.Provider` | `KairosContext.jsx` | Shared state: messages, input, thinking, currentPanel, cfrPending. Houses `submit`, `detectIntent`, `buildWidgetPayload` |
| `KairOS.Thread` | `KairosThread.jsx` | Scrollable message list. Renders `Bubble`, `ReportCard`, `TracePanel`, `AegisRejection`, `OTIFAlertCard` |
| `KairOS.ChipRail` | `KairosChipRail.jsx` | Horizontally scrollable quick command chips |
| `KairOS.Input` | `KairosInput.jsx` | Text input + send button. Submits on Enter |
| `KairOS.CFRGate` | `KairosCFRGate.jsx` | CFR Part 11 PIN authorization modal. Self-contained — mounts outside the slide panel |

Shared state is accessed in any sub-component via `useKairos()`:

```js
import { useKairos } from './kairos/KairosContext';

function MyCustomWidget() {
  const { messages, submit, dark } = useKairos();
  // ...
}
```

---

## Tenant config reference

### Top-level shape

```js
{
  tenantId:    string,          // e.g. 'factory'
  siteName:    string,          // display name in the toolbar
  entities:    Entity[],
  relations:   Relation[],
  physics:     Record<entityId, PhysicsDef>,
  propagation: Record<relationId, PropDef>,
  scenarios:   Scenario[],
  zoneMap:     Record<entityId, string>,    // entity id → zone letter
  zoneLabels:  Record<string, string>,      // zone letter → display label
  pinnedIds:   string[],
  liveIds:     string[],
  walkthrough: WalkthroughStep[],
}
```

### Entity

```js
{
  id:                     string,
  type:                   'Sensor' | 'Asset' | 'Batch' | 'SimulationScenario'
                        | 'FinancialImpact' | 'ExternalSystem' | 'GoldenBatch',
  label:                  string,
  state:                  'normal' | 'warning' | 'critical' | 'failure'
                        | 'simulation' | 'external',
  chart:                  string | null,
  rankHint:               number,
  projectionRole:         'cause' | 'live' | 'consequence' | 'reference'
                        | 'simulation' | 'endpoint',
  root_cause_probability: number | null,
  metadata: {
    description: string,
    detail:      string,
    confidence?: string,
    pathType?:   'risk' | 'recovery',
  },
  metrics:  Record<string, string>,
  insight?: string,
  action?:  string,
}
```

### Relation

```js
{
  id:   string,
  from: string,   // source entity id
  to:   string,   // target entity id
  type: string,   // 'causes_drift' | 'drives' | 'starves' | 'causes'
                  // | 'accumulates' | 'affects' | 'reduces' | 'measures'
                  // | 'references' | 'simulated_as' | 'impacts_cost'
                  // | 'mitigates' | 'triggers' | 'logged_in' | 'approved_by'
}
```

### PhysicsDef

Six physics types: `sensor`, `asset`, `derived`, `quality`, `accumulator`, `gap`, `queue`, `batch`. See original README or `src/tenants/factory/physics.js` for full shapes.

### Scenario

```js
{
  id:          string,
  label:       string,
  description: string,
  color:       string,     // hex
  confidence:  number,
  interventions: [
    { at: number, entityId: string, action: 'set_drift_rate' | 'set_value', value: number }
  ],
}
```

### Adding a new tenant

```
src/tenants/company_b/
  index.js       ← export CompanyBConfig
  entities.js
  physics.js
  scenarios.js
  zoneMap.js
```

Change one line in `main.jsx`:

```js
import { CompanyBConfig } from './tenants/company_b/index';
createRoot(...).render(<App config={CompanyBConfig} />);
```

No engine, component, hook, or store file is touched.
