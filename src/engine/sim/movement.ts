import { Ambulance, LatLng, RoutePlan } from '@/lib/types';
import { calculateBearing, haversineDistanceM, interpolateLatLng } from '@/lib/geo';
import { AMB_FACTOR } from '../routing/cost';

export interface MovementResult {
  updatedAmbulance: Ambulance;
  nextStepIndex: number;
  isArrived: boolean;
  distanceCoveredM: number;
}

/**
 * Pure function that advances an ambulance along its planned route polyline.
 * Calculates velocity based on road properties and congestion, updates position and heading.
 */
export function advanceAmbulanceAlongRoute(
  ambulance: Ambulance,
  route: RoutePlan | null,
  currentStepIndex: number,
  deltaSeconds: number,
  edgeCongestion: number = 0.3
): MovementResult {
  const coords = route?.pathCoordinates || [];

  if (!route || coords.length < 2 || currentStepIndex >= coords.length - 1) {
    const lastCoord = coords[coords.length - 1] || ambulance.pos;
    return {
      updatedAmbulance: {
        ...ambulance,
        pos: lastCoord,
        speedKmh: 0,
        status: ambulance.status === 'TRANSPORTING' ? 'ARRIVED' : ambulance.status,
      },
      nextStepIndex: Math.max(0, coords.length - 1),
      isArrived: true,
      distanceCoveredM: 0,
    };
  }

  const targetCoord = coords[currentStepIndex + 1];
  const currentPos = ambulance.pos;
  const remainingDistM = haversineDistanceM(currentPos, targetCoord);

  // Compute effective speed: 50 km/h nominal * trafficFactor * AMB_FACTOR (1.2)
  const trafficFactor = Math.max(0.1, 1 - edgeCongestion);
  const baseSpeedKmh = 50;
  const effectiveSpeedKmh = Math.round(baseSpeedKmh * trafficFactor * AMB_FACTOR);
  const speedMs = (effectiveSpeedKmh * 1000) / 3600;
  const moveDistM = speedMs * deltaSeconds;

  const heading = calculateBearing(currentPos, targetCoord);

  if (moveDistM >= remainingDistM || remainingDistM < 8) {
    // Reached or overshot the waypoint
    const nextIndex = currentStepIndex + 1;
    const isArrived = nextIndex >= coords.length - 1;

    return {
      updatedAmbulance: {
        ...ambulance,
        pos: targetCoord,
        heading,
        speedKmh: isArrived ? 0 : effectiveSpeedKmh,
        status: isArrived && ambulance.status === 'TRANSPORTING' ? 'ARRIVED' : ambulance.status,
      },
      nextStepIndex: nextIndex,
      isArrived,
      distanceCoveredM: remainingDistM,
    };
  }

  // Interpolate along current leg
  const fraction = moveDistM / remainingDistM;
  const newPos: LatLng = interpolateLatLng(currentPos, targetCoord, fraction);

  return {
    updatedAmbulance: {
      ...ambulance,
      pos: newPos,
      heading,
      speedKmh: effectiveSpeedKmh,
    },
    nextStepIndex: currentStepIndex,
    isArrived: false,
    distanceCoveredM: moveDistM,
  };
}
