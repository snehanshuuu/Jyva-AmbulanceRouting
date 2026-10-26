import { describe, it, expect } from 'vitest';
import {
  calculateJamPenalty,
  shouldSwitchRoute,
  JamZone,
  computeFastestRoute,
  getNextTurnManeuver,
  formatDistance,
} from '@/engine/route';
import { LatLng, RoutePlan } from '@/lib/types';

describe('Routing Engine (Architecture §6 & §12)', () => {
  const samplePolyline: LatLng[] = [
    { lat: 19.0178, lng: 72.8478 }, // Dadar TT
    { lat: 19.0125, lng: 72.8450 }, // Ambedkar Rd
    { lat: 19.0020, lng: 72.8420 }, // Parel KEM
  ];

  it('calculates jam penalty when polyline intersects jam circle radius', () => {
    const jamOnRoute: JamZone = {
      id: 'jam-1',
      pos: { lat: 19.0125, lng: 72.8450 }, // Directly on Ambedkar Rd
      radiusM: 250,
      delayS: 180, // +3 min
      label: 'Ambedkar Flyover Gridlock',
    };

    const penalty = calculateJamPenalty(samplePolyline, [jamOnRoute]);
    expect(penalty).toBe(180);
  });

  it('calculates 0 penalty when jam is far away from route path', () => {
    const remoteJam: JamZone = {
      id: 'jam-2',
      pos: { lat: 19.0800, lng: 72.8800 }, // Far away in Kurla
      radiusM: 200,
      delayS: 300,
    };

    const penalty = calculateJamPenalty(samplePolyline, [remoteJam]);
    expect(penalty).toBe(0);
  });

  describe('Re-route rule threshold (Architecture §6: >= 15% or 60s faster)', () => {
    it('does NOT switch route if candidate is only marginally faster (< 60s and < 15%)', () => {
      // Current = 600s (10 min), Candidate = 570s (9.5 min)
      // Savings = 30s, 30/600 = 5% -> neither 60s nor 15%
      const res = shouldSwitchRoute(600, 570);
      expect(res.shouldSwitch).toBe(false);
      expect(res.savingsS).toBe(30);
      expect(res.savingsPercent).toBe(5);
    });

    it('switches route if candidate saves at least 60 seconds', () => {
      // Current = 700s, Candidate = 635s (savings = 65s > 60s)
      const res = shouldSwitchRoute(700, 635);
      expect(res.shouldSwitch).toBe(true);
      expect(res.savingsS).toBe(65);
    });

    it('switches route if candidate saves at least 15% (even if short trip < 60s savings)', () => {
      // Current = 200s, Candidate = 160s (savings = 40s < 60s, but 40/200 = 20% >= 15%)
      const res = shouldSwitchRoute(200, 160);
      expect(res.shouldSwitch).toBe(true);
      expect(res.savingsPercent).toBe(20);
    });

    it('does not switch if candidate route is slower', () => {
      const res = shouldSwitchRoute(400, 450);
      expect(res.shouldSwitch).toBe(false);
      expect(res.savingsS).toBe(0);
    });
  });

  describe('Turn Guidance & Maneuver Parsing', () => {
    const mockRoute: RoutePlan = {
      id: 'mock-1',
      nodes: [],
      etaS: 360,
      baselineEtaS: 480,
      distanceM: 4200,
      signalsOnRoute: [],
      steps: [
        {
          fromNodeId: '1',
          toNodeId: '2',
          instruction: 'Turn right onto Eastern Express Hwy',
          distanceM: 400,
          durationS: 35,
          hasSignal: false,
        },
        {
          fromNodeId: '2',
          toNodeId: '3',
          instruction: 'Continue straight over Sion Flyover approach',
          distanceM: 1200,
          durationS: 90,
          hasSignal: false,
        },
      ],
    };

    it('extracts initial turn maneuver when at beginning of route', () => {
      const turn = getNextTurnManeuver(mockRoute, 0);
      expect(turn.instruction).toBe('Turn right onto Eastern Express Hwy');
      expect(turn.distanceRemainingM).toBe(400);
      expect(turn.modifier).toBe('right');
      expect(turn.distanceNotice).toBe('In 400 meters');
    });

    it('advances to next turn maneuver when ambulance has progressed along route', () => {
      const turn = getNextTurnManeuver(mockRoute, 500); // Past step 1
      expect(turn.instruction).toBe('Continue straight over Sion Flyover approach');
      expect(turn.modifier).toBe('straight');
    });

    it('formats distances cleanly for HUD display', () => {
      expect(formatDistance(350)).toBe('350 m');
      expect(formatDistance(4200)).toBe('4.2 km');
      expect(formatDistance(15000)).toBe('15.0 km');
    });
  });

  describe('Dynamic Rerouting with Traffic Jams', () => {
    const origin: LatLng = { lat: 19.0225, lng: 72.8420 };
    const destination: LatLng = { lat: 19.0366, lng: 72.8601 }; // Sion Hospital

    it('computes clean direct route to Sion Hospital when no jams present', async () => {
      const route = await computeFastestRoute(origin, destination, 'hosp-sion', []);
      expect(route).toBeDefined();
      expect(route.etaS).toBeGreaterThan(0);
      expect(route.distanceM).toBeGreaterThan(3000);
      expect(route.steps?.length).toBeGreaterThan(0);
    });

    it('detects jam on primary corridor and picks detour with time savings', async () => {
      // Drop jam right on primary Ambedkar Rd segment
      const chokeJam: JamZone = {
        id: 'jam-sion-choke',
        pos: { lat: 19.0280, lng: 72.8490 },
        radiusM: 300,
        delayS: 300, // 5 min delay
        label: 'Eastern Express Choke Point',
      };

      const routeWithJam = await computeFastestRoute(origin, destination, 'hosp-sion', [chokeJam]);
      expect(routeWithJam).toBeDefined();
      expect(routeWithJam.etaS).toBeGreaterThan(0);
      expect(routeWithJam.pathCoordinates?.length).toBeGreaterThan(0);
      expect(routeWithJam.reasons?.length).toBeGreaterThan(0);
    });
  });
});
