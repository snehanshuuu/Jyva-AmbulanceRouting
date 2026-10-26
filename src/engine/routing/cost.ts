import { Edge, Node, Signal } from '@/lib/types';
import { haversineDistanceM } from '@/lib/geo';

// Architecture.md §6: AMB_FACTOR (≈1.2) models ambulance ability to move through traffic
export const AMB_FACTOR = 1.2;
export const MAX_SPEED_MS = (60 * 1000) / 3600; // 60 km/h upper bound in m/s for admissible heuristic

/**
 * Pure function computing travel time in seconds along an edge per architecture.md §6:
 * edgeCostSeconds = lengthM / (baseSpeed × max(0.1, 1 − congestion) × AMB_FACTOR)
 *                 + (node has signal and not preempted ? signal.baseDelayS : 0)
 */
export function calculateEdgeCost(
  edge: Edge,
  targetNode?: Node,
  signalsMap?: Map<string, Signal>,
  isBaseline: boolean = false,
  ambFactor: number = AMB_FACTOR
): number {
  if (edge.closed) {
    return Infinity;
  }

  const speedKmh = edge.baseSpeedKmh;
  const speedMs = (speedKmh * 1000) / 3600;

  if (isBaseline) {
    // Baseline: pure unweighted travel time without congestion awareness or green corridor
    return edge.lengthM / speedMs;
  }

  // Congestion effective speed factor: max(0.1, 1 - congestion)
  const trafficFactor = Math.max(0.1, 1 - edge.congestion);
  const effectiveSpeedMs = speedMs * trafficFactor * ambFactor;
  let costS = edge.lengthM / effectiveSpeedMs;

  // Signal delay at target intersection: (node has signal and not preempted ? signal.baseDelayS : 0)
  if (targetNode?.signalId && signalsMap) {
    const sig = signalsMap.get(targetNode.signalId);
    if (sig) {
      const isPreempted = sig.state === 'GREEN_HOLD' || sig.state === 'PREEMPT_REQUESTED';
      if (!isPreempted) {
        costS += sig.baseDelayS;
      }
    }
  }

  return costS;
}

/**
 * Admissible Haversine distance heuristic in seconds:
 * heuristic = haversine(node, goal) / maxSpeed   // admissible
 */
export function haversineHeuristic(current: Node, goal: Node, maxSpeedMs: number = MAX_SPEED_MS): number {
  const distM = haversineDistanceM(current.pos, goal.pos);
  return distM / maxSpeedMs;
}
