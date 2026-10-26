import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialClockState,
  advanceClock,
  setClockSpeed,
  setClockRunning,
  formatSimClockTime,
} from '@/engine/sim/clock';
import { advanceAmbulanceAlongRoute } from '@/engine/sim/movement';
import {
  getTimeOfDayCongestionFactor,
  getRoadClassMultiplier,
  simulateTrafficFluctuation,
} from '@/engine/sim/trafficModel';
import {
  createEventQueue,
  pullDueEvents,
  applySimEvent,
} from '@/engine/sim/events';
import { RoadNetworkGraph } from '@/engine/routing/graph';
import { useSimStore } from '@/store/useSimStore';
import { Ambulance, RoutePlan, SimEvent, Hospital, Incident, Edge } from '@/lib/types';
import defaultGraphData from '@/data/graph.json';

describe('Simulation Clock (Architecture §10)', () => {
  it('initializes clock with 1x speed and active running state', () => {
    const clock = createInitialClockState(new Date('2026-10-19T09:00:00Z'));
    expect(clock.isRunning).toBe(true);
    expect(clock.speedMultiplier).toBe(1);
    expect(clock.elapsedSimSeconds).toBe(0);
    expect(clock.simTimestampMs).toBeGreaterThan(0);
  });

  it('advances elapsed seconds based on speed multiplier', () => {
    const base = createInitialClockState();

    // 1x speed: 10 real seconds -> 10 sim seconds
    const advanced1x = advanceClock(base, 10);
    expect(advanced1x.elapsedSimSeconds).toBe(10);

    // 5x speed: 10 real seconds -> 50 sim seconds
    const speed5x = setClockSpeed(base, 5);
    const advanced5x = advanceClock(speed5x, 10);
    expect(advanced5x.elapsedSimSeconds).toBe(50);
    expect(advanced5x.simTimestampMs - base.simTimestampMs).toBe(50000);
  });

  it('freezes clock advancement when paused', () => {
    const base = createInitialClockState();
    const paused = setClockRunning(base, false);
    const ticked = advanceClock(paused, 10);

    expect(ticked.elapsedSimSeconds).toBe(0);
    expect(ticked.simTimestampMs).toBe(base.simTimestampMs);
  });

  it('clamps speed multiplier between 1 and 10', () => {
    const base = createInitialClockState();
    expect(setClockSpeed(base, 0.5).speedMultiplier).toBe(1);
    expect(setClockSpeed(base, 15).speedMultiplier).toBe(10);
  });

  it('formats simulated wall-clock time correctly', () => {
    const date = new Date('2026-10-19T14:35:20');
    expect(formatSimClockTime(date.getTime())).toBe('14:35:20');
  });
});

describe('Ambulance Movement Engine (Architecture §10)', () => {
  const dummyAmbulance: Ambulance = {
    id: 'amb-test',
    plate: 'MH-01-EQ-9999',
    callSign: 'DELTA-99',
    type: 'ALS',
    status: 'TRANSPORTING',
    operator: {
      type: 'GOVT_108',
      name: '108 EMS',
    },
    pos: { lat: 19.0178, lng: 72.8478 }, // Dadar TT
    heading: 0,
    speedKmh: 45,
  };

  const dummyRoute: RoutePlan = {
    id: 'r-test',
    nodes: ['node-dadar-tt', 'node-parel-junction', 'node-kem-gate'],
    pathCoordinates: [
      { lat: 19.0178, lng: 72.8478 }, // Dadar TT
      { lat: 19.0068, lng: 72.8422 }, // Parel TT (~1.3 km south)
      { lat: 19.0026, lng: 72.8427 }, // KEM Gate (~450 m south)
    ],
    etaS: 180,
    baselineEtaS: 240,
    distanceM: 1750,
    signalsOnRoute: [],
  };

  it('interpolates position forward along current route leg', () => {
    const res = advanceAmbulanceAlongRoute(dummyAmbulance, dummyRoute, 0, 10, 0.2);

    expect(res.isArrived).toBe(false);
    expect(res.nextStepIndex).toBe(0);
    expect(res.distanceCoveredM).toBeGreaterThan(0);
    expect(res.updatedAmbulance.speedKmh).toBeGreaterThan(0);
    // Lat should move south towards 19.0068 (decreasing latitude)
    expect(res.updatedAmbulance.pos.lat).toBeLessThan(dummyAmbulance.pos.lat);
    expect(res.updatedAmbulance.heading).toBeGreaterThan(150); // South-southwest
  });

  it('transitions to next waypoint leg when leg distance is covered', () => {
    // 300 seconds delta is plenty to cover the ~1300m first leg
    const res = advanceAmbulanceAlongRoute(dummyAmbulance, dummyRoute, 0, 300, 0.1);

    expect(res.nextStepIndex).toBe(1);
    expect(res.updatedAmbulance.pos).toEqual(dummyRoute.pathCoordinates![1]);
  });

  it('detects final destination arrival and stops ambulance', () => {
    // Ambulance already at last leg (Parel -> KEM)
    const nearEndAmbulance: Ambulance = {
      ...dummyAmbulance,
      pos: { lat: 19.0068, lng: 72.8422 },
    };

    const res = advanceAmbulanceAlongRoute(nearEndAmbulance, dummyRoute, 1, 300, 0.1);

    expect(res.isArrived).toBe(true);
    expect(res.nextStepIndex).toBe(2);
    expect(res.updatedAmbulance.speedKmh).toBe(0);
    expect(res.updatedAmbulance.status).toBe('ARRIVED');
    expect(res.updatedAmbulance.pos).toEqual(dummyRoute.pathCoordinates![2]);
  });
});

