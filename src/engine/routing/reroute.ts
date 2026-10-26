import { RoutePlan, Signal } from '@/lib/types';
import { RoadNetworkGraph } from './graph';
import { calculateEdgeCost } from './cost';
import { findAStarRoute } from './astar';

export interface RerouteCheckResult {
  shouldReroute: boolean;
  costIncreaseRatio: number;
  newRoute: RoutePlan | null;
  reason: string;
}

/**
 * Checks whether sudden traffic congestion or edge closure warrants dynamic re-routing.
 */
export function evaluateRerouteNeed(
  graph: RoadNetworkGraph,
  currentRoute: RoutePlan,
  currentNodeIndex: number,
  goalNodeId: string,
  signalsMap?: Map<string, Signal>
): RerouteCheckResult {
  const remainingNodes = currentRoute.nodes.slice(currentNodeIndex);
  if (remainingNodes.length < 2) {
    return {
      shouldReroute: false,
      costIncreaseRatio: 0,
      newRoute: null,
      reason: 'Approaching destination; re-route disabled',
    };
  }

  // Look ahead at next up to 5 edges
  const lookaheadCount = Math.min(5, remainingNodes.length - 1);
  let totalCurrentRemainingCost = 0;
  let hasClosedEdge = false;

  for (let i = 0; i < lookaheadCount; i++) {
    const from = remainingNodes[i];
    const to = remainingNodes[i + 1];
    const edge = graph.getOutEdges(from).find((e) => e.to === to);
    if (!edge || edge.closed) {
      hasClosedEdge = true;
      break;
    }
    const targetNode = graph.getNode(to);
    totalCurrentRemainingCost += calculateEdgeCost(edge, targetNode, signalsMap, false);
  }

  let plannedLookaheadCost = 0;
  if (currentRoute.steps) {
    for (let i = currentNodeIndex; i < Math.min(currentNodeIndex + lookaheadCount, currentRoute.steps.length); i++) {
      plannedLookaheadCost += currentRoute.steps[i].durationS;
    }
  }

  const costIncreaseRatio = plannedLookaheadCost > 0
    ? (totalCurrentRemainingCost - plannedLookaheadCost) / plannedLookaheadCost
    : 0;

  const currentNodeId = remainingNodes[0];

  // If road is completely blocked, instant re-route required
  if (hasClosedEdge) {
    const candidateRoute = findAStarRoute(graph, currentNodeId, goalNodeId, signalsMap);
    return {
      shouldReroute: true,
      costIncreaseRatio: 99.0,
      newRoute: candidateRoute,
      reason: 'Impassable blockage / road closure detected along active corridor',
    };
  }

  // Only recompute if cost rose > 25% vs plan (or planned cost was zero)
  if (costIncreaseRatio <= 0.25) {
    return {
      shouldReroute: false,
      costIncreaseRatio,
      newRoute: null,
      reason: 'Active corridor cost increase within 25% tolerance threshold',
    };
  }

  // Compute re-evaluated route from current node
  const alternativeRoute = findAStarRoute(graph, currentNodeId, goalNodeId, signalsMap);
  if (!alternativeRoute) {
    return {
      shouldReroute: false,
      costIncreaseRatio,
      newRoute: null,
      reason: 'No alternative feasible path found',
    };
  }

  // If alternative saves > 10% ETA vs current remaining projection
  const currentEstRemainingEtaS = currentRoute.etaS * (remainingNodes.length / currentRoute.nodes.length);
  const etaDelta = currentEstRemainingEtaS - alternativeRoute.etaS;
  const etaSavingsRatio = etaDelta / Math.max(1, currentEstRemainingEtaS);

  if (etaSavingsRatio > 0.10) {
    return {
      shouldReroute: true,
      costIncreaseRatio: etaSavingsRatio,
      newRoute: alternativeRoute,
      reason: `Dynamic A* alternative route saves ${Math.round(etaDelta)}s (${Math.round(etaSavingsRatio * 100)}% faster)`,
    };
  }

  return {
    shouldReroute: false,
    costIncreaseRatio: etaSavingsRatio,
    newRoute: null,
    reason: 'Active corridor remains optimal within tolerance threshold',
  };
}
