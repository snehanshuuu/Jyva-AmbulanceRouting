import { create } from 'zustand';
import {
  Ambulance,
  Hospital,
  Incident,
  Signal,
  RoutePlan,
  SimScenario,
  SimEvent,
  Vitals,
  AgeBand,
  Node,
  Edge,
  SpecialtyType,
  CaseType,
  HospitalCapacity,
} from '@/lib/types';
import defaultAmbulances from '@/data/ambulances.json';
import defaultHospitals from '@/data/hospitals.json';
import defaultSignals from '@/data/signals.json';
import defaultGraphData from '@/data/graph.json';
import defaultScenarios from '@/data/scenarios.json';
import { RoadNetworkGraph } from '@/engine/routing/graph';
import { findAStarRoute } from '@/engine/routing/astar';
import { evaluateRerouteNeed } from '@/engine/routing/reroute';
import { calculateTriageScore } from '@/engine/triage/score';
import { calculateVitalsTrend } from '@/engine/triage/trend';
import { rankHospitals } from '@/engine/recommend/rank';
import { updateCorridorPreemption } from '@/engine/corridor/preempt';
import {
  createInitialClockState,
  advanceClock,
  SimClockState,
  setClockSpeed,
  setClockRunning,
} from '@/engine/sim/clock';
import { advanceAmbulanceAlongRoute } from '@/engine/sim/movement';
import { simulateTrafficFluctuation } from '@/engine/sim/trafficModel';
import { createEventQueue, pullDueEvents, applySimEvent, EventQueue } from '@/engine/sim/events';

export interface FeedMessage {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'INFO' | 'ALERT' | 'SUCCESS' | 'WARNING';
}

interface SimStoreState {
  // State
  ambulances: Ambulance[];
  hospitals: Hospital[];
  signals: Signal[];
  incidents: Incident[];
  activeRoute: RoutePlan | null;
  activeAmbulanceId: string;
  currentStepIndex: number;
  graph: RoadNetworkGraph;
  scenarios: SimScenario[];
  activeScenarioId: string | null;
  eventQueue: EventQueue;
  clock: SimClockState;
  isRunning: boolean;
  speed: number;
  simSeconds: number;
  totalTimeSavedS: number;
  feed: FeedMessage[];

  // Actions
  setIsRunning: (running: boolean) => void;
  setSpeed: (speed: number) => void;
  loadScenario: (scenarioId: string) => void;
  selectAmbulance: (id: string) => void;
  updateVitals: (ambulanceId: string, vitals: Vitals, complaint?: string, ageBand?: AgeBand) => void;
  injectEvent: (event: SimEvent) => void;
  tick: (deltaSeconds?: number) => void;
  dispatchAmbulanceToIncident: (ambulanceId: string, incidentId: string) => void;
  updateHospitalBedCapacity: (hospitalId: string, capacityDelta: Partial<Hospital['capacity']>) => void;
  toggleHospitalDivert: (hospitalId: string, reason?: string) => void;
  resetSimulation: () => void;
}