describe('Traffic Congestion Model (Architecture §10)', () => {
  it('models time-of-day peak congestion in Mumbai', () => {
    const morningRush = new Date('2026-10-19T09:30:00');
    const eveningRush = new Date('2026-10-19T18:45:00');
    const lateNight = new Date('2026-10-19T02:30:00');
    const afternoon = new Date('2026-10-19T14:00:00');

    expect(getTimeOfDayCongestionFactor(morningRush)).toBe(1.40);
    expect(getTimeOfDayCongestionFactor(eveningRush)).toBe(1.55);
    expect(getTimeOfDayCongestionFactor(lateNight)).toBe(0.35);
    expect(getTimeOfDayCongestionFactor(afternoon)).toBe(1.0);
  });

  it('differentiates arterial highways from local hospital spurs', () => {
    const arterialEdge: Edge = {
      id: 'e-ambedkar',
      from: 'A',
      to: 'B',
      name: 'Dr. Ambedkar Road Main Arterial',
      lengthM: 1000,
      baseSpeedKmh: 55,
      congestion: 0.5,
      closed: false,
    };
    const localEdge: Edge = {
      id: 'e-local',
      from: 'B',
      to: 'C',
      name: 'Emergency Gate Access Alley',
      lengthM: 200,
      baseSpeedKmh: 30,
      congestion: 0.2,
      closed: false,
    };

    expect(getRoadClassMultiplier(arterialEdge)).toBeGreaterThan(getRoadClassMultiplier(localEdge));
  });

  it('simulates natural smoothed traffic fluctuations without unclosing roads', () => {
    const edges: Edge[] = [
      { id: 'e1', from: 'A', to: 'B', name: 'Road 1', lengthM: 500, baseSpeedKmh: 50, congestion: 0.4, closed: false },
      { id: 'e2', from: 'B', to: 'C', name: 'Road 2', lengthM: 500, baseSpeedKmh: 50, congestion: 0.9, closed: true },
    ];

    const updated = simulateTrafficFluctuation(edges, new Date('2026-10-19T10:00:00'), true);

    expect(updated[0].congestion).toBeGreaterThanOrEqual(0.05);
    expect(updated[0].congestion).toBeLessThanOrEqual(0.95);
    // Closed road must remain closed
    expect(updated[1].closed).toBe(true);
  });
});

