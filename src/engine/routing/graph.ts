import { Node, Edge } from '@/lib/types';
import defaultGraphData from '@/data/graph.json';

export class RoadNetworkGraph {
  public nodes: Map<string, Node> = new Map();
  public edges: Map<string, Edge> = new Map();
  public adjacency: Map<string, Edge[]> = new Map();

  constructor(graphData?: { nodes: Node[]; edges: Edge[] }) {
    const data = graphData || (defaultGraphData as { nodes: Node[]; edges: Edge[] });
    for (const node of data.nodes) {
      this.nodes.set(node.id, { ...node });
      this.adjacency.set(node.id, []);
    }
    for (const edge of data.edges) {
      const clonedEdge: Edge = { ...edge };
      this.edges.set(clonedEdge.id, clonedEdge);
      if (!this.adjacency.has(clonedEdge.from)) {
        this.adjacency.set(clonedEdge.from, []);
      }
      this.adjacency.get(clonedEdge.from)!.push(clonedEdge);
    }
  }

  getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  getOutEdges(nodeId: string): Edge[] {
    return this.adjacency.get(nodeId) || [];
  }

  setEdgeCongestion(edgeId: string, congestion: number): void {
    const edge = this.edges.get(edgeId);
    if (edge) {
      edge.congestion = Math.max(0, Math.min(1, congestion));
    }
  }

  setEdgeClosed(edgeId: string, closed: boolean): void {
    const edge = this.edges.get(edgeId);
    if (edge) {
      edge.closed = closed;
    }
  }
}
