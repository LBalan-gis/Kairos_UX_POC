# Mei React

KairOS is an incident workspace for pharmaceutical packaging operations. It combines:

- a graph whiteboard for causal analysis
- a 3D floor map for spatial/runtime context
- a KPI dashboard for production visibility
- a KairOS operator rail for reports, widgets, and guided actions

This is not a generic dashboard. The app is built around incident triage, simulation, and operator action.

## Stack

- React 19
- TypeScript
- Zustand
- Vite
- Three.js / React Three Fiber
- Chart.js
- Supabase realtime

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Current architecture

The app is moving toward bounded frontend domains rather than one broad app store.

### Runtime layers

1. Tenant config
   Defines the plant model, floor layout, scenarios, and bindings for a specific deployment.

2. Domain model
   Canonical business/runtime semantics live under `src/domain/`.

3. Store
   Zustand remains the runtime state container, but canonical state is being grouped by domain context.

4. Surface projections
   UI surfaces consume selectors/view-models rather than shaping raw store state inline.

5. Feature surfaces
   Floor, graph, KPI, and KairOS render the runtime model.

## Bounded contexts

### `simulation`

Canonical location:

- `src/domain/simulation/model.ts`
- `src/domain/simulation/selectors.ts`
- `src/domain/simulation/history.ts`

Owns:

- scenarios
- predictions
- active scenario
- simulated time
- timeline projection
- simulation entity-state resolution

Canonical store branch:

- `state.simulation.*`

### `plant`

Canonical location:

- `src/domain/plant/model.ts`
- `src/domain/plant/selectors.ts`
- `src/domain/plant/floor.ts`

Owns:

- live ids
- offline ids
- signal freshness
- report metric bindings
- plant identity selectors
- floor machine state projection

Canonical store branch:

- `state.plant.*`

## Data flow

### Boot

`FactoryConfig` is passed into the app and loaded through `initEngine(config)`.

That boot step populates:

- entities
- relations
- entity physics
- propagation rules
- simulation state
- plant runtime state
- zone labels/maps
- floor config

### Live readings

Realtime readings are ingested through:

- `src/hooks/useLiveData.ts`

Flow:

1. Supabase emits a new sensor reading.
2. A delta/noise filter suppresses insignificant updates.
3. `applyLiveReading(...)` updates runtime state.
4. `entityPhysics` is updated with the latest numeric value.
5. `usePredictWorker` debounces and pushes prediction work off-thread.

### Worker-based prediction

Prediction runs in:

- `src/engine/predict.worker.ts`

The UI thread does not run physics directly. `usePredictWorker.ts` subscribes to runtime changes and dispatches worker jobs with debounce.

## Directory guide

```text
src/
├── components/
│   ├── floor/         # 3D floor surface
│   ├── graph/         # incident whiteboard / graph surface
│   ├── kairos/        # KairOS thread and controller
│   ├── kpi/           # KPI dashboard
│   ├── layout/        # shell, toolbar, scrubber, overlay rail
│   ├── command/       # command palette
│   ├── onboarding/    # onboarding flows
│   └── widget/        # widget renderer layer
├── domain/
│   ├── plant/
│   └── simulation/
├── engine/            # prediction engine + worker
├── hooks/             # boot, live data, worker subscriptions
├── runtime/           # runtime ingestion helpers
├── services/
│   ├── kairos/
│   └── widgets/
├── store/
│   └── slices/
├── tenants/
│   └── factory/
├── types/
└── widgets/
```

## Tenant config

The factory tenant currently lives in:

- `src/tenants/factory/index.ts`

It provides:

- entities
- relations
- physics
- propagation
- scenarios
- zone map / labels
- floor config
- pinned ids
- live ids
- plant report bindings

### Important rule

Tenant-specific semantics should live in config, not in render files.

Examples already moved into config:

- floor state labels
- floor component dimensions
- pending placement defaults
- report metric bindings

### Add a new tenant

Use `src/tenants/factory/` as the reference shape.

Minimum files:

- `index.ts`
- `entities.ts`
- `physics.ts`
- `scenarios.ts`
- `zoneMap.ts`
- `floor.ts` if the tenant uses the floor surface

Minimum config contract:

- `tenantId`
- `siteName`
- `entities`
- `relations`
- `physics`
- `propagation`
- `scenarios`
- `zoneMap`
- `zoneLabels`
- `pinnedIds`
- `liveIds`
- `plantReportBindings`
- `walkthrough`

Rules:

- keep tenant semantics in config, not in components
- bind report metrics to canonical numeric runtime fields
- define floor projection semantics in `floor.ts`, not in the render layer
- do not rely on entity label substring matching for identity or metrics

To switch tenants at boot, pass a different `TenantConfig` into the app entrypoint in:

- `src/main.tsx`

## Floor system

The floor map is not just a visual layer.

It uses:

- `src/domain/plant/floor.ts` for machine-state projection
- `src/types/floor.ts` for config contracts
- `src/tenants/factory/floor.ts` for tenant-specific layout and projection semantics

Projection logic now resolves:

- offline machines
- starved machines
- pending equipment placement
- offline conveyor ranges

without hardcoding line-specific assumptions in the render layer.

## Graph system

The graph is an incident whiteboard, not a generic graph explorer.

Non-negotiable layout rules are defined in `AGENTS.md`, including:

- Golden Batch pinned top-left
- Deviation as the focal center
- Current Batch as the simulation fork source
- simulation branches below Current Batch
- MES / QA / ERP near consequence endpoints

The current graph extraction seam is:

- `src/components/graph/graphViewModel.ts`

This is where board projection is being pulled out of the controller.

## Widget / AEGIS layer

Widget validation goes through the widget gate layer:

- `src/components/widget/WidgetGate.tsx`
- `src/widgets/schema.ts`

Important checks include:

- payload shape validation
- confidence gating
- namespace/tag existence checks via `checkTagExists(...)`

Widgets are rendered through:

- `src/components/widget/WidgetRenderer.tsx`

## KairOS

KairOS is the operator/advisory rail, not a generic chat panel.

Main runtime entrypoints:

- `src/components/kairos/useKairosController.ts`
- `src/services/kairos/reports.ts`
- `src/services/kairos/focus.ts`
- `src/services/kairos/questions.ts`

KairOS already consumes plant/runtime selectors rather than raw store access for report metrics and runtime state.

## Current status

Completed:

- `simulation` bounded context extraction
- `plant` runtime extraction
- floor projection/config cleanup
- worker-based prediction path
- live reading noise filtering
- feature-foldered component structure
- TypeScript migration in `src/`

In progress:

- graph controller decomposition
- broader plant identity/view-model cleanup
- continued bundle reduction on the floor route

## Development notes

- `npm run build` and `npm run lint` should stay clean after each architectural pass.
- Avoid adding new domain logic directly into React render files.
- Prefer config-owned tenant semantics over hardcoded UI assumptions.
- Prefer selectors/view-models over broad store subscriptions.