describe('Event Queue & Injection Engine (Architecture §10)', () => {
  const dummyEvents: SimEvent[] = [
    { id: 'ev-2', type: 'TRAFFIC_JAM', timestamp: 45, description: 'Jam at Parel', payload: { edgeIds: ['e-dadar-parel-s'], congestion: 0.9 } },
    { id: 'ev-1', type: 'NEW_INCIDENT', timestamp: 10, description: 'Cardiac Call', payload: {} },
    { id: 'ev-3', type: 'ROAD_CLOSURE', timestamp: 75, description: 'Oil Spill', payload: { edgeId: 'e-dadar-parel-s' } },
  ];

  it('sorts events and pulls only due events on each sim tick', () => {
    const queue = createEventQueue(dummyEvents);
    expect(queue.pendingEvents[0].id).toBe('ev-1');

    // At sim time 30s: only ev-1 (10s) is due
    const { dueEvents: dueAt30, updatedQueue: q30 } = pullDueEvents(queue, 30);
    expect(dueAt30.length).toBe(1);
    expect(dueAt30[0].id).toBe('ev-1');
    expect(q30.pendingEvents.length).toBe(2);

    // At sim time 60s: ev-2 (45s) is now due
    const { dueEvents: dueAt60, updatedQueue: q60 } = pullDueEvents(q30, 60);
    expect(dueAt60.length).toBe(1);
    expect(dueAt60[0].id).toBe('ev-2');
    expect(q60.pendingEvents.length).toBe(1);
    expect(q60.processedEvents.length).toBe(2);
  });

  it('applies TRAFFIC_JAM event and updates graph edge congestion', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const event: SimEvent = {
      id: 'e-jam',
      type: 'TRAFFIC_JAM',
      timestamp: 45,
      description: 'Severe jam',
      payload: { edgeIds: ['e-dadar-parel-s'], congestion: 0.88 },
    };

    applySimEvent(event, graph, [], [], [], []);
    expect(graph.getEdge('e-dadar-parel-s')?.congestion).toBe(0.88);
  });

  it('applies ROAD_CLOSURE event and sets edge closed in graph', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const event: SimEvent = {
      id: 'e-close',
      type: 'ROAD_CLOSURE',
      timestamp: 60,
      description: 'Blocked bridge',
      payload: { edgeId: 'e-dadar-parel-s' },
    };

    applySimEvent(event, graph, [], [], [], []);
    expect(graph.getEdge('e-dadar-parel-s')?.closed).toBe(true);
  });

  it('applies HOSPITAL_FULL event and diverts hospital', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const dummyHospitals: Hospital[] = [
      {
        id: 'hosp-kem',
        name: 'KEM Hospital',
        pos: { lat: 19.0026, lng: 72.8427 },
        address: 'Parel',
        phone: '123',
        specialties: ['CARDIAC'],
        capacity: { erBeds: 5, erBedsTotal: 20, icuBeds: 2, icuBedsTotal: 10, ventilators: 1, ventilatorsTotal: 5 },
        erLoad: 0.8,
        diverted: false,
      },
    ];

    const event: SimEvent = {
      id: 'e-div',
      type: 'HOSPITAL_FULL',
      timestamp: 75,
      description: 'ER overflow',
      payload: { hospitalId: 'hosp-kem', reason: 'ICU at 100% capacity' },
    };

    const res = applySimEvent(event, graph, dummyHospitals, [], [], []);
    expect(res.hospitals[0].diverted).toBe(true);
    expect(res.hospitals[0].divertReason).toBe('ICU at 100% capacity');
  });

  it('applies PATIENT_DETERIORATES event and recalculates P1 critical triage', () => {
    const graph = new RoadNetworkGraph(defaultGraphData);
    const dummyIncidents: Incident[] = [
      {
        id: 'inc-demo-cardiac',
        title: 'Cardiac Alert',
        pos: { lat: 19.01, lng: 72.84 },
        address: 'Dadar',
        type: 'CARDIAC',
        state: 'TRANSPORTING',
        createdAt: Date.now(),
        assignedAmbulanceId: 'amb-108-02',
        patient: {
          ageBand: 'ADULT',
          complaint: 'Chest pain',
          vitals: [{ hr: 90, sbp: 120, dbp: 80, spo2: 97, rr: 16, gcs: 15, tempC: 37, ts: Date.now() }],
          priority: 'P3',
          score: 1,
          reasons: [],
          trend: 'STABLE',
          specialtyRequired: 'CARDIAC',
        },
      },
    ];

    const event: SimEvent = {
      id: 'e-det',
      type: 'PATIENT_DETERIORATES',
      timestamp: 30,
      description: 'Patient crashes',
      payload: { incidentId: 'inc-demo-cardiac' },
    };

    const res = applySimEvent(event, graph, [], [], dummyIncidents, []);
    const patient = res.incidents[0].patient;
    expect(patient?.priority).toBe('P1');
    expect(patient?.trend).toBe('DETERIORATING');
    expect(patient?.score).toBeGreaterThanOrEqual(7);
  });
});

describe('Zustand Simulation Store (Integration)', () => {
  beforeEach(() => {
    useSimStore.getState().resetSimulation();
  });

  it('runs tick advancing clock, moving active ambulance, and updating signals', () => {
    const store = useSimStore.getState();
    const initialPos = { ...store.ambulances.find((a) => a.id === store.activeAmbulanceId)!.pos };
    const initialSimSeconds = store.simSeconds;

    // Run tick for 5 seconds
    store.tick(5);

    const updated = useSimStore.getState();
    expect(updated.simSeconds).toBe(initialSimSeconds + 5);

    const activeAmb = updated.ambulances.find((a) => a.id === updated.activeAmbulanceId)!;
    // Ambulance should have advanced
    expect(activeAmb.pos.lat).not.toBe(initialPos.lat);
    expect(activeAmb.speedKmh).toBeGreaterThan(0);
  });

  it('supports speed multiplier and pause toggling in store', () => {
    const store = useSimStore.getState();
    store.setSpeed(5);
    expect(useSimStore.getState().speed).toBe(5);

    store.setIsRunning(false);
    expect(useSimStore.getState().isRunning).toBe(false);

    // Ticking while paused should not advance simSeconds
    const timeBefore = useSimStore.getState().simSeconds;
    useSimStore.getState().tick(1);
    expect(useSimStore.getState().simSeconds).toBe(timeBefore);
  });

  it('loads scenario resetting sim timer, event queue, and initial corridor route', () => {
    const store = useSimStore.getState();
    store.loadScenario('scenario-trauma-highway');

    const updated = useSimStore.getState();
    expect(updated.activeScenarioId).toBe('scenario-trauma-highway');
    expect(updated.simSeconds).toBe(0);
    expect(updated.activeAmbulanceId).toBe('amb-108-01');
    expect(updated.activeRoute).not.toBeNull();
    expect(updated.eventQueue.pendingEvents.length).toBeGreaterThan(0);
  });
});
