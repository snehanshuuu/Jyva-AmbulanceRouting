import { LatLng, RoutePlan, RouteStep } from '@/lib/types';
import { calculateBearing, haversineDistanceM } from '@/lib/geo';
import cachedRoutes from '@/data/cachedRoutes.json';
import { findAStarRoute } from './routing/astar';
import { RoadNetworkGraph } from './routing/graph';
import defaultGraphData from '@/data/graph.json';

export interface JamZone {
  id: string;
  pos: LatLng;
  radiusM: number;
  delayS: number;
  label?: string;
}

export interface TurnManeuver {
  instruction: string;
  distanceRemainingM: number;
  modifier?: 'left' | 'right' | 'slight right' | 'slight left' | 'straight' | 'arrive';
  streetName?: string;
  distanceNotice: string;
}

/**
 * Checks if a route line passes within the radius of any simulated traffic jam circle.
 */
export function calculateJamPenalty(coordinates: LatLng[], jams: JamZone[] = []): number {
  if (!jams || jams.length === 0 || !coordinates || coordinates.length === 0) return 0;

  let totalPenaltyS = 0;
  for (const jam of jams) {
    // Check if any point along polyline intersects the jam radius
    const intersects = coordinates.some((coord) => haversineDistanceM(coord, jam.pos) <= jam.radiusM);
    if (intersects) {
      totalPenaltyS += jam.delayS;
    }
  }

  return totalPenaltyS;
}

interface OsrmStep {
  name: string;
  distance: number;
  duration: number;
  maneuver?: {
    type?: string;
    modifier?: string;
    instruction?: string;
    location?: [number, number];
  };
}

interface OsrmRoute {
  geometry: {
    coordinates: [number, number][]; // [lng, lat]
  };
  duration: number;
  distance: number;
  legs?: {
    steps?: OsrmStep[];
  }[];
}

/**
 * Attempts to query the public OSRM driving service with alternatives enabled.
 * Returns null if network fails, times out, or offline.
 */
async function fetchOsrmRoutes(origin: LatLng, destination: LatLng): Promise<OsrmRoute[] | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
      return data.routes as OsrmRoute[];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Formats a distance into clean meters or km string.
 */
export function formatDistance(distanceM: number): string {
  if (distanceM < 1000) {
    return `${Math.round(distanceM)} m`;
  }
  return `${(distanceM / 1000).toFixed(1)} km`;
}

/**
 * Extracts the current turn-by-turn guidance maneuver for the cockpit HUD.
 * Uses real OSRM step maneuvers when available, or derives maneuvers from geometry bends.
 */
