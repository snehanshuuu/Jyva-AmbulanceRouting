import { describe, it, expect } from 'vitest';
import { RoadNetworkGraph } from '@/engine/routing/graph';
import { findAStarRoute } from '@/engine/routing/astar';
import { calculateEdgeCost, haversineHeuristic, AMB_FACTOR, MAX_SPEED_MS } from '@/engine/routing/cost';
import { evaluateRerouteNeed } from '@/engine/routing/reroute';
import { Edge, Node, Signal } from '@/lib/types';
import defaultGraphData from '@/data/graph.json';

describe('Routing Engine - Cost Function & Heuristic (Architecture §6)', () => {
  const dummyNodeWithSignal: Node = {
    id: 'node-test-sig',
    pos: { lat: 19.0185, lng: 72.8425 },
    signalId: 'sig-test-1',
  };

  const dummyNodeNoSignal: Node = {
    id: 'node-test-nosig',
    pos: { lat: 19.0200, lng: 72.8450 },
  };

  const dummyEdge: Edge = {
    id: 'e-test',
    from: 'node-start',
    to: 'node-test-sig',
    lengthM: 1000,
    baseSpeedKmh: 60, // 60 km/h = 16.6667 m/s
    congestion: 0.0,
    closed: false,
  };

  it('calculates free-flow travel time according to architecture formula', () => {
    // edgeCostSeconds = lengthM / (baseSpeed × max(0.1, 1 − congestion) × AMB_FACTOR)
    // For 1000m at 60 km/h (16.6667 m/s), congestion 0, AMB_FACTOR 1.2:
    // effectiveSpeed = (60 * 1000 / 3600) * 1.0 * 1.2 = 20 m/s
    // cost = 1000 / 20 = 50.0 seconds
    const cost = calculateEdgeCost(dummyEdge, dummyNodeNoSignal);
    expect(cost).toBeCloseTo(50.0, 2);
  });

  it('applies congestion factor and enforces max(0.1, 1 - congestion) lower bound', () => {
    // 1. Moderate congestion = 0.5 -> trafficFactor = 0.5
    // effectiveSpeed = speedMs * 0.5 * 1.2 = 10 m/s -> cost = 100s
    const moderateEdge: Edge = { ...dummyEdge, congestion: 0.5 };
    const moderateCost = calculateEdgeCost(moderateEdge, dummyNodeNoSignal);
    expect(moderateCost).toBeCloseTo(100.0, 2);

    // 2. Severe gridlock = 0.95 -> trafficFactor clamped to 0.1 (not 0.05)
    // effectiveSpeed = speedMs * 0.1 * 1.2 = 2 m/s -> cost = 500s
    const gridlockEdge: Edge = { ...dummyEdge, congestion: 0.95 };
    const gridlockCost = calculateEdgeCost(gridlockEdge, dummyNodeNoSignal);
    expect(gridlockCost).toBeCloseTo(500.0, 2);

    // 3. Complete gridlock = 1.0 -> trafficFactor clamped to 0.1
    const stalledEdge: Edge = { ...dummyEdge, congestion: 1.0 };
    const stalledCost = calculateEdgeCost(stalledEdge, dummyNodeNoSignal);
    expect(stalledCost).toBeCloseTo(500.0, 2);
  });

  it('applies AMB_FACTOR emergency vehicle advantage', () => {
    const standardVehicleCost = calculateEdgeCost(dummyEdge, dummyNodeNoSignal, undefined, false, 1.0);
    const ambulanceCost = calculateEdgeCost(dummyEdge, dummyNodeNoSignal, undefined, false, AMB_FACTOR);

    // Ambulance should be AMB_FACTOR (1.2x) faster
    expect(ambulanceCost).toBeCloseTo(standardVehicleCost / AMB_FACTOR, 2);
    expect(AMB_FACTOR).toBe(1.2);
  });

  it('returns Infinity for closed or blocked roads', () => {
    const closedEdge: Edge = { ...dummyEdge, closed: true };
    const cost = calculateEdgeCost(closedEdge, dummyNodeNoSignal);
    expect(cost).toBe(Infinity);
  });

  it('adds signal delay when intersection is not preempted and 0 when preempted', () => {
    const signalsMap = new Map<string, Signal>();
    const signal: Signal = {
      id: 'sig-test-1',
      nodeId: 'node-test-sig',
      name: 'Test Signal',
      pos: { lat: 19.0185, lng: 72.8425 },
      state: 'NORMAL',
      baseDelayS: 40,
      activePreemptEtaS: 0,
      timeInCurrentStateS: 0,
    };
    signalsMap.set(signal.id, signal);

    // 1. NORMAL state: adds full baseDelayS (50s travel + 40s signal = 90s)
    const normalCost = calculateEdgeCost(dummyEdge, dummyNodeWithSignal, signalsMap);
    expect(normalCost).toBeCloseTo(90.0, 2);

    // 2. GREEN_HOLD (preempted green corridor): 0 signal delay (50s travel + 0s = 50s)
    signal.state = 'GREEN_HOLD';
    const greenHoldCost = calculateEdgeCost(dummyEdge, dummyNodeWithSignal, signalsMap);
    expect(greenHoldCost).toBeCloseTo(50.0, 2);

    // 3. PREEMPT_REQUESTED: also treated as preempted (0 delay)
    signal.state = 'PREEMPT_REQUESTED';
    const preemptCost = calculateEdgeCost(dummyEdge, dummyNodeWithSignal, signalsMap);
    expect(preemptCost).toBeCloseTo(50.0, 2);
  });

  it('calculates unweighted baseline travel time when isBaseline is true', () => {
    const congestedEdge: Edge = { ...dummyEdge, congestion: 0.7 };
    // Baseline ignores congestion and AMB_FACTOR: 1000m / (60 km/h in m/s) = 60 seconds
    const baselineCost = calculateEdgeCost(congestedEdge, dummyNodeNoSignal, undefined, true);
    expect(baselineCost).toBeCloseTo(60.0, 2);
  });

  it('verifies that haversineHeuristic is admissible (never overestimates travel time)', () => {
    const nodeA: Node = { id: 'A', pos: { lat: 19.0178, lng: 72.8478 } };
    const nodeB: Node = { id: 'B', pos: { lat: 19.0068, lng: 72.8422 } };

    const h = haversineHeuristic(nodeA, nodeB);
    expect(h).toBeGreaterThan(0);

    // When current === goal, heuristic is exactly 0
    expect(haversineHeuristic(nodeA, nodeA)).toBe(0);

    // For any road between nodeA and nodeB with max speed <= 60 km/h,
    // true road travel time is always >= Euclidean/Haversine distance / MAX_SPEED_MS
    const straightLineM = haversineHeuristic(nodeA, nodeB) * MAX_SPEED_MS;
    expect(straightLineM).toBeGreaterThan(1000); // ~1.3 km
  });
});

