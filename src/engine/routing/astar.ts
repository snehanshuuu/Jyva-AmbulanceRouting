import { RoutePlan, Signal, RouteStep } from '@/lib/types';
import { RoadNetworkGraph } from './graph';
import { calculateEdgeCost, haversineHeuristic } from './cost';
import { formatDurationS } from '@/lib/time';

/**
 * A* pathfinding algorithm over directed weighted RoadNetworkGraph.
 * Returns primary route, baseline route, and time saved comparison.
 */
export function findAStarRoute(
  graph: RoadNetworkGraph,
  startNodeId: string,
  goalNodeId: string,
  signalsMap?: Map<string, Signal>
): RoutePlan | null {
  const startNode = graph.getNode(startNodeId);
  const goalNode = graph.getNode(goalNodeId);

  if (!startNode || !goalNode) {
    return null;
  }

  // Helper for computing path
  function runSearch(isBaseline: boolean) {
    const openSet = new Set<string>([startNodeId]);
    const cameFromEdge = new Map<string, { from: string; edgeId: string }>();

    const gScore = new Map<string, number>();
    gScore.set(startNodeId, 0);

    const fScore = new Map<string, number>();
    fScore.set(startNodeId, haversineHeuristic(startNode!, goalNode!));

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let currentId = '';
      let lowestF = Infinity;
      for (const id of openSet) {
        const score = fScore.get(id) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentId = id;
        }
      }

      if (currentId === goalNodeId) {
        // Reconstruct path
        const nodePath: string[] = [goalNodeId];
        const stepEdges: string[] = [];
        let curr = goalNodeId;
        while (cameFromEdge.has(curr)) {
          const prev = cameFromEdge.get(curr)!;
          stepEdges.unshift(prev.edgeId);
          nodePath.unshift(prev.from);
          curr = prev.from;
        }
        return { nodePath, stepEdges, durationS: gScore.get(goalNodeId) ?? 0 };
      }

      openSet.delete(currentId);

      const outEdges = graph.getOutEdges(currentId);
      for (const edge of outEdges) {
        if (edge.closed) continue;

        const neighborId = edge.to;
        const targetNode = graph.getNode(neighborId);
        const cost = calculateEdgeCost(edge, targetNode, signalsMap, isBaseline);
        if (cost === Infinity) continue;

        const tentativeG = (gScore.get(currentId) ?? Infinity) + cost;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFromEdge.set(neighborId, { from: currentId, edgeId: edge.id });
          gScore.set(neighborId, tentativeG);
          const f = tentativeG + haversineHeuristic(targetNode || startNode!, goalNode!);
          fScore.set(neighborId, f);
          openSet.add(neighborId);
        }
      }
    }

    return null;
  }

  // 1. Run congestion-aware optimal search
  const primaryResult = runSearch(false);
  if (!primaryResult) return null;

  // 2. Run baseline search (shortest distance / non-congestion aware)
  const baselineResult = runSearch(true);
  let baselineEtaS = primaryResult.durationS * 1.25;
  if (baselineResult) {
    let actualDurationOfBaselinePath = 0;
    for (let i = 0; i < baselineResult.nodePath.length - 1; i++) {
      const toId = baselineResult.nodePath[i + 1];
      const edgeId = baselineResult.stepEdges[i];
      const edge = graph.getEdge(edgeId);
      const toNode = graph.getNode(toId);
      if (edge) {
        actualDurationOfBaselinePath += calculateEdgeCost(edge, toNode, signalsMap, false);
      }
    }
    baselineEtaS = Math.max(actualDurationOfBaselinePath, primaryResult.durationS);
  }

  // Reconstruct details and steps
  const steps: RouteStep[] = [];
  const signalsOnRoute: string[] = [];
  let totalDistanceM = 0;

  for (let i = 0; i < primaryResult.nodePath.length - 1; i++) {
    const fromId = primaryResult.nodePath[i];
    const toId = primaryResult.nodePath[i + 1];
    const edgeId = primaryResult.stepEdges[i];
    const edge = graph.getEdge(edgeId);
    const toNode = graph.getNode(toId);

    const distM = edge ? edge.lengthM : 500;
    totalDistanceM += distM;

    let hasSig = false;
    let sigId: string | undefined;
    if (toNode?.signalId) {
      hasSig = true;
      sigId = toNode.signalId;
      signalsOnRoute.push(sigId);
    }

    steps.push({
      fromNodeId: fromId,
      toNodeId: toId,
      instruction: edge?.name ? `Continue along ${edge.name}` : `Proceed towards ${toNode?.name || toId}`,
      distanceM: distM,
      durationS: edge ? calculateEdgeCost(edge, toNode, signalsMap, false) : 30,
      hasSignal: hasSig,
      signalId: sigId,
    });
  }

  const pathCoordinates = primaryResult.nodePath
    .map((id) => graph.getNode(id)?.pos)
    .filter((pos): pos is { lat: number; lng: number } => pos !== undefined);

  const timeSavedS = Math.max(0, baselineEtaS - primaryResult.durationS);
  const reasons: string[] = [
    `Congestion-aware path chosen over ${primaryResult.nodePath.length} intersections`,
    `Projected arrival in ${formatDurationS(primaryResult.durationS)} (saves ${formatDurationS(timeSavedS)} vs standard navigation)`,
    `${signalsOnRoute.length} green-corridor pre-emptible signals identified`,
  ];

  return {
    id: `route-${Date.now()}`,
    nodes: primaryResult.nodePath,
    pathCoordinates,
    steps,
    etaS: Math.round(primaryResult.durationS),
    baselineEtaS: Math.round(baselineEtaS),
    distanceM: totalDistanceM,
    signalsOnRoute,
    reasons,
  };
}
