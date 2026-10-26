'use client';
 
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  GeoJSONSource,
  StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useJyvaStore } from '@/store/useJyvaStore';
import { RoutePlan, LatLng } from '@/lib/types';
import { JamZone } from '@/engine/route';
import { haversineDistanceM } from '@/lib/geo';
import { Compass, Crosshair, Maximize2, AlertTriangle } from 'lucide-react';

export type NavMapMode = 'navigation' | 'overview';

export interface NavMapProps {
  mode?: NavMapMode;
  center?: [number, number]; // [lng, lat] or [lat, lng]
  zoom?: number;
  route?: RoutePlan | null;
  alternativeRoute?: RoutePlan | null;
  destinationHospitalId?: string;
  onlyActiveAmbulance?: boolean;
  showRoute?: boolean;
  showJams?: boolean;
  showSpeedHud?: boolean;
  showHospitals?: boolean;
  showAmbulances?: boolean;
  onSelectHospital?: (id: string) => void;
  onSelectAmbulance?: (id: string) => void;
  className?: string;
}

// Fallback OpenStreetMap Raster Style Specification (if vector tiles fail or timeout)
const OSM_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-raster-layer',
      type: 'raster',
      source: 'osm-raster',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

/**
 * Linearly interpolates dense points along a route to ensure smooth ~150-250m segmentation
 */
function interpolateRoute(coordinates: LatLng[], stepM = 150): LatLng[] {
  if (!coordinates || coordinates.length < 2) return coordinates || [];
  const result: LatLng[] = [coordinates[0]];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const dist = haversineDistanceM(p1, p2);
    if (dist > stepM) {
      const numSteps = Math.floor(dist / stepM);
      for (let s = 1; s <= numSteps; s++) {
        const frac = s / (numSteps + 1);
        result.push({
          lat: p1.lat + (p2.lat - p1.lat) * frac,
          lng: p1.lng + (p2.lng - p1.lng) * frac,
        });
      }
    }
    result.push(p2);
  }
  return result;
}

/**
 * Splits route coordinates into ~150-250m sequential segments and applies simulated traffic coloring.
 * Green = free flow, Orange = slow, Red = heavy (jam zone).
 * Already travelled segments are marked with faded grey.
 * Coordinates are formatted strictly as [lng, lat] for GeoJSON.
 */
function buildTrafficSegmentsGeoJson(
  rawCoordinates: LatLng[],
  jams: JamZone[] = [],
  currentPos?: LatLng
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  if (!rawCoordinates || rawCoordinates.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const coordinates = interpolateRoute(rawCoordinates, 150);

  // Find closest waypoint index to currentPos to mark traversed portion
  let closestIndex = 0;
  if (currentPos) {
    let minDist = Infinity;
    for (let i = 0; i < coordinates.length; i++) {
      const d = haversineDistanceM(currentPos, coordinates[i]);
      if (d < minDist) {
        minDist = d;
        closestIndex = i;
      }
    }
  }

  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  const TARGET_SEGMENT_M = 200;

  let currentChunk: [number, number][] = [[coordinates[0].lng, coordinates[0].lat]];
  let currentChunkDistM = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const legDist = haversineDistanceM(p1, p2);

    currentChunk.push([p2.lng, p2.lat]);
    currentChunkDistM += legDist;

    // When chunk reaches target distance or at last point, emit feature
    if (currentChunkDistM >= TARGET_SEGMENT_M || i === coordinates.length - 2) {
      const midPointIdx = Math.floor(currentChunk.length / 2);
      const [midLng, midLat] = currentChunk[midPointIdx];
      const midPos: LatLng = { lat: midLat, lng: midLng };

      // Traveled if before current position
      const isTraveled = currentPos ? i < closestIndex : false;

      // Check if inside any traffic jam zone
      const inJam = jams.some((jam) => haversineDistanceM(midPos, jam.pos) <= (jam.radiusM || 450) + 120);

      // Seeded traffic computation for realistic demo variation
      const seed = Math.sin(midLat * 1000 + midLng * 1000 + features.length * 5.3);
      const randVal = Math.abs(seed - Math.floor(seed));

      let traffic: 'clear' | 'slow' | 'heavy' | 'traveled' = 'clear';
      let fillColor = '#10b981'; // Green: free flow
      let casingColor = '#065f46'; // Dark green casing

      if (isTraveled) {
        traffic = 'traveled';
        fillColor = '#94a3b8'; // Faded grey
        casingColor = '#64748b'; // Darker grey casing
      } else if (inJam) {
        traffic = 'heavy';
        fillColor = '#ef4444'; // Red: heavy traffic jam
        casingColor = '#991b1b'; // Dark red casing
      } else if (randVal > 0.78) {
        traffic = 'slow';
        fillColor = '#f59e0b'; // Orange: slow traffic
        casingColor = '#b45309'; // Dark orange casing
      }

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [...currentChunk],
        },
        properties: {
          traffic,
          fillColor,
          casingColor,
          isTraveled,
        },
      });

      // Start next chunk starting at the end of this chunk
      currentChunk = [[p2.lng, p2.lat]];
      currentChunkDistM = 0;
    }
  }

  return { type: 'FeatureCollection', features };
}