export function getNextTurnManeuver(
  route: RoutePlan,
  distanceTravelledM: number = 0,
  currentPos?: LatLng
): TurnManeuver {
  const coords = route.pathCoordinates || [];

  // If currentPos is given and we have coordinates, calculate dynamic distance traveled along route
  let effectiveDistanceTravelledM = distanceTravelledM;
  if (currentPos && coords.length >= 2) {
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = haversineDistanceM(currentPos, coords[i]);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    let distAlong = 0;
    for (let i = 0; i < closestIdx; i++) {
      distAlong += haversineDistanceM(coords[i], coords[i + 1]);
    }
    if (closestIdx < coords.length - 1) {
      distAlong += haversineDistanceM(coords[closestIdx], currentPos);
    }
    effectiveDistanceTravelledM = Math.max(distanceTravelledM, Math.round(distAlong));
  }

  // 1. If real steps exist (e.g. from OSRM or mock route)
  if (route.steps && route.steps.length > 0) {
    let accumulatedM = 0;
    for (let i = 0; i < route.steps.length; i++) {
      const step = route.steps[i];
      accumulatedM += step.distanceM;
      if (accumulatedM > effectiveDistanceTravelledM) {
        const remainingForStep = Math.max(50, Math.round(accumulatedM - effectiveDistanceTravelledM));
        const notice = remainingForStep < 1000 
          ? `In ${remainingForStep} meters` 
          : `In ${(remainingForStep / 1000).toFixed(1)} km`;

        let modifier: TurnManeuver['modifier'] = 'straight';
        const instLower = (step.instruction || '').toLowerCase();
        const modLower = (step.modifier || '').toLowerCase();

        if (modLower.includes('slight right') || instLower.includes('slight right')) modifier = 'slight right';
        else if (modLower.includes('right') || instLower.includes('right')) modifier = 'right';
        else if (modLower.includes('slight left') || instLower.includes('slight left')) modifier = 'slight left';
        else if (modLower.includes('left') || instLower.includes('left')) modifier = 'left';
        else if (modLower.includes('arrive') || instLower.includes('arrive') || step.maneuverType === 'arrive') modifier = 'arrive';

        // Format clean instruction: "Turn right onto <road name>" or "Turn right"
        let instruction = step.instruction;
        if (step.streetName && modifier !== 'arrive' && !step.instruction.includes(step.streetName)) {
          if (modifier === 'right') instruction = `Turn right onto ${step.streetName}`;
          else if (modifier === 'left') instruction = `Turn left onto ${step.streetName}`;
          else if (modifier === 'slight right') instruction = `Bear right onto ${step.streetName}`;
          else if (modifier === 'slight left') instruction = `Bear left onto ${step.streetName}`;
          else instruction = `Continue onto ${step.streetName}`;
        } else if (!step.streetName && modifier !== 'arrive') {
          if (instruction.toLowerCase().includes('corridor')) {
            if (modifier === 'right') instruction = 'Turn right';
            else if (modifier === 'left') instruction = 'Turn left';
            else if (modifier === 'slight right') instruction = 'Bear right';
            else if (modifier === 'slight left') instruction = 'Bear left';
            else instruction = 'Continue straight';
          }
        }

        return {
          instruction,
          distanceRemainingM: remainingForStep,
          modifier,
          streetName: step.streetName,
          distanceNotice: notice,
        };
      }
    }

    // End of route
    return {
      instruction: 'Arrive at Destination Emergency Room',
      distanceRemainingM: 50,
      modifier: 'arrive',
      distanceNotice: 'In 50 meters',
    };
  }

  // 2. Geometry-derived maneuver when no steps exist (e.g. cached route)
  if (coords.length >= 2) {
    let curIdx = 0;
    if (currentPos) {
      let minDist = Infinity;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineDistanceM(currentPos, coords[i]);
        if (d < minDist) {
          minDist = d;
          curIdx = i;
        }
      }
    }

    // Look ahead for bends/turns in coordinates
    for (let j = curIdx; j < coords.length - 2; j++) {
      const b1 = calculateBearing(coords[j], coords[j + 1]);
      const b2 = calculateBearing(coords[j + 1], coords[j + 2]);
      const diff = ((b2 - b1 + 540) % 360) - 180;

      if (Math.abs(diff) >= 25) {
        let distToTurn = 0;
        if (currentPos && curIdx === j) {
          distToTurn += haversineDistanceM(currentPos, coords[j + 1]);
        } else {
          for (let k = curIdx; k <= j; k++) {
            distToTurn += haversineDistanceM(coords[k], coords[k + 1]);
          }
        }

        const remainingDistM = Math.max(50, Math.round(distToTurn));
        const notice = remainingDistM < 1000
          ? `In ${remainingDistM} meters`
          : `In ${(remainingDistM / 1000).toFixed(1)} km`;

        let modifier: TurnManeuver['modifier'] = 'straight';
        if (diff > 55) modifier = 'right';
        else if (diff >= 25) modifier = 'slight right';
        else if (diff < -55) modifier = 'left';
        else if (diff <= -25) modifier = 'slight left';

        const roadName = 'Eastern Express Hwy';

        return {
          instruction: `Turn ${modifier} onto ${roadName}`,
          distanceRemainingM: remainingDistM,
          modifier,
          streetName: roadName,
          distanceNotice: notice,
        };
      }
    }

    // Check distance to end of route
    let distToEnd = 0;
    if (currentPos) {
      distToEnd += haversineDistanceM(currentPos, coords[coords.length - 1]);
    } else {
      for (let k = curIdx; k < coords.length - 1; k++) {
        distToEnd += haversineDistanceM(coords[k], coords[k + 1]);
      }
    }

    if (distToEnd <= 150) {
      return {
        instruction: 'Arrive at Destination Emergency Room',
        distanceRemainingM: Math.max(30, Math.round(distToEnd)),
        modifier: 'arrive',
        distanceNotice: `In ${Math.max(30, Math.round(distToEnd))} meters`,
      };
    }

    const notice = distToEnd < 1000
      ? `In ${Math.round(distToEnd)} meters`
      : `In ${(distToEnd / 1000).toFixed(1)} km`;

    return {
      instruction: 'Continue straight',
      distanceRemainingM: Math.round(distToEnd),
      modifier: 'straight',
      distanceNotice: notice,
    };
  }

  // Fallback default
  return {
    instruction: 'Turn right onto Eastern Express Hwy',
    distanceRemainingM: 300,
    modifier: 'right',
    streetName: 'Eastern Express Hwy',
    distanceNotice: 'In 300 meters',
  };
}