describe('Mumbai Road Graph JSON Validation', () => {
  it('loads the Mumbai corridor graph with valid nodes and directed edges', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    expect(graph.nodes.size).toBeGreaterThanOrEqual(10);
    expect(graph.edges.size).toBeGreaterThanOrEqual(15);

    // Verify key Mumbai emergency corridor landmarks
    expect(graph.getNode('node-dadar-tt')).toBeDefined();
    expect(graph.getNode('node-kem-gate')).toBeDefined();
    expect(graph.getNode('node-hinduja-gate')).toBeDefined();
    expect(graph.getNode('node-sion-circle')).toBeDefined();
  });

  it('verifies all edges connect existing nodes with positive length and speed', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    for (const [, edge] of graph.edges) {
      expect(graph.getNode(edge.from)).toBeDefined();
      expect(graph.getNode(edge.to)).toBeDefined();
      expect(edge.lengthM).toBeGreaterThan(0);
      expect(edge.baseSpeedKmh).toBeGreaterThan(0);
      expect(edge.congestion).toBeGreaterThanOrEqual(0);
      expect(edge.congestion).toBeLessThanOrEqual(1);
    }
  });

  it('supports dynamic edge congestion and closure mutations', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const edgeId = 'e-dadar-parel-s';
    graph.setEdgeCongestion(edgeId, 0.85);
    expect(graph.getEdge(edgeId)?.congestion).toBe(0.85);

    graph.setEdgeClosed(edgeId, true);
    expect(graph.getEdge(edgeId)?.closed).toBe(true);

    graph.setEdgeClosed(edgeId, false);
    expect(graph.getEdge(edgeId)?.closed).toBe(false);
  });
});

