import type { AppStoreState } from '../../types/store';
import type {
  PredictionResult,
  PredictionStep,
  SimulationContext,
  SimulationScenarioOption,
  SimulationTimelineProjection,
} from './model';

export function selectSimulationContext(state: AppStoreState): SimulationContext {
  return {
    scenarios: state.simulation.scenarios,
    predictions: state.simulation.predictions,
    activeScenarioId: state.simulation.activeScenario,
    simulatedTime: state.simulation.simulatedTime,
  };
}

function toScenarioOption(
  activeScenarioId: string,
  prediction: SimulationContext['predictions'][number]
): SimulationScenarioOption {
  return {
    id: prediction.scenarioId,
    label: prediction.label,
    confidence: prediction.confidence,
    color: prediction.color,
    isRiskPath: prediction.scenarioId === 'unchanged',
    isActive: activeScenarioId === prediction.scenarioId,
  };
}

export function projectSimulationTimeline(context: SimulationContext): SimulationTimelineProjection {
  const mode =
    context.simulatedTime === null
      ? 'live'
      : context.simulatedTime < 0
        ? 'history'
        : 'scenario';

  return {
    mode,
    simulatedTime: context.simulatedTime,
    activeScenarioId: context.activeScenarioId,
    scenarios: context.predictions.map((prediction) =>
      toScenarioOption(context.activeScenarioId, prediction)
    ),
    activePrediction:
      context.predictions.find((prediction) => prediction.scenarioId === context.activeScenarioId) ?? null,
  };
}

export function selectActivePrediction(context: SimulationContext): PredictionResult | null {
  return context.predictions.find((prediction) => prediction.scenarioId === context.activeScenarioId) ?? null;
}

export function selectClosestPredictionStep(context: SimulationContext): PredictionStep | null {
  if (context.simulatedTime === null || context.simulatedTime < 0) return null;

  const activePrediction = selectActivePrediction(context);
  if (!activePrediction?.steps.length) return null;

  return activePrediction.steps.reduce((best, step) =>
    Math.abs(step.t - context.simulatedTime!) < Math.abs(best.t - context.simulatedTime!) ? step : best
  , activePrediction.steps[0]);
}

export function selectLatestPredictionStep(context: SimulationContext): PredictionStep | null {
  if (context.simulatedTime === null || context.simulatedTime <= 0) return null;

  const activePrediction = selectActivePrediction(context);
  if (!activePrediction?.steps.length) return null;

  let step = activePrediction.steps[0];
  for (const currentStep of activePrediction.steps) {
    if (currentStep.t <= context.simulatedTime) step = currentStep;
    else break;
  }
  return step;
}

export function resolveSimulationEntityStates(
  context: SimulationContext,
  liveEntityStates: Record<string, string>,
  lookupHistoryStates: (time: number) => Record<string, string>
): Record<string, string> {
  if (context.simulatedTime === null) return liveEntityStates;
  if (context.simulatedTime < 0) return lookupHistoryStates(context.simulatedTime);

  const step = selectClosestPredictionStep(context);
  return (step?.entityStates as Record<string, string> | undefined) ?? liveEntityStates;
}
