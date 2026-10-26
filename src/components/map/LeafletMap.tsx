'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useJyvaStore } from '@/store/useJyvaStore';
import { Hospital, Ambulance, RoutePlan } from '@/lib/types';
import { JamZone } from '@/engine/route';
import { Plus, Minus, Crosshair } from 'lucide-react';

interface LeafletMapProps {
  showHospitals?: boolean;
  showAmbulances?: boolean;
  onlyActiveAmbulance?: boolean;
  showRoute?: boolean;
  showJams?: boolean;
  showSpeedHud?: boolean;
  showSignals?: boolean;
  center?: [number, number];
  zoom?: number;
  hospitals?: Hospital[];
  ambulances?: Ambulance[];
  activeRoute?: RoutePlan | null;
  jams?: JamZone[];
  destinationHospitalId?: string;
  onSelectAmbulance?: (id: string) => void;
  onSelectHospital?: (id: string) => void;
}

export default function LeafletMap({
  showHospitals = true,
  showAmbulances = true,
  onlyActiveAmbulance = false,
  showRoute = true,
  showJams = true,
  showSpeedHud = true,
  center = [19.0250, 72.8450],
  zoom = 13,
  hospitals: propHospitals,
  ambulances: propAmbulances,
  activeRoute: propRoute,
  jams: propJams,
  destinationHospitalId,
  onSelectAmbulance,
  onSelectHospital,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const hospitalsLayerRef = useRef<L.LayerGroup | null>(null);
  const ambulancesLayerRef = useRef<L.LayerGroup | null>(null);
  const jamsLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const storeHospitals = useJyvaStore((s) => s.hospitals);
  const storeAmbulances = useJyvaStore((s) => s.ambulances);
  const storeRoute = useJyvaStore((s) => s.activeRoute);
  const storeJams = useJyvaStore((s) => s.jams);
  const activeAmbulanceId = useJyvaStore((s) => s.activeAmbulanceId);
  const activeTrip = useJyvaStore((s) => s.activeTrip);
  const incomingTrips = useJyvaStore((s) => s.incomingTrips);
  const setActiveAmbulanceId = useJyvaStore((s) => s.setActiveAmbulanceId);

  const hospitals = propHospitals || storeHospitals;
  const ambulances = propAmbulances || storeAmbulances;
  const activeRoute = propRoute !== undefined ? propRoute : storeRoute;
  const jams = propJams || storeJams;
  const targetHospitalId = destinationHospitalId || activeTrip?.destinationHospitalId || 'hosp-sion';

  const activeAmbulance = ambulances.find((a) => a.id === activeAmbulanceId) || ambulances[0];
  const speedVal = activeAmbulance?.speedKmh ?? 64;

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: true,
    });

    // OpenStreetMap standard tile layer (dark look applied to .leaflet-tile-pane via CSS filter)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const hospitalsLayer = L.layerGroup().addTo(map);
    const ambulancesLayer = L.layerGroup().addTo(map);
    const jamsLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);

    hospitalsLayerRef.current = hospitalsLayer;
    ambulancesLayerRef.current = ambulancesLayer;
    jamsLayerRef.current = jamsLayer;
    routeLayerRef.current = routeLayer;

    mapInstanceRef.current = map;

    // Handle container resize to eliminate gaps
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      ro.observe(mapContainerRef.current);
    }
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      hospitalsLayerRef.current = null;
      ambulancesLayerRef.current = null;
      jamsLayerRef.current = null;
      routeLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan smoothly on center/zoom update (only when no active route bounds override is in effect)
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;
    if (!destinationHospitalId && activeRoute?.pathCoordinates && activeRoute.pathCoordinates.length >= 2) return;
    mapInstanceRef.current.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, destinationHospitalId, activeRoute]);

  // 2. Render Hospital Markers
  useEffect(() => {
    const layer = hospitalsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showHospitals) return;

    hospitals.forEach((hosp) => {
      const isTarget = hosp.id === targetHospitalId;
      const isDiverted = hosp.diverted;
      const waitingMin = hosp.waitingMin ?? 0;
      const freeBeds = hosp.freeErBeds ?? hosp.capacity?.erBeds ?? 0;

      let markerHtml = '';

      if (isTarget) {
        // Destination Beacon with concentric target rings and label card matching Stitch
        markerHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <!-- Callout Card offset so it never overlaps the center pin or ambulance -->
            <div style="
              position: absolute;
              bottom: 38px;
              left: 20px;
              background: #072b25;
              border: 1.8px solid #34d399;
              padding: 4px 10px;
              border-radius: 9999px;
              box-shadow: 0 4px 16px rgba(52,211,153,0.3);
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 5px;
              z-index: 600;
            ">
              <span style="width: 6px; height: 6px; border-radius: 9999px; background: #34d399;"></span>
              <span style="color: #a7f3d0; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">DESTINATION</span>
              <span style="color: #ffffff; font-size: 11px; font-weight: 700;">${hosp.shortName || hosp.name}</span>
            </div>

            <!-- Concentric Pulse Ring -->
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 52px;
              height: 52px;
              border-radius: 9999px;
              border: 1.5px dashed #34d399;
              background: rgba(52,211,153,0.15);
              animation: pulseGlow 2s infinite ease-in-out;
            "></div>

            <!-- Center Pin -->
            <div style="
              position: relative;
              width: 32px;
              height: 32px;
              border-radius: 12px;
              background: #0f5146;
              border: 2px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(15,81,70,0.6);
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64f9bc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 4v16m-8-8h16"/>
              </svg>
            </div>
          </div>
        `;
      } else {
        // Standard Hospital Pin
        const borderColor = isDiverted ? '#f43f5e' : '#2dd4bf';
        const bgColor = isDiverted ? '#4c0519' : '#092d26';

        markerHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="
              width: 28px;
              height: 28px;
              border-radius: 8px;
              background: ${bgColor};
              border: 1.8px solid ${borderColor};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            ">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${borderColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14m-7-7h14"/>
              </svg>
            </div>
            <!-- Wait Badge -->
            <div style="
              position: absolute;
              top: -5px;
              right: -5px;
              padding: 0 4px;
              border-radius: 9999px;
              font-size: 8px;
              font-family: monospace;
              font-weight: 800;
              background: ${isDiverted ? '#dc2626' : '#0f5146'};
              color: #ffffff;
              border: 1px solid rgba(255,255,255,0.4);
            ">
              ${isDiverted ? 'DIV' : `${waitingMin}m`}
            </div>
          </div>
        `;
      }

      const icon = L.divIcon({
        html: markerHtml,
        className: 'jyva-map-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #132a24; background: #ffffff; padding: 12px; border-radius: 12px; min-width: 210px; border: 1px solid #e2efe8; box-shadow: 0 8px 24px rgba(15,81,70,0.15);">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 2px;">${hosp.name}</div>
          <div style="font-size: 11px; color: #547169; margin-bottom: 8px;">${hosp.address}</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; background: #ebf7f3; padding: 6px 8px; border-radius: 8px; margin-bottom: 6px;">
            <span>Wait: <strong style="color: #0f5146;">${waitingMin} min</strong></span>
            <span>Free Beds: <strong style="color: #0f5146;">${freeBeds}</strong></span>
          </div>
          <div style="font-size: 10px; color: ${isDiverted ? '#dc2626' : '#059669'}; font-weight: 700;">
            ${isDiverted ? '⚠️ Intake Diverted' : '✓ Accepting Patients'}
          </div>
        </div>
      `;

      const marker = L.marker([hosp.pos.lat, hosp.pos.lng], { icon });
      marker.bindPopup(popupContent);
      marker.on('click', () => onSelectHospital?.(hosp.id));
      layer.addLayer(marker);
    });
  }, [hospitals, showHospitals, targetHospitalId, onSelectHospital]);

  // 3. Render Ambulance Markers
  useEffect(() => {
    const layer = ambulancesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showAmbulances) return;

    const hospitalIncomingTrips = destinationHospitalId
      ? incomingTrips.filter((t) => t.destinationHospitalId === destinationHospitalId && t.status !== 'ARRIVED')
      : [];
    const inboundAmbMap = new Map(hospitalIncomingTrips.map((t) => [t.ambulanceId, t]));

    const ambList = destinationHospitalId
      ? ambulances.filter((a) => inboundAmbMap.has(a.id))
      : (onlyActiveAmbulance ? ambulances.filter((a) => a.id === activeAmbulanceId) : ambulances);

    ambList.forEach((amb) => {
      const isSelected = amb.id === activeAmbulanceId;
      const borderColor = isSelected ? '#2dd4bf' : '#547169';
      const dotBg = isSelected ? '#0f5146' : '#27473e';
      const innerDot = isSelected ? '#64f9bc' : '#a7c9bc';
      const glowHtml = isSelected
        ? `<div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 44px;
            height: 44px;
            border-radius: 9999px;
            border: 1.5px solid #2dd4bf;
            background: rgba(45,212,191,0.18);
            animation: pulseGlow 2.2s infinite ease-in-out;
          "></div>`
        : '';

      const trip = destinationHospitalId ? inboundAmbMap.get(amb.id) : undefined;
      const tripEtaMin = trip?.etaSec
        ? Math.max(1, Math.round(trip.etaSec / 60))
        : (amb.id === activeAmbulanceId && activeTrip?.etaSec ? Math.max(1, Math.round(activeTrip.etaSec / 60)) : undefined);

      const labelText = tripEtaMin ? `${amb.id} • ${tripEtaMin}m ETA` : amb.id;

      const markerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: ${isSelected ? 500 : 100};">
          <!-- Ambulance Label Pin with ETA -->
          <div style="
            position: absolute;
            bottom: 34px;
            background: #0a1e19;
            border: 1.5px solid ${borderColor};
            padding: 2px 8px;
            border-radius: 9999px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            pointer-events: none;
          ">
            <span style="width: 5px; height: 5px; border-radius: 9999px; background: ${borderColor};"></span>
            <span style="color: #ffffff; font-size: 10px; font-weight: 800; font-family: 'Plus Jakarta Sans', sans-serif;">${labelText}</span>
          </div>

          <!-- Outer Glow Ring -->
          ${glowHtml}

          <!-- Center Vehicle Dot -->
          <div style="
            width: 22px;
            height: 22px;
            border-radius: 9999px;
            background: ${dotBg};
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 6px; height: 6px; border-radius: 9999px; background: ${innerDot};"></div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'jyva-ambulance-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #132a24; background: #ffffff; padding: 10px 12px; border-radius: 12px; min-width: 190px; border: 1px solid #e2efe8;">
          <div style="font-weight: 800; font-size: 13px;">${amb.id} (${amb.callSign})</div>
          <div style="font-size: 11px; color: #547169;">${amb.operator?.name || '108 EMS'}</div>
          <div style="font-size: 11px; color: #547169; margin-bottom: 6px;">Plate: <strong>${amb.plate}</strong></div>
          <div style="font-size: 10px; font-family: monospace; font-weight: 700; color: #0f5146; background: #ebf7f3; padding: 3px 6px; border-radius: 6px;">
            Status: ${amb.status} • ${amb.speedKmh || 64} km/h ${tripEtaMin ? `• ETA: ${tripEtaMin} min` : ''}
          </div>
        </div>
      `;

      const marker = L.marker([amb.pos.lat, amb.pos.lng], { icon });
      marker.bindPopup(popupContent);
      marker.on('click', () => {
        setActiveAmbulanceId(amb.id);
        onSelectAmbulance?.(amb.id);
      });
      layer.addLayer(marker);
    });
  }, [ambulances, incomingTrips, showAmbulances, onlyActiveAmbulance, activeAmbulanceId, destinationHospitalId, activeTrip, setActiveAmbulanceId, onSelectAmbulance]);

  // 4. Render Active Route Polyline / Inbound Fleet Vectors
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showRoute) return;

    // A. Hospital Screen: draw dashed route lines to destination hospital for all inbound ambulances
    if (destinationHospitalId) {
      const destHosp = hospitals.find((h) => h.id === destinationHospitalId);
      if (destHosp) {
        const hospitalIncomingTrips = incomingTrips.filter(
          (t) => t.destinationHospitalId === destinationHospitalId && t.status !== 'ARRIVED'
        );
        const inboundAmbMap = new Map(hospitalIncomingTrips.map((t) => [t.ambulanceId, t]));
        const ambList = ambulances.filter((a) => inboundAmbMap.has(a.id));

        ambList.forEach((amb) => {
          const trip = inboundAmbMap.get(amb.id);
          const isCritical = trip?.priority === 'CRITICAL';
          const lineColor = isCritical ? '#f43f5e' : '#2dd4bf';

          const dashed = L.polyline(
            [
              [amb.pos.lat, amb.pos.lng],
              [destHosp.pos.lat, destHosp.pos.lng],
            ],
            {
              color: lineColor,
              weight: 3,
              opacity: 0.85,
              dashArray: '6, 8',
              lineCap: 'round',
            }
          );
          layer.addLayer(dashed);
        });

        if (mapInstanceRef.current && ambList.length > 0) {
          const bounds = L.latLngBounds([[destHosp.pos.lat, destHosp.pos.lng]]);
          ambList.forEach((a) => bounds.extend([a.pos.lat, a.pos.lng]));
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 14,
            });
          }
        }
      }
      return;
    }

    // B. Ambulance Screen: fit bounds to route between AMB-014 and target hospital, draw route line, keep jam zone visible
    if (!activeRoute || !activeRoute.pathCoordinates || activeRoute.pathCoordinates.length < 2) {
      return;
    }

    const latLngs = activeRoute.pathCoordinates.map((c) => [c.lat, c.lng] as [number, number]);

    // Outer cyan/emerald glow
    const glowLine = L.polyline(latLngs, {
      color: '#2dd4bf',
      weight: 10,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Main emerald route line
    const mainLine = L.polyline(latLngs, {
      color: '#14b8a6',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Forward motion dash
    const dashLine = L.polyline(latLngs, {
      color: '#ffffff',
      weight: 2,
      opacity: 0.85,
      dashArray: '8, 14',
      lineCap: 'round',
      lineJoin: 'round',
    });

    layer.addLayer(glowLine);
    layer.addLayer(mainLine);
    layer.addLayer(dashLine);

    // Fit map bounds to the route between AMB-014 and target hospital, keeping jam zones visible
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds(latLngs);
      if (showJams && jams && jams.length > 0) {
        jams.forEach((j) => {
          bounds.extend([j.pos.lat, j.pos.lng]);
          const deg = (j.radiusM || 450) / 111320;
          bounds.extend([j.pos.lat + deg, j.pos.lng + deg]);
          bounds.extend([j.pos.lat - deg, j.pos.lng - deg]);
        });
      }

      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
        });
      }
    }
  }, [activeRoute, showRoute, destinationHospitalId, hospitals, incomingTrips, ambulances, jams, showJams]);

  // 5. Render Traffic Jam Zones
  useEffect(() => {
    const layer = jamsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showJams || jams.length === 0) return;

    jams.forEach((jam) => {
      const circle = L.circle([jam.pos.lat, jam.pos.lng], {
        radius: jam.radiusM,
        color: '#f43f5e',
        weight: 2.5,
        dashArray: '8, 6',
        fillColor: '#4c0519',
        fillOpacity: 0.45,
      });

      const tooltipHtml = `
        <div style="background: #4c0519; border: 1px solid #f43f5e; color: #ffffff; padding: 4px 8px; border-radius: 8px; font-size: 10px; font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="color: #fca5a5; font-size: 9px; font-weight: 800; text-transform: uppercase;">TRAFFIC DELAY</div>
          <div style="font-family: monospace; font-weight: 700;">+${Math.round(jam.delayS / 60)} MIN AVOIDED</div>
        </div>
      `;

      circle.bindTooltip(tooltipHtml, {
        permanent: true,
        direction: 'center',
        className: 'jyva-jam-hud-tooltip',
      });

      layer.addLayer(circle);
    });
  }, [jams, showJams]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    if (activeAmbulance?.pos && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([activeAmbulance.pos.lat, activeAmbulance.pos.lng], 14, { duration: 0.8 });
    }
  };

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-[#0b1916]">
      {/* Tactical Leaflet Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-full z-0" style={{ background: '#0b1916' }} />

      {/* Floating Speed HUD Pill (Bottom Left) */}
      {showSpeedHud && (
        <div className="absolute bottom-3 left-4 z-10 text-xs font-mono font-bold text-white bg-[#0a1e19]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center space-x-2 shadow-sm pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
          <span>
            SPEED: <span className="text-white text-sm font-black">{speedVal} KM/H</span>
          </span>
        </div>
      )}

      {/* Mini Floating Map Controls (Bottom Right - avoids collision with top demo controls bar) */}
      <div className="absolute right-3.5 bottom-3.5 z-10 flex flex-col gap-1 bg-[#132823]/90 p-1 rounded-xl border border-[#1e3f36] backdrop-blur-md shadow-md">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-7 h-7 rounded-lg bg-[#1b3b32] text-teal-200 flex items-center justify-center hover:bg-[#234c40] hover:text-white transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-7 h-7 rounded-lg bg-[#1b3b32] text-teal-200 flex items-center justify-center hover:bg-[#234c40] hover:text-white transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter Ambulance"
          className="w-7 h-7 rounded-lg bg-[#1b3b32] text-teal-200 flex items-center justify-center hover:bg-[#234c40] hover:text-white transition-colors cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