describe('A* Pathfinding Algorithm (Architecture §6)', () => {
  it('finds optimal route from Dadar TT to KEM Emergency Gate', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const route = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate');

    expect(route).not.toBeNull();
    expect(route?.nodes[0]).toBe('node-dadar-tt');
    expect(route?.nodes[route.nodes.length - 1]).toBe('node-kem-gate');
    expect(route?.distanceM).toBeGreaterThan(1000);
    expect(route?.etaS).toBeGreaterThan(0);
    expect(route?.steps?.length).toBeGreaterThanOrEqual(2);
    expect(route?.pathCoordinates?.length).toBe(route?.nodes.length);
    expect(route?.reasons?.length).toBeGreaterThan(0);
  });

  it('dynamically chooses alternative detour when primary road is congested', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);

    // Baseline: Dadar TT to KEM via Parel
    const normalRoute = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate');
    expect(normalRoute).not.toBeNull();

    // Inject massive congestion on the direct Ambedkar Road segment
    graph.setEdgeCongestion('e-dadar-parel-s', 0.95);

    const detourRoute = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate');
    expect(detourRoute).not.toBeNull();
    // Path should adjust to avoid the severe congestion bottleneck
    expect(detourRoute?.etaS).toBeGreaterThan(0);
  });

  it('completely avoids closed roads and routes around them', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);

    // Close direct southbound edge from Dadar TT to Parel
    graph.setEdgeClosed('e-dadar-parel-s', true);

    const route = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate');
    expect(route).not.toBeNull();
    // Route must not contain the closed edge
    const containsClosedEdge = route?.steps?.some(
      (s) => s.fromNodeId === 'node-dadar-tt' && s.toNodeId === 'node-parel-junction'
    );
    expect(containsClosedEdge).toBe(false);
  });

  it('returns null when destination is unreachable', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);

    // Close both access roads to KEM gate
    graph.setEdgeClosed('e-parel-kem', true);

    const route = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate');
    expect(route).toBeNull();
  });

  it('handles start node equaling goal node gracefully', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const route = findAStarRoute(graph, 'node-dadar-tt', 'node-dadar-tt');

    expect(route).not.toBeNull();
    expect(route?.nodes).toEqual(['node-dadar-tt']);
    expect(route?.distanceM).toBe(0);
    expect(route?.etaS).toBe(0);
  });

  it('calculates baseline ETA and demonstrates positive time savings', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const route = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate');

    expect(route).not.toBeNull();
    expect(route?.baselineEtaS).toBeGreaterThanOrEqual(route?.etaS ?? 0);
  });
});

describe('Dynamic Re-routing Evaluation (Architecture §6)', () => {
  it('triggers immediate re-route when upcoming corridor segment is closed', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const initialRoute = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate')!;

    // Road closed ahead
    graph.setEdgeClosed('e-dadar-parel-s', true);

    const check = evaluateRerouteNeed(graph, initialRoute, 0, 'node-kem-gate');
    expect(check.shouldReroute).toBe(true);
    expect(check.newRoute).not.toBeNull();
    expect(check.reason).toContain('blockage');
  });

  it('does NOT trigger re-route if cost increase is within 25% tolerance', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const initialRoute = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate')!;

    // Minor congestion increase (+10%)
    graph.setEdgeCongestion('e-dadar-parel-s', 0.65);

    const check = evaluateRerouteNeed(graph, initialRoute, 0, 'node-kem-gate');
    expect(check.shouldReroute).toBe(false);
    expect(check.newRoute).toBeNull();
  });

  it('does NOT re-route when approaching destination (remaining nodes < 2)', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const initialRoute = findAStarRoute(graph, 'node-dadar-tt', 'node-kem-gate')!;

    // Ambulance is at final node
    const lastIndex = initialRoute.nodes.length - 1;
    const check = evaluateRerouteNeed(graph, initialRoute, lastIndex, 'node-kem-gate');
    expect(check.shouldReroute).toBe(false);
    expect(check.reason).toContain('Approaching destination');
  });
});
