import { NextRequest, NextResponse } from 'next/server';
import { RoadNetworkGraph } from '@/engine/routing/graph';
import { findAStarRoute } from '@/engine/routing/astar';
import defaultGraphData from '@/data/graph.json';
import defaultSignals from '@/data/signals.json';
import { Signal, Node, Edge } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromNodeId, toNodeId } = body;

    if (!fromNodeId || !toNodeId) {
      return NextResponse.json(
        { error: 'fromNodeId and toNodeId are required parameters' },
        { status: 400 }
      );
    }

    const graph = new RoadNetworkGraph(defaultGraphData as unknown as { nodes: Node[]; edges: Edge[] });
    const signalsMap = new Map<string, Signal>();
    for (const s of defaultSignals as Signal[]) {
      signalsMap.set(s.id, s);
    }

    const routePlan = findAStarRoute(graph, fromNodeId, toNodeId, signalsMap);

    if (!routePlan) {
      return NextResponse.json(
        { error: `No feasible route found from ${fromNodeId} to ${toNodeId}` },
        { status: 404 }
      );
    }

    return NextResponse.json(routePlan);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error computing route';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