/**
 * Computes optimal route between origin and hospital considering traffic jams.
 * Uses OSRM if available, falling back to local cached routes or graph A*.
 */
export async function computeFastestRoute(
  origin: LatLng,
  destination: LatLng,
  destinationHospitalId?: string,
  jams: JamZone[] = [],
  timeOfDayFactor: number = 1.0
): Promise<RoutePlan> {
  const isSion = destinationHospitalId === 'hosp-sion' || haversineDistanceM(destination, { lat: 19.0366, lng: 72.8601 }) < 1500;
  const isHinduja = destinationHospitalId === 'hosp-hinduja' || haversineDistanceM(destination, { lat: 19.0330, lng: 72.8398 }) < 1500;
  const isLilavati = destinationHospitalId === 'hosp-lilavati' || haversineDistanceM(destination, { lat: 19.0514, lng: 72.8290 }) < 1500;

  // 1. Try Live OSRM Query with Alternatives
  const osrmRoutes = await fetchOsrmRoutes(origin, destination);
  if (osrmRoutes && osrmRoutes.length > 0) {
    const evaluated = osrmRoutes.map((r, index) => {
      const pathCoordinates: LatLng[] = r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
      const jamPenalty = calculateJamPenalty(pathCoordinates, jams);
      const adjustedEta = Math.round(r.duration * timeOfDayFactor + jamPenalty);
      
      const steps: RouteStep[] = [];
      if (r.legs && r.legs[0]?.steps) {
        r.legs[0].steps.forEach((s, sIdx) => {
          const roadName = s.name || '';
          const mType = s.maneuver?.type || 'turn';
          const mMod = s.maneuver?.modifier || '';
          let instruction = s.maneuver?.instruction;

          if (!instruction) {
            if (mType === 'arrive') {
              instruction = 'Arrive at destination';
            } else if (mType === 'depart') {
              instruction = roadName ? `Head onto ${roadName}` : 'Depart towards destination';
            } else if (mMod) {
              instruction = roadName ? `Turn ${mMod} onto ${roadName}` : `Turn ${mMod}`;
            } else if (roadName) {
              instruction = `Continue onto ${roadName}`;
            } else {
              instruction = 'Continue straight';
            }
          }

          steps.push({
            fromNodeId: `osrm-step-${sIdx}`,
            toNodeId: `osrm-step-${sIdx + 1}`,
            instruction,
            distanceM: Math.round(s.distance),
            durationS: Math.round(s.duration),
            hasSignal: false,
            modifier: mMod,
            maneuverType: mType,
            streetName: roadName,
            location: s.maneuver?.location ? { lat: s.maneuver.location[1], lng: s.maneuver.location[0] } : undefined,
          });
        });
      }

      return {
        index,
        route: r,
        pathCoordinates,
        jamPenalty,
        adjustedEta,
        steps,
      };
    });

    // Best candidate is route with minimum adjusted ETA
    evaluated.sort((a, b) => a.adjustedEta - b.adjustedEta);
    const chosen = evaluated[0];
    const defaultRoute = evaluated.find((e) => e.index === 0) || chosen;
    const timeSavedMin = Math.max(0, Math.round((defaultRoute.adjustedEta - chosen.adjustedEta) / 60));

    const allOsrmBlocked = jams.length > 0 && evaluated.every((e) => e.jamPenalty > 0);

    // If OSRM did not provide a congestion-free detour, fall through to curated demo detour routes
    if (!allOsrmBlocked || (!isSion && !isHinduja)) {
      const reasons = [
        chosen.jamPenalty > 0
          ? `Includes +${Math.round(chosen.jamPenalty / 60)} min traffic delay`
          : 'Congestion-free corridor route',
      ];
      if (timeSavedMin > 0) {
        reasons.push(`${timeSavedMin} min saved vs default route`);
      } else if (chosen.index > 0) {
        reasons.push('Alternative route avoids primary congestion');
      }

      const alternates: RoutePlan[] = evaluated
        .filter((e) => e !== chosen)
        .map((alt) => ({
          id: `osrm-alt-${alt.index}`,
          nodes: [],
          pathCoordinates: alt.pathCoordinates,
          etaS: alt.adjustedEta,
          baselineEtaS: Math.round(alt.route.duration * 1.35),
          distanceM: Math.round(alt.route.distance),
          signalsOnRoute: [],
          steps: alt.steps,
        }));

      return {
        id: `osrm-route-${chosen.index > 0 ? 'detour' : 'direct'}-${Date.now()}`,
        nodes: [],
        pathCoordinates: chosen.pathCoordinates,
        etaS: chosen.adjustedEta,
        baselineEtaS: chosen.index > 0 ? defaultRoute.adjustedEta : Math.round(chosen.route.duration * 1.35),
        distanceM: Math.round(chosen.route.distance),
        signalsOnRoute: [],
        steps: chosen.steps,
        reasons,
        alternates: alternates.length > 0 ? alternates : undefined,
      };
    }
  }

  // 2. Fallback to High-Fidelity Cached Routes (Sion, Hinduja, KEM, Lilavati, Kasturba, Tata)
  type CachedItem = { distanceM: number; durationS: number; coordinates: LatLng[]; name: string; steps?: string[] };
  const cachedDict = cachedRoutes as Record<string, CachedItem>;

  let cacheKey: string | undefined;
  if (isSion) {
    cacheKey = 'dadar-to-sion';
  } else if (isHinduja) {
    cacheKey = 'dadar-to-hinduja';
  } else if (destinationHospitalId === 'hosp-kem' || haversineDistanceM(destination, { lat: 19.0026, lng: 72.8427 }) < 1500) {
    cacheKey = 'dadar-to-kem';
  } else if (isLilavati) {
    cacheKey = 'dadar-to-lilavati';
  } else if (destinationHospitalId === 'hosp-kasturba' || haversineDistanceM(destination, { lat: 18.9877, lng: 72.8302 }) < 1500) {
    cacheKey = 'dadar-to-kasturba';
  } else if (destinationHospitalId === 'hosp-tata' || haversineDistanceM(destination, { lat: 19.0055, lng: 72.8432 }) < 1500) {
    cacheKey = 'dadar-to-tata';
  }

  if (cacheKey && cachedDict[cacheKey]) {
    const direct = cachedDict[cacheKey];
    const detourKey = `${cacheKey}-detour`;
    const detour = cachedDict[detourKey] || direct;

    const directPenalty = calculateJamPenalty(direct.coordinates, jams);
    const detourPenalty = calculateJamPenalty(detour.coordinates, jams);

    const directEta = Math.round(direct.durationS * timeOfDayFactor + directPenalty);
    const detourEta = Math.round(detour.durationS * timeOfDayFactor + detourPenalty);

    const useDetour = detourEta < directEta;
    const chosen = useDetour ? detour : direct;
    const chosenEta = useDetour ? detourEta : directEta;
    const defaultEta = directEta;
    const timeSavedMin = Math.max(0, Math.round((defaultEta - chosenEta) / 60));

    const steps: RouteStep[] = (chosen.steps || [
      `Head toward ${chosen.name}`,
      'In 300m, keep onto primary road corridor',
      'Continue along priority corridor',
      'Arrive at destination hospital emergency bay',
    ]).map((inst, idx) => ({
      fromNodeId: `step-${idx}`,
      toNodeId: `step-${idx + 1}`,
      instruction: inst,
      distanceM: Math.round(chosen.distanceM / 4),
      durationS: Math.round(chosen.durationS / 4),
      hasSignal: false,
    }));

    const altRoutePlan: RoutePlan = {
      id: `cached-${destinationHospitalId || cacheKey}-${useDetour ? 'direct' : 'detour'}`,
      nodes: ['node-dadar', `node-${destinationHospitalId || cacheKey}`],
      pathCoordinates: (useDetour ? direct : detour).coordinates,
      etaS: useDetour ? directEta : detourEta,
      baselineEtaS: Math.round(direct.durationS * 1.35),
      distanceM: (useDetour ? direct : detour).distanceM,
      signalsOnRoute: [],
      steps: [],
    };

    return {
      id: `cached-${destinationHospitalId || cacheKey}-${useDetour ? 'detour' : 'direct'}`,
      nodes: ['node-dadar', `node-${destinationHospitalId || cacheKey}`],
      pathCoordinates: chosen.coordinates,
      etaS: chosenEta,
      baselineEtaS: useDetour ? defaultEta : Math.round(direct.durationS * 1.35),
      distanceM: chosen.distanceM,
      signalsOnRoute: [],
      steps,
      reasons: [
        useDetour ? 'Rerouted via bypass corridor' : 'Direct emergency response corridor',
        timeSavedMin > 0 ? `${timeSavedMin} min saved vs default route` : 'Fastest available path',
      ],
      alternates: [altRoutePlan],
    };
  }

  // 3. Graph A* fallback
  const graph = new RoadNetworkGraph(defaultGraphData as unknown as { nodes: []; edges: [] });
  let targetNodeId = 'node-kem-gate';
  if (isHinduja) targetNodeId = 'node-hinduja-gate';
  else if (isLilavati) targetNodeId = 'node-bandra-reclamation';
  else if (isSion) targetNodeId = 'node-sion-circle';

  if (jams.length > 0) {
    for (const jam of jams) {
      if (haversineDistanceM(jam.pos, { lat: 19.0125, lng: 72.8450 }) < jam.radiusM) {
        graph.setEdgeCongestion('e-dadar-parel-s', 0.92);
      }
    }
  }

  const startNodeId = origin.lat > 19.03 ? 'node-mahim-causeway' : 'node-dadar-tt';
  const astarRoute = findAStarRoute(graph, startNodeId, targetNodeId);

  if (astarRoute && astarRoute.pathCoordinates && astarRoute.pathCoordinates.length >= 2) {
    const jamPenaltyS = calculateJamPenalty(astarRoute.pathCoordinates, jams);
    const adjustedEtaS = Math.round(astarRoute.etaS * timeOfDayFactor + jamPenaltyS);

    return {
      ...astarRoute,
      etaS: adjustedEtaS,
      reasons: [
        `Optimal path via ${astarRoute.steps?.[0]?.instruction || 'Ambedkar corridor'}`,
        jamPenaltyS > 0 ? `Includes +${Math.round(jamPenaltyS)}s traffic congestion delay` : 'Clear corridor route',
        `Saves ${Math.max(0, Math.round((astarRoute.baselineEtaS - adjustedEtaS) / 60))} min vs unmonitored route`,
      ],
    };
  }

  // Final static fallback
  const fallbackCacheKey = isHinduja ? 'dadar-to-hinduja' : 'dadar-to-kem';
  const cached = cachedDict[fallbackCacheKey] || cachedDict['dadar-to-kem'];
  const jamPenaltyS = calculateJamPenalty(cached.coordinates, jams);
  const baselineEtaS = cached.durationS * 1.35;
  const etaS = cached.durationS * timeOfDayFactor + jamPenaltyS;

  return {
    id: `route-${Date.now()}`,
    nodes: [startNodeId, targetNodeId],
    pathCoordinates: cached.coordinates,
    etaS: Math.round(etaS),
    baselineEtaS: Math.round(baselineEtaS),
    distanceM: cached.distanceM,
    signalsOnRoute: [],
    reasons: [
      `Emergency path: ${cached.name}`,
      `Time saved: ${Math.max(0, Math.round((baselineEtaS - etaS) / 60))} min`,
    ],
  };
}