export const useSimStore = create<SimStoreState>((set, get) => {
  const initialGraph = new RoadNetworkGraph(defaultGraphData as unknown as { nodes: Node[]; edges: Edge[] });
  const initialAmbulances = defaultAmbulances as Ambulance[];
  const initialHospitals = defaultHospitals as unknown as Hospital[];
  const initialSignals = defaultSignals as Signal[];
  const initialScenarios = defaultScenarios as SimScenario[];

  // Compute default corridor route for active unit DELTA-02 (Dadar TT -> KEM Hospital)
  const defaultRoute = findAStarRoute(initialGraph, 'node-dadar-tt', 'node-kem-gate');

  const defaultScenario = initialScenarios[0];
  const initialEventQueue = createEventQueue((defaultScenario?.events as unknown as SimEvent[]) || []);
  const initialClock = createInitialClockState();

  const initialIncidents: Incident[] = [
    {
      id: 'inc-demo-cardiac',
      title: 'Cardiac STEMI Alert - Dadar TT',
      pos: { lat: 19.0178, lng: 72.8478 },
      address: 'Near Dadar TT Circle Flyover pillar 12',
      type: 'CARDIAC',
      state: 'TRANSPORTING',
      createdAt: Date.now() - 360000,
      assignedAmbulanceId: 'AMB-014',
      assignedHospitalId: 'hosp-kem',
      patient: {
        id: 'pat-001',
        ageBand: 'ADULT',
        gender: 'M',
        complaint: 'Crushing retrosternal chest pain radiating to left jaw & diaphoresis',
        vitals: [
          { hr: 114, sbp: 88, dbp: 56, spo2: 91, rr: 26, gcs: 14, tempC: 36.8, ts: Date.now() - 120000 },
          { hr: 118, sbp: 86, dbp: 54, spo2: 90, rr: 27, gcs: 14, tempC: 36.7, ts: Date.now() },
        ],
        priority: 'P1',
        score: 8,
        reasons: [
          'Direct P1 escalation: Hypoxia SpO₂ 90% (≤91%) (+3)',
          'Hypotension / Shock SBP 86 mmHg (≤90) (+3)',
          'Tachypnea RR 27/min (≥25) (+3)',
          'Chief complaint indicates high probability acute coronary syndrome / STEMI (+2)',
        ],
        trend: 'DETERIORATING',
        specialtyRequired: 'CARDIAC',
      },
    },
  ];

  const initialFeed: FeedMessage[] = [
    {
      id: 'f-1',
      time: 'Just now',
      title: 'Green Corridor Active',
      description: 'Parel Dr. Ambedkar Cross preempted for DELTA-02 (estimated delay avoided: 35s)',
      type: 'SUCCESS',
    },
    {
      id: 'f-2',
      time: '1m ago',
      title: 'Early Triage Prioritized to P1 (Critical)',
      description: 'Patient vitals exhibit acute STEMI criteria with SpO2 90% & SBP 86 mmHg',
      type: 'ALERT',
    },
    {
      id: 'f-3',
      time: '3m ago',
      title: 'KEM Hospital Cath Lab Standby',
      description: 'Automated pre-arrival alert pushed to ER Coordinator. Interventional cardiology team standby',
      type: 'INFO',
    },
  ];

  return {
    ambulances: initialAmbulances,
    hospitals: initialHospitals,
    signals: initialSignals,
    incidents: initialIncidents,
    activeRoute: defaultRoute,
    activeAmbulanceId: 'AMB-014',
    currentStepIndex: 0,
    graph: initialGraph,
    scenarios: initialScenarios,
    activeScenarioId: 'scenario-cardiac-dadar',
    eventQueue: initialEventQueue,
    clock: initialClock,
    isRunning: true,
    speed: 1,
    simSeconds: 42,
    totalTimeSavedS: 145,
    feed: initialFeed,

    setIsRunning: (running) =>
      set((state) => ({
        isRunning: running,
        clock: setClockRunning(state.clock, running),
      })),

    setSpeed: (speed) =>
      set((state) => ({
        speed,
        clock: setClockSpeed(state.clock, speed),
      })),

    selectAmbulance: (id) => {
      const amb = get().ambulances.find((a) => a.id === id);
      if (!amb) return;

      let targetNode = 'node-kem-gate';
      if (amb.assignedHospitalId === 'hosp-hinduja') targetNode = 'node-hinduja-gate';
      else if (amb.assignedHospitalId === 'hosp-lilavati') targetNode = 'node-bandra-reclamation';
      else if (amb.assignedHospitalId === 'hosp-sion') targetNode = 'node-sion-circle';

      const route = findAStarRoute(get().graph, 'node-dadar-tt', targetNode);
      set({
        activeAmbulanceId: id,
        activeRoute: route,
        currentStepIndex: 0,
      });
    },

    loadScenario: (scenarioId) => {
      const scn = get().scenarios.find((s) => s.id === scenarioId);
      if (!scn) return;

      const freshGraph = new RoadNetworkGraph(defaultGraphData as unknown as { nodes: Node[]; edges: Edge[] });
      const freshQueue = createEventQueue(scn.events || []);

      const targetHospitalNode =
        scn.targetHospitalId === 'hosp-hinduja'
          ? 'node-hinduja-gate'
          : scn.targetHospitalId === 'hosp-lilavati'
            ? 'node-bandra-reclamation'
            : 'node-kem-gate';

      const startNode = scn.id === 'scenario-trauma-highway' ? 'node-mahim-causeway' : 'node-dadar-tt';
      const route = findAStarRoute(freshGraph, startNode, targetHospitalNode);

      const startNodeObj = freshGraph.getNode(startNode);
      const ambulances = get().ambulances.map((a) => {
        if (a.id === scn.targetAmbulanceId) {
          return {
            ...a,
            pos: startNodeObj?.pos || a.pos,
            status: 'TRANSPORTING' as const,
            speedKmh: 42,
          };
        }
        return a;
      });

      set({
        activeScenarioId: scenarioId,
        activeAmbulanceId: scn.targetAmbulanceId,
        activeRoute: route,
        currentStepIndex: 0,
        graph: freshGraph,
        eventQueue: freshQueue,
        simSeconds: 0,
        clock: createInitialClockState(),
        ambulances,
        feed: [
          {
            id: `f-${Date.now()}`,
            time: 'Just now',
            title: `Scenario Loaded: ${scn.title}`,
            description: scn.description,
            type: 'INFO',
          },
          ...get().feed,
        ],
      });
    },

    updateVitals: (ambulanceId, newVitals, complaint = '', ageBand = 'ADULT') => {
      set((state) => {
        const incidents = state.incidents.map((inc) => {
          if (inc.assignedAmbulanceId !== ambulanceId) return inc;

          const history = [...(inc.patient?.vitals || []), newVitals];
          const triage = calculateTriageScore(newVitals, complaint || inc.patient?.complaint || '', ageBand);
          const trendResult = calculateVitalsTrend(history, complaint, ageBand);

          // Auto-rank hospitals
          const ranked = rankHospitals(state.hospitals, inc.pos, {
            caseType: inc.type as CaseType,
            priority: triage.priority === 'P1' ? 'CRITICAL' : triage.priority === 'P2' ? 'URGENT' : 'STABLE',
          });
          const bestHospital = ranked[0]?.hospital;

          return {
            ...inc,
            assignedHospitalId: bestHospital?.id || inc.assignedHospitalId,
            patient: {
              ageBand,
              complaint: complaint || inc.patient?.complaint || '',
              vitals: history,
              priority: triage.priority,
              score: triage.score,
              reasons: triage.reasons,
              trend: trendResult.trend,
              specialtyRequired: inc.type as SpecialtyType,
            },
          };
        });

        return {
          incidents,
          feed: [
            {
              id: `f-${Date.now()}`,
              time: 'Just now',
              title: `Vitals Updated for ${ambulanceId}`,
              description: `New triage score calculated: Priority is evaluated.`,
              type: 'INFO',
            },
            ...state.feed,
          ],
        };
      });
    },

    injectEvent: (event) => {
      const state = get();
      const res = applySimEvent(
        event,
        state.graph,
        state.hospitals,
        state.ambulances,
        state.incidents,
        state.signals
      );

      set({
        hospitals: res.hospitals,
        ambulances: res.ambulances,
        incidents: res.incidents,
        signals: res.signals,
        feed: [
          {
            id: `ev-${Date.now()}`,
            time: 'Just now',
            title: res.logTitle,
            description: res.logDescription,
            type: res.logType,
          },
          ...state.feed,
        ],
      });
    },

    tick: (deltaSeconds = 1) => {
      const state = get();
      if (!state.isRunning) return;

      const effectiveDeltaS = deltaSeconds * state.speed;
      const newSimSeconds = state.simSeconds + effectiveDeltaS;
      const simDate = new Date(state.clock.simTimestampMs + effectiveDeltaS * 1000);
      const updatedClock = advanceClock(state.clock, deltaSeconds);

      let hospitals = state.hospitals;
      let ambulances = state.ambulances;
      let incidents = state.incidents;
      let signals = state.signals;
      let activeRoute = state.activeRoute;
      let currentStepIndex = state.currentStepIndex;
      let totalTimeSavedS = state.totalTimeSavedS;
      const newFeed = [...state.feed];

      // 1. Process Due Scenario Events
      const { dueEvents, updatedQueue } = pullDueEvents(state.eventQueue, newSimSeconds);
      for (const ev of dueEvents) {
        const res = applySimEvent(ev, state.graph, hospitals, ambulances, incidents, signals);
        hospitals = res.hospitals;
        ambulances = res.ambulances;
        incidents = res.incidents;
        signals = res.signals;
        newFeed.unshift({
          id: `ev-${Date.now()}-${Math.random()}`,
          time: 'Just now',
          title: res.logTitle,
          description: res.logDescription,
          type: res.logType,
        });
      }

      // 2. Traffic Fluctuation (Micro-smoothing)
      const edgesArray = Array.from(state.graph.edges.values());
      const fluctuatedEdges = simulateTrafficFluctuation(edgesArray, simDate);
      for (const edge of fluctuatedEdges) {
        state.graph.setEdgeCongestion(edge.id, edge.congestion);
      }

      // 3. Movement: Advance Active Ambulance
      const activeAmb = ambulances.find((a) => a.id === state.activeAmbulanceId);
      if (activeAmb && activeRoute && activeAmb.status === 'TRANSPORTING') {
        const currentFromNodeId = activeRoute.nodes[currentStepIndex];
        const currentToNodeId = activeRoute.nodes[currentStepIndex + 1];
        const currentEdge =
          currentFromNodeId && currentToNodeId
            ? state.graph.getOutEdges(currentFromNodeId).find((e) => e.to === currentToNodeId)
            : undefined;
        const congestion = currentEdge?.congestion ?? 0.3;

        const moveRes = advanceAmbulanceAlongRoute(
          activeAmb,
          activeRoute,
          currentStepIndex,
          effectiveDeltaS,
          congestion
        );

        ambulances = ambulances.map((a) => (a.id === activeAmb.id ? moveRes.updatedAmbulance : a));
        currentStepIndex = moveRes.nextStepIndex;

        if (moveRes.isArrived && activeAmb.status === 'TRANSPORTING') {
          newFeed.unshift({
            id: `arr-${Date.now()}`,
            time: 'Just now',
            title: 'Emergency Bay Arrival',
            description: `${activeAmb.callSign} has arrived at destination hospital emergency bay. Patient handover in progress.`,
            type: 'SUCCESS',
          });
        }
      }

      // 4. Green Corridor Signal Preemption State Machine
      const activeAmbAfterMove = ambulances.find((a) => a.id === state.activeAmbulanceId) || null;
      const { updatedSignals, logs } = updateCorridorPreemption(
        signals,
        activeAmbAfterMove,
        activeRoute,
        currentStepIndex
      );
      signals = updatedSignals;
      for (const log of logs) {
        newFeed.unshift({
          id: `sig-${Date.now()}-${Math.random()}`,
          time: 'Just now',
          title: 'Green Corridor Signal Update',
          description: log,
          type: 'SUCCESS',
        });
        totalTimeSavedS += 5;
      }

      // 5. Dynamic Re-routing Check (Architecture §6 & §10)
      if (
        activeRoute &&
        activeAmbAfterMove &&
        activeAmbAfterMove.status === 'TRANSPORTING' &&
        currentStepIndex < activeRoute.nodes.length - 1
      ) {
        const goalNodeId = activeRoute.nodes[activeRoute.nodes.length - 1];
        const signalsMap = new Map(signals.map((s) => [s.id, s]));
        const rerouteCheck = evaluateRerouteNeed(
          state.graph,
          activeRoute,
          currentStepIndex,
          goalNodeId,
          signalsMap
        );

        if (rerouteCheck.shouldReroute && rerouteCheck.newRoute) {
          activeRoute = rerouteCheck.newRoute;
          currentStepIndex = 0;
          newFeed.unshift({
            id: `reroute-${Date.now()}`,
            time: 'Just now',
            title: 'Dynamic A* Re-Route Activated',
            description: rerouteCheck.reason,
            type: 'ALERT',
          });
        }
      }

      set({
        simSeconds: newSimSeconds,
        clock: updatedClock,
        eventQueue: updatedQueue,
        hospitals,
        ambulances,
        incidents,
        signals,
        activeRoute,
        currentStepIndex,
        totalTimeSavedS,
        feed: newFeed.slice(0, 30),
      });
    },

    dispatchAmbulanceToIncident: (ambulanceId, incidentId) => {
      set((state) => ({
        ambulances: state.ambulances.map((a) =>
          a.id === ambulanceId ? { ...a, status: 'DISPATCHED', incidentId } : a
        ),
        incidents: state.incidents.map((i) =>
          i.id === incidentId ? { ...i, state: 'DISPATCHED', assignedAmbulanceId: ambulanceId } : i
        ),
      }));
    },

    updateHospitalBedCapacity: (hospitalId, delta) => {
      set((state) => ({
        hospitals: state.hospitals.map((h) =>
          h.id === hospitalId && h.capacity
            ? { ...h, capacity: { ...h.capacity, ...delta } as HospitalCapacity }
            : h
        ),
      }));
    },

    toggleHospitalDivert: (hospitalId, reason) => {
      set((state) => ({
        hospitals: state.hospitals.map((h) =>
          h.id === hospitalId ? { ...h, diverted: !h.diverted, divertReason: reason || 'Manual diversion toggle' } : h
        ),
      }));
    },

    resetSimulation: () => {
      const freshGraph = new RoadNetworkGraph(defaultGraphData as unknown as { nodes: Node[]; edges: Edge[] });
      const defaultScn = defaultScenarios[0];
      const freshRoute = findAStarRoute(freshGraph, 'node-dadar-tt', 'node-kem-gate');

      set({
        ambulances: defaultAmbulances as Ambulance[],
        hospitals: defaultHospitals as unknown as Hospital[],
        signals: defaultSignals as Signal[],
        graph: freshGraph,
        activeRoute: freshRoute,
        activeAmbulanceId: 'AMB-014',
        currentStepIndex: 0,
        simSeconds: 0,
        clock: createInitialClockState(),
        eventQueue: createEventQueue((defaultScn?.events as unknown as SimEvent[]) || []),
        totalTimeSavedS: 0,
      });
    },
  };
});