export function NavMap({
  mode = 'navigation',
  center,
  zoom,
  route: propRoute,
  alternativeRoute: propAltRoute,
  destinationHospitalId,
  showRoute = true,
  showJams = true,
  showSpeedHud = true,
  showHospitals = true,
  showAmbulances = true,
  onSelectHospital,
  className = '',
}: NavMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const maplibreglRef = useRef<typeof import('maplibre-gl') | null>(null);

  // Markers stored in refs to survive style transitions
  const ambulanceMarkerRef = useRef<MapLibreMarker | null>(null);
  const hospitalMarkersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const jamBadgeMarkersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const savedBadgeMarkerRef = useRef<MapLibreMarker | null>(null);

  // Camera state
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const isFollowingRef = useRef<boolean>(true);

  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  const [isOverviewMode, setIsOverviewMode] = useState<boolean>(false);
  const [usingBackupMap, setUsingBackupMap] = useState<boolean>(false);

  // Watchdog ref for 5s tile load failure fallback
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFallenBackRef = useRef<boolean>(false);
  const tilesLoadedRef = useRef<boolean>(false);

  // Store bindings
  const storeHospitals = useJyvaStore((s) => s.hospitals);
  const storeAmbulances = useJyvaStore((s) => s.ambulances);
  const storeRoute = useJyvaStore((s) => s.activeRoute);
  const storeJams = useJyvaStore((s) => s.jams);
  const activeAmbulanceId = useJyvaStore((s) => s.activeAmbulanceId);
  const activeTrip = useJyvaStore((s) => s.activeTrip);
  const incomingTrips = useJyvaStore((s) => s.incomingTrips);
  const timeSavedS = useJyvaStore((s) => s.timeSavedS);

  const hospitals = storeHospitals;
  const ambulances = storeAmbulances;
  const activeRoute = propRoute !== undefined ? propRoute : storeRoute;
  const jams = storeJams;
  const targetHospitalId = destinationHospitalId || activeTrip?.destinationHospitalId || 'hosp-sion';

  const activeAmbulance = ambulances.find((a) => a.id === activeAmbulanceId) || ambulances[0];
  const targetHospital = hospitals.find((h) => h.id === targetHospitalId) || hospitals[0];

  // Derive alternative route if available (either from props or route.alternates)
  const altRoute = useMemo(() => {
    if (propAltRoute) return propAltRoute;
    if (activeRoute?.alternates && activeRoute.alternates[0]) return activeRoute.alternates[0];
    return null;
  }, [propAltRoute, activeRoute]);

  // Data references kept current so layers can access latest data at any instant
  const routeGeoJsonRef = useRef<GeoJSON.FeatureCollection<GeoJSON.LineString>>({
    type: 'FeatureCollection',
    features: [],
  });
  const altRouteGeoJsonRef = useRef<GeoJSON.FeatureCollection<GeoJSON.LineString>>({
    type: 'FeatureCollection',
    features: [],
  });
  const jamsGeoJsonRef = useRef<GeoJSON.FeatureCollection<GeoJSON.Polygon>>({
    type: 'FeatureCollection',
    features: [],
  });
  const inboundGeoJsonRef = useRef<GeoJSON.FeatureCollection<GeoJSON.LineString>>({
    type: 'FeatureCollection',
    features: [],
  });

  // 1. Primary Route GeoJSON
  const currentRouteGeoJson = useMemo(() => {
    if (showRoute && activeRoute?.pathCoordinates && activeRoute.pathCoordinates.length >= 2) {
      return buildTrafficSegmentsGeoJson(
        activeRoute.pathCoordinates,
        showJams ? jams : [],
        mode === 'navigation' ? activeAmbulance?.pos : undefined
      );
    }
    return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
  }, [showRoute, activeRoute, showJams, jams, mode, activeAmbulance?.pos]);

  // 2. Alternative Route GeoJSON (Thin grey line)
  const currentAltRouteGeoJson = useMemo(() => {
    if (showRoute && altRoute?.pathCoordinates && altRoute.pathCoordinates.length >= 2) {
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: altRoute.pathCoordinates.map((c) => [c.lng, c.lat]),
            },
            properties: {},
          },
        ],
      } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
    }
    return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
  }, [showRoute, altRoute]);

  // 3. Jams Polygon GeoJSON
  const currentJamsGeoJson = useMemo(() => {
    if (showJams && jams.length > 0) {
      const features: GeoJSON.Feature<GeoJSON.Polygon>[] = jams.map((jam) => {
        const points = 32;
        const radiusKm = (jam.radiusM || 450) / 1000;
        const coords: [number, number][] = [];
        const distanceX = radiusKm / (111.32 * Math.cos((jam.pos.lat * Math.PI) / 180));
        const distanceY = radiusKm / 110.574;

        for (let i = 0; i < points; i++) {
          const theta = (i / points) * (2 * Math.PI);
          const x = distanceX * Math.cos(theta);
          const y = distanceY * Math.sin(theta);
          coords.push([jam.pos.lng + x, jam.pos.lat + y]);
        }
        coords.push(coords[0]);

        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coords],
          },
          properties: {},
        };
      });
      return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection<GeoJSON.Polygon>;
    }
    return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection<GeoJSON.Polygon>;
  }, [showJams, jams]);

  // 4. Inbound Dashed Vector GeoJSON (Overview Mode)
  const currentInboundGeoJson = useMemo(() => {
    if (mode === 'overview' && targetHospital) {
      const hospitalIncoming = incomingTrips.filter(
        (t) => t.destinationHospitalId === targetHospital.id && t.status !== 'ARRIVED'
      );
      const inboundAmbMap = new Map(hospitalIncoming.map((t) => [t.ambulanceId, t]));
      const inboundAmbs = ambulances.filter((a) => inboundAmbMap.has(a.id));

      const features: GeoJSON.Feature<GeoJSON.LineString>[] = inboundAmbs.map((amb) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [amb.pos.lng, amb.pos.lat],
            [targetHospital.pos.lng, targetHospital.pos.lat],
          ],
        },
        properties: {
          color: inboundAmbMap.get(amb.id)?.priority === 'CRITICAL' ? '#ef4444' : '#0f766e',
        },
      }));
      return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
    }
    return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection<GeoJSON.LineString>;
  }, [mode, targetHospital, incomingTrips, ambulances]);

  // Keep refs in sync inside effect (avoids accessing refs during render)
  useEffect(() => {
    routeGeoJsonRef.current = currentRouteGeoJson;
    altRouteGeoJsonRef.current = currentAltRouteGeoJson;
    jamsGeoJsonRef.current = currentJamsGeoJson;
    inboundGeoJsonRef.current = currentInboundGeoJson;
  }, [currentRouteGeoJson, currentAltRouteGeoJson, currentJamsGeoJson, currentInboundGeoJson]);

  // Synchronize Markers (ambulance, hospitals, jam icons)
  const syncMarkers = useCallback(
    (map: MapLibreMap) => {
      const Marker = maplibreglRef.current?.Marker;
      if (!Marker) return;

      // A. Ambulance Marker: plain navigation arrow rotated to heading, no glow
      if (showAmbulances && activeAmbulance) {
        let ambMarker = ambulanceMarkerRef.current;
        if (!ambMarker) {
          const el = document.createElement('div');
          el.className = 'jyva-google-nav-arrow';
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#0284c7" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
              <polygon points="12 2 21 21 12 16.5 3 21 12 2" />
            </svg>
          `;
          ambMarker = new Marker({ element: el, rotationAlignment: 'map' })
            .setLngLat([activeAmbulance.pos.lng, activeAmbulance.pos.lat])
            .setRotation(activeAmbulance.heading || 0)
            .addTo(map);
          ambulanceMarkerRef.current = ambMarker;
        } else {
          ambMarker.remove();
          ambMarker.addTo(map);
          ambMarker.setLngLat([activeAmbulance.pos.lng, activeAmbulance.pos.lat]);
          ambMarker.setRotation(activeAmbulance.heading || 0);
        }
      }

      // B. Hospital Pins
      if (showHospitals) {
        const visibleHospitals = mode === 'overview'
          ? hospitals.filter((h) => h.id === targetHospitalId)
          : hospitals;

        const currentHospIds = new Set(visibleHospitals.map((h) => h.id));
        hospitalMarkersRef.current.forEach((m, id) => {
          if (!currentHospIds.has(id)) {
            m.remove();
            hospitalMarkersRef.current.delete(id);
          }
        });

        visibleHospitals.forEach((hosp) => {
          const isTarget = hosp.id === targetHospitalId;
          let marker = hospitalMarkersRef.current.get(hosp.id);
          if (marker) marker.remove();

          const el = document.createElement('div');
          el.style.cursor = 'pointer';

          if (isTarget) {
            // Target Hospital Pin: Prominent Google Maps style pin
            el.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; transform: translate(0, -100%);">
                <div style="
                  background: #0f5146;
                  color: #ffffff;
                  font-size: 11px;
                  font-weight: 800;
                  padding: 3px 8px;
                  border-radius: 9999px;
                  box-shadow: 0 4px 14px rgba(15,81,70,0.3);
                  border: 2px solid #ffffff;
                  margin-bottom: 2px;
                  white-space: nowrap;
                  display: flex;
                  align-items: center;
                  gap: 4px;
                ">
                  <span style="width: 6px; height: 6px; border-radius: 9999px; background: #64f9bc;"></span>
                  <span>${hosp.shortName || hosp.name}</span>
                </div>
                <div style="
                  width: 32px;
                  height: 32px;
                  border-radius: 9999px;
                  background: #0f5146;
                  border: 2.5px solid #ffffff;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64f9bc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              </div>
            `;
            marker = new Marker({ element: el, anchor: 'bottom' })
              .setLngLat([hosp.pos.lng, hosp.pos.lat])
              .addTo(map);
          } else {
            // Candidate Hospital Pin: Small subtle medical pin
            el.innerHTML = `
              <div style="
                width: 24px;
                height: 24px;
                border-radius: 9999px;
                background: #ffffff;
                border: 1.5px solid #64748b;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
              " title="${hosp.name}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0f5146" stroke-width="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            `;
            marker = new Marker({ element: el, anchor: 'center' })
              .setLngLat([hosp.pos.lng, hosp.pos.lat])
              .addTo(map);
          }

          el.onclick = () => onSelectHospital?.(hosp.id);
          hospitalMarkersRef.current.set(hosp.id, marker);
        });
      }

      // C. Jam Delay Badges & Icons
      if (showJams && jams.length > 0) {
        const activeJamIds = new Set(jams.map((j) => j.id));
        jamBadgeMarkersRef.current.forEach((m, id) => {
          if (!activeJamIds.has(id)) {
            m.remove();
            jamBadgeMarkersRef.current.delete(id);
          }
        });

        jams.forEach((jam) => {
          let marker = jamBadgeMarkersRef.current.get(jam.id);
          if (marker) marker.remove();

          const el = document.createElement('div');
          el.innerHTML = `
            <div style="
              background: #b91c1c;
              color: #ffffff;
              font-size: 10px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 9999px;
              border: 1.5px solid #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 3px;
            ">
              <span>⚠️</span>
              <span>+${Math.round(jam.delayS / 60)}m Bottleneck</span>
            </div>
          `;
          marker = new Marker({ element: el }).setLngLat([jam.pos.lng, jam.pos.lat]).addTo(map);
          jamBadgeMarkersRef.current.set(jam.id, marker);
        });
      } else {
        jamBadgeMarkersRef.current.forEach((m) => m.remove());
        jamBadgeMarkersRef.current.clear();
      }

      // D. Alternative route saved time badge
      if (altRoute && timeSavedS > 60 && activeRoute?.pathCoordinates && activeRoute.pathCoordinates.length > 5) {
        const badgeIdx = Math.min(6, Math.floor(activeRoute.pathCoordinates.length / 3));
        const badgePos = activeRoute.pathCoordinates[badgeIdx];
        const minutesSaved = Math.max(1, Math.round(timeSavedS / 60));

        if (!savedBadgeMarkerRef.current) {
          const el = document.createElement('div');
          el.className = 'jyva-time-saved-badge';
          el.innerHTML = `
            <div style="
              background: #10b981;
              color: #ffffff;
              font-size: 11px;
              font-weight: 800;
              padding: 3px 9px;
              border-radius: 9999px;
              border: 2px solid #ffffff;
              box-shadow: 0 4px 12px rgba(16,185,129,0.35);
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
              pointer-events: none;
            ">
              <span>⚡</span>
              <span>${minutesSaved} min saved</span>
            </div>
          `;
          savedBadgeMarkerRef.current = new Marker({ element: el })
            .setLngLat([badgePos.lng, badgePos.lat])
            .addTo(map);
        } else {
          savedBadgeMarkerRef.current.remove();
          savedBadgeMarkerRef.current.addTo(map);
          savedBadgeMarkerRef.current.setLngLat([badgePos.lng, badgePos.lat]);
        }
      } else {
        if (savedBadgeMarkerRef.current) {
          savedBadgeMarkerRef.current.remove();
          savedBadgeMarkerRef.current = null;
        }
      }
    },
    [showAmbulances, activeAmbulance, showHospitals, mode, hospitals, targetHospitalId, onSelectHospital, showJams, jams, altRoute, timeSavedS, activeRoute]
  );

  /**
   * Adds all custom sources and layers in one unified function.
   * Runs on the first 'load' and on EVERY 'style.load'.
   */
  const addMapLayers = useCallback(
    (map: MapLibreMap) => {
      if (!map.isStyleLoaded()) return;

      console.log('[NavMap] addMapLayers executing. Active style:', usingBackupMap ? 'OpenStreetMap Fallback (Raster)' : 'Bright Vector (OpenFreeMap)');

      // 1. Alternative Route Source & Layers (Thin dashed grey line)
      if (!map.getSource('alt-route-source')) {
        map.addSource('alt-route-source', {
          type: 'geojson',
          data: altRouteGeoJsonRef.current,
        });
      }
      if (!map.getLayer('alt-route-casing')) {
        map.addLayer({
          id: 'alt-route-casing',
          type: 'line',
          source: 'alt-route-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 6, 18, 9],
            'line-color': '#64748b',
            'line-opacity': 0.75,
          },
        });
      }
      if (!map.getLayer('alt-route-fill')) {
        map.addLayer({
          id: 'alt-route-fill',
          type: 'line',
          source: 'alt-route-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 14, 4, 18, 6.5],
            'line-color': '#94a3b8',
            'line-dasharray': [2, 2],
          },
        });
      }

      // 2. Primary Route Source & Layers (Thick route line with dark casing + traffic colors + traveled grey)
      if (!map.getSource('route-source')) {
        map.addSource('route-source', {
          type: 'geojson',
          data: routeGeoJsonRef.current,
        });
      }
      if (!map.getLayer('route-casing')) {
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 12, 18, 17],
            'line-color': ['coalesce', ['get', 'casingColor'], '#166534'],
            'line-opacity': 0.95,
          },
        });
      }
      if (!map.getLayer('route-fill')) {
        map.addLayer({
          id: 'route-fill',
          type: 'line',
          source: 'route-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 8, 18, 12],
            'line-color': ['coalesce', ['get', 'fillColor'], '#22c55e'],
            'line-opacity': 1.0,
          },
        });
      }

      // 3. Traffic Jam Polygon Hazard Layer
      if (!map.getSource('jams-polygon-source')) {
        map.addSource('jams-polygon-source', {
          type: 'geojson',
          data: jamsGeoJsonRef.current,
        });
      }
      if (!map.getLayer('jams-fill')) {
        map.addLayer({
          id: 'jams-fill',
          type: 'fill',
          source: 'jams-polygon-source',
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.28,
          },
        });
      }
      if (!map.getLayer('jams-line')) {
        map.addLayer({
          id: 'jams-line',
          type: 'line',
          source: 'jams-polygon-source',
          paint: {
            'line-width': 2.5,
            'line-color': '#b91c1c',
            'line-dasharray': [3, 2],
          },
        });
      }

      // 4. Inbound Dashed Vector (Overview Mode)
      if (!map.getSource('inbound-dashed-source')) {
        map.addSource('inbound-dashed-source', {
          type: 'geojson',
          data: inboundGeoJsonRef.current,
        });
      }
      if (!map.getLayer('inbound-dashed-line')) {
        map.addLayer({
          id: 'inbound-dashed-line',
          type: 'line',
          source: 'inbound-dashed-source',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': 3,
            'line-color': ['coalesce', ['get', 'color'], '#0f766e'],
            'line-dasharray': [2, 3],
            'line-opacity': 0.85,
          },
        });
      }

      // Update data on existing sources immediately
      const routeSource = map.getSource('route-source') as GeoJSONSource | undefined;
      if (routeSource) routeSource.setData(routeGeoJsonRef.current);

      const altSource = map.getSource('alt-route-source') as GeoJSONSource | undefined;
      if (altSource) altSource.setData(altRouteGeoJsonRef.current);

      const jamsSource = map.getSource('jams-polygon-source') as GeoJSONSource | undefined;
      if (jamsSource) jamsSource.setData(jamsGeoJsonRef.current);

      const inboundSource = map.getSource('inbound-dashed-source') as GeoJSONSource | undefined;
      if (inboundSource) inboundSource.setData(inboundGeoJsonRef.current);

      // Re-attach all markers so they cleanly exist on the current map canvas
      syncMarkers(map);
    },
    [syncMarkers, usingBackupMap]
  );

  // Helper to safely trigger the OSM fallback style
  const triggerFallback = useCallback((reason: string) => {
    if (hasFallenBackRef.current) return;
    hasFallenBackRef.current = true;
    console.warn(`[NavMap] Switching to OSM raster backup map. Reason: ${reason}`);
    setUsingBackupMap(true);

    const map = mapInstanceRef.current;
    if (map) {
      try {
        // In fallback mode, disable map rotation (bearing 0) so labels stay upright
        map.setBearing(0);
        map.setPitch(0);
        if (map.dragRotate) map.dragRotate.disable();
        if (map.touchZoomRotate) map.touchZoomRotate.disableRotation();
        map.setStyle(OSM_FALLBACK_STYLE);
      } catch (err) {
        console.error('[NavMap] Failed to set OSM raster style:', err);
      }
    }
  }, []);

  // 1. Initialize MapLibre GL instance & event logging
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let resizeTimer: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    // Helper to log canvas and map state
    const logDiagnostics = (map: MapLibreMap, label: string) => {
      const canvas = map.getCanvas();
      console.log(`=== [NavMap Diagnostic: ${label}] ===`);
      console.log('Canvas Dimensions:', canvas ? {
        width: canvas.width,
        height: canvas.height,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
      } : 'No canvas');
      console.log('Map Center:', map.getCenter());
      console.log('Map Zoom:', map.getZoom());
      console.log('Map Loaded:', map.loaded());
      console.log('Active Style:', hasFallenBackRef.current ? 'OpenStreetMap Fallback (Raster)' : 'Bright Vector (OpenFreeMap)');
      console.log('Container Dimensions:', {
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight,
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight,
      });
      console.log('First Route Coord:', activeRoute?.pathCoordinates?.[0]);
      console.log('Ambulance Pos:', activeAmbulance?.pos);
      console.log('Hospitals:', hospitals.map((h) => ({ id: h.id, name: h.name, pos: h.pos })));
      console.log('====================================');
    };

    const triggerResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isUnmounted) return;
        const map = mapInstanceRef.current;
        if (map) {
          map.resize();
        } else if (container.clientWidth > 0 && container.clientHeight > 0) {
          initMap();
        }
      }, 50);
    };

    const initMap = async () => {
      if (mapInstanceRef.current || isUnmounted || !container) return;
      if (container.clientWidth <= 0 || container.clientHeight <= 0) {
        console.warn('[NavMap] Container has zero size, deferring map creation until sized:', {
          w: container.clientWidth,
          h: container.clientHeight,
        });
        return;
      }

      // Requirement 3 & 4: Load MapLibre only on the client inside the effect and set worker URL
      const maplibregl = await import('maplibre-gl');
      if (isUnmounted || mapInstanceRef.current) return;

      if (typeof maplibregl.setWorkerUrl === 'function') {
        maplibregl.setWorkerUrl('/maplibre-gl-csp-worker.js');
      }
      if ('workerUrl' in maplibregl) {
        (maplibregl as { workerUrl?: string }).workerUrl = '/maplibre-gl-csp-worker.js';
      }
      maplibreglRef.current = maplibregl;

      let initialLng = activeAmbulance?.pos?.lng || targetHospital?.pos?.lng || 72.8450;
      let initialLat = activeAmbulance?.pos?.lat || targetHospital?.pos?.lat || 19.0250;

      if (center) {
        if (center[0] > 60) {
          initialLng = center[0];
          initialLat = center[1];
        } else {
          initialLat = center[0];
          initialLng = center[1];
        }
      }

      console.log('[NavMap] Instantiating MapLibreMap on container size:', container.clientWidth, 'x', container.clientHeight);

      const map = new maplibregl.Map({
        container,
        style: OPENFREEMAP_STYLE,
        center: [initialLng, initialLat],
        zoom: mode === 'navigation' ? 15.8 : (zoom || 13),
        bearing: mode === 'navigation' ? (activeAmbulance?.heading || 0) : 0,
        pitch: mode === 'navigation' ? 30 : 0,
        attributionControl: {
          compact: true,
        },
      });

      mapInstanceRef.current = map;

      // Event handlers
      map.on('error', (e) => {
        console.error('[MapLibre error]', e);
        if (!tilesLoadedRef.current && !hasFallenBackRef.current) {
          triggerFallback(`MapLibre error on vector style: ${e.error?.message || 'unknown'}`);
        }
      });

      map.on('styledata', (e) => {
        console.log('[MapLibre styledata]', e.dataType);
        if (map.isStyleLoaded()) {
          addMapLayers(map);
        }
      });

      map.on('sourcedata', (e) => {
        console.log('[MapLibre sourcedata]', e.sourceId, 'isLoaded:', e.isSourceLoaded, 'dataType:', e.dataType);
        if (e.sourceId === 'openmaptiles' && e.isSourceLoaded) {
          tilesLoadedRef.current = true;
        }
      });

      map.on('idle', () => {
        console.log('[MapLibre idle] Map is idle');
        tilesLoadedRef.current = true;
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        logDiagnostics(map, 'idle');
      });

      // Pause follow on user interaction
      const pauseFollow = () => {
        if (mode === 'navigation' && isFollowingRef.current) {
          setIsFollowing(false);
        }
      };

      map.on('dragstart', pauseFollow);
      map.on('rotatestart', pauseFollow);
      map.on('pitchstart', pauseFollow);

      // Add layers on first load and start 5s watchdog
      map.on('load', () => {
        logDiagnostics(map, 'load');
        addMapLayers(map);
        map.resize();

        // 5-second watchdog from the 'load' event
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
        }
        fallbackTimeoutRef.current = setTimeout(() => {
          if (!tilesLoadedRef.current && !hasFallenBackRef.current) {
            console.warn('[NavMap] Vector tiles not loaded within 5 seconds of load event. Triggering fallback.');
            triggerFallback('Vector tiles timed out (>5 seconds after load event)');
          }
        }, 5000);
      });

      // Re-add layers on EVERY style.load
      map.on('style.load', () => {
        logDiagnostics(map, 'style.load');
        addMapLayers(map);
        map.resize();
      });

      logDiagnostics(map, 'mount-init');
    };

    // Initialize if container already has positive dimensions
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      initMap();
    }

    // Call map.resize() once after mount
    const postMountTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      } else if (container.clientWidth > 0 && container.clientHeight > 0) {
        initMap();
      }
    }, 100);

    // Debounced ResizeObserver
    const ro = new ResizeObserver(() => {
      triggerResize();
    });
    ro.observe(container);

    const onWindowResize = () => triggerResize();
    window.addEventListener('resize', onWindowResize);

    const hospMarkers = hospitalMarkersRef.current;
    const jamMarkers = jamBadgeMarkersRef.current;

    return () => {
      isUnmounted = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      if (postMountTimer) clearTimeout(postMountTimer);
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      ro.disconnect();
      window.removeEventListener('resize', onWindowResize);
      if (ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current.remove();
        ambulanceMarkerRef.current = null;
      }
      hospMarkers.forEach((m) => m.remove());
      hospMarkers.clear();
      jamMarkers.forEach((m) => m.remove());
      jamMarkers.clear();
      if (savedBadgeMarkerRef.current) {
        savedBadgeMarkerRef.current.remove();
        savedBadgeMarkerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. React effect to synchronize layers & sources whenever GeoJSON changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const routeSource = map.getSource('route-source') as GeoJSONSource | undefined;
    if (routeSource) {
      routeSource.setData(currentRouteGeoJson);
    } else {
      addMapLayers(map);
      return;
    }

    const altSource = map.getSource('alt-route-source') as GeoJSONSource | undefined;
    if (altSource) altSource.setData(currentAltRouteGeoJson);

    const jamsSource = map.getSource('jams-polygon-source') as GeoJSONSource | undefined;
    if (jamsSource) jamsSource.setData(currentJamsGeoJson);

    const inboundSource = map.getSource('inbound-dashed-source') as GeoJSONSource | undefined;
    if (inboundSource) inboundSource.setData(currentInboundGeoJson);

    syncMarkers(map);
  }, [
    currentRouteGeoJson,
    currentAltRouteGeoJson,
    currentJamsGeoJson,
    currentInboundGeoJson,
    addMapLayers,
    syncMarkers,
  ]);

  // 3. Camera follow mode easing on position/heading updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mode !== 'navigation') return;

    if (activeAmbulance && isFollowingRef.current && !isOverviewMode) {
      map.easeTo({
        center: [activeAmbulance.pos.lng, activeAmbulance.pos.lat],
        zoom: 15.8,
        bearing: usingBackupMap ? 0 : (activeAmbulance.heading || 0),
        pitch: usingBackupMap ? 0 : 30,
        duration: 800,
        easing: (t) => t,
      });
    }
  }, [activeAmbulance, mode, isOverviewMode, usingBackupMap]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeAmbulance) return;
    setIsFollowing(true);
    setIsOverviewMode(false);
    map.easeTo({
      center: [activeAmbulance.pos.lng, activeAmbulance.pos.lat],
      zoom: 15.8,
      bearing: usingBackupMap ? 0 : (activeAmbulance.heading || 0),
      pitch: usingBackupMap ? 0 : 30,
      duration: 800,
    });
  }, [activeAmbulance, usingBackupMap]);

  // Route Overview handler: fits the whole route and hospital pins
  const handleToggleOverview = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isOverviewMode && activeRoute?.pathCoordinates && activeRoute.pathCoordinates.length >= 2) {
      const BoundsConstructor = maplibreglRef.current?.LngLatBounds;
      if (!BoundsConstructor) return;
      setIsOverviewMode(true);
      setIsFollowing(false);
      const bounds = new BoundsConstructor();
      activeRoute.pathCoordinates.forEach((c) => bounds.extend([c.lng, c.lat]));
      hospitals.forEach((h) => bounds.extend([h.pos.lng, h.pos.lat]));
      if (activeAmbulance?.pos) {
        bounds.extend([activeAmbulance.pos.lng, activeAmbulance.pos.lat]);
      }
      jams.forEach((j) => bounds.extend([j.pos.lng, j.pos.lat]));
      map.fitBounds(bounds, { padding: 65, bearing: 0, pitch: 0, duration: 900 });
    } else {
      handleRecenter();
    }
  }, [isOverviewMode, activeRoute, hospitals, activeAmbulance, jams, handleRecenter]);

  // Listen for global custom event to toggle overview mode
  useEffect(() => {
    const handler = () => {
      handleToggleOverview();
    };
    window.addEventListener('jyva:toggle-overview', handler);
    return () => window.removeEventListener('jyva:toggle-overview', handler);
  }, [handleToggleOverview]);

  const speedVal = activeAmbulance?.speedKmh ?? 64;

  return (
    <div className={`relative w-full h-full flex-1 min-h-0 overflow-hidden bg-[#f8faf9] ${className}`}>
      {/* MapLibre Canvas Container: fills full bounds */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 overflow-hidden" />

      {/* Backup Map Active Pill */}
      {usingBackupMap && (
        <div className="absolute top-20 left-4 z-30 px-2.5 py-1 rounded-md bg-amber-500/95 text-white text-[11px] font-bold shadow-md flex items-center gap-1.5 backdrop-blur-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Using backup map</span>
        </div>
      )}

      {/* Mode Controls & Recenter Button (Google Maps Navigation Style) */}
      {mode === 'navigation' && (
        <div className="absolute right-4 bottom-5 z-20 flex flex-col gap-2">
          {/* Recenter Button: appears whenever camera follow mode is paused */}
          {!isFollowing && (
            <button
              type="button"
              onClick={handleRecenter}
              className="px-4 py-2 bg-white text-[#0f5146] font-bold text-xs rounded-full shadow-lg border border-slate-200 hover:bg-[#edf7f3] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              title="Resume vehicle follow mode"
            >
              <Compass className="w-4 h-4 text-[#0f5146] animate-spin-slow" />
              <span>Recenter</span>
            </button>
          )}

          {/* Overview Toggle Button */}
          <button
            type="button"
            onClick={handleToggleOverview}
            className="w-10 h-10 bg-white hover:bg-slate-50 text-[#132a24] rounded-full shadow-md border border-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 self-end"
            title={isOverviewMode ? 'Follow Ambulance' : 'Show Route Overview'}
          >
            {isOverviewMode ? (
              <Crosshair className="w-5 h-5 text-[#0f5146]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      )}

      {/* Floating Speed HUD (Bottom Left) */}
      {showSpeedHud && mode === 'navigation' && (
        <div className="absolute bottom-16 left-4 z-20 text-xs font-mono font-bold text-slate-900 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/90 flex items-center space-x-2 shadow-sm pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span>
            SPEED: <span className="text-slate-950 font-black">{speedVal} KM/H</span>
          </span>
        </div>
      )}

      {/* Simulated Traffic Legend (Google Maps Style) */}
      <div className="absolute bottom-5 left-4 z-20 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-sm text-[10px] font-medium text-slate-700 flex items-center gap-2.5">
          <span className="font-bold text-slate-900">Simulated traffic:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
            Clear
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
            Slow
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
            Heavy
          </span>
        </div>
      </div>
    </div>
  );
}

export default NavMap;
