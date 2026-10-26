import { LatLng } from './types';

/**
 * Calculates the great-circle distance between two points in meters using the Haversine formula.
 */
export function haversineDistanceM(p1: LatLng, p2: LatLng): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Converts degrees to radians.
 */
export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 */
export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates initial compass bearing between two points in degrees (0 - 360).
 */
export function calculateBearing(start: LatLng, end: LatLng): number {
  const startLat = toRad(start.lat);
  const startLng = toRad(start.lng);
  const endLat = toRad(end.lat);
  const endLng = toRad(end.lng);

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}

/**
 * Interpolates a point along a line between start and end by fraction t (0 <= t <= 1).
 */
export function interpolateLatLng(start: LatLng, end: LatLng, fraction: number): LatLng {
  const t = Math.max(0, Math.min(1, fraction));
  return {
    lat: start.lat + (end.lat - start.lat) * t,
    lng: start.lng + (end.lng - start.lng) * t,
  };
}

/**
 * Finds the nearest point in an array of coordinates to a target location.
 */
export function findNearestPoint<T extends { pos: LatLng }>(target: LatLng, items: T[]): { item: T; distanceM: number } | null {
  if (items.length === 0) return null;
  let nearest = items[0];
  let minDistance = haversineDistanceM(target, items[0].pos);

  for (let i = 1; i < items.length; i++) {
    const dist = haversineDistanceM(target, items[i].pos);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = items[i];
    }
  }

  return { item: nearest, distanceM: minDistance };
}