/**
 * Re-route threshold check from architecture.md §6:
 * Switch only if the new route is at least 15% or 60 s faster.
 */
export function shouldSwitchRoute(
  currentEtaS: number,
  candidateEtaS: number
): { shouldSwitch: boolean; savingsS: number; savingsPercent: number } {
  const savingsS = currentEtaS - candidateEtaS;
  const savingsPercent = (savingsS / Math.max(1, currentEtaS)) * 100;

  const shouldSwitch = savingsS >= 60 || savingsPercent >= 15;

  return {
    shouldSwitch,
    savingsS: Math.max(0, savingsS),
    savingsPercent: Math.max(0, savingsPercent),
  };
}

/**
 * Derives routing ETA in seconds for a hospital directly from the router.
 */
export function getHospitalRouteEtaSec(hospitalId: string, jams: JamZone[] = []): number {
  const cachedDict = cachedRoutes as Record<string, { durationS: number; coordinates: LatLng[] }>;
  let key: string | undefined;
  if (hospitalId === 'hosp-sion') {
    key = jams.length > 0 ? 'dadar-to-sion-detour' : 'dadar-to-sion';
  } else if (hospitalId === 'hosp-hinduja') {
    key = 'dadar-to-hinduja';
  } else if (hospitalId === 'hosp-kem') {
    key = jams.length > 0 ? 'dadar-to-kem-detour' : 'dadar-to-kem';
  } else if (hospitalId === 'hosp-lilavati') {
    key = 'dadar-to-lilavati';
  } else if (hospitalId === 'hosp-kasturba') {
    key = 'dadar-to-kasturba';
  } else if (hospitalId === 'hosp-tata') {
    key = 'dadar-to-tata';
  }

  if (key && cachedDict[key]) {
    const penalty = calculateJamPenalty(cachedDict[key].coordinates, jams);
    return cachedDict[key].durationS + penalty;
  }
  return 360;
}
