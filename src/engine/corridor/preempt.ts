import { Signal, RoutePlan, Ambulance } from '@/lib/types';
import { transitionSignalState } from './signalMachine';

export interface PreemptEvaluation {
  updatedSignals: Signal[];
  logs: string[];
}

/**
 * Pure function evaluating pre-emption state for all signals given active ambulance routes.
 */
export function updateCorridorPreemption(
  signals: Signal[],
  ambulance: Ambulance | null,
  route: RoutePlan | null,
  currentStepIndex: number = 0
): PreemptEvaluation {
  if (!ambulance || !route || !route.steps) {
    // If no active ambulance route, update recovery states
    const updatedSignals = signals.map((s) => transitionSignalState(s, null, 1).updatedSignal);
    return { updatedSignals, logs: [] };
  }

  const logs: string[] = [];
  const signalEtaMap = new Map<string, number>();

  // Calculate cumulative ETA from ambulance's current step to each downstream signal
  let cumulativeS = 0;
  for (let i = currentStepIndex; i < route.steps.length; i++) {
    const step = route.steps[i];
    cumulativeS += step.durationS;
    if (step.hasSignal && step.signalId) {
      signalEtaMap.set(step.signalId, cumulativeS);
    }
  }

  const updatedSignals = signals.map((sig) => {
    const eta = signalEtaMap.get(sig.id) ?? null;
    const { updatedSignal, didTransition, reason } = transitionSignalState(sig, eta, 1);
    if (didTransition) {
      logs.push(`[${sig.name}]: ${reason}`);
    }
    return updatedSignal;
  });

  return { updatedSignals, logs };
}
