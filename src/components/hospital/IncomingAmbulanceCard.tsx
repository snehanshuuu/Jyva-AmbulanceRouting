'use client';

import React from 'react';
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRightLeft,
  Gauge,
  Check,
  Radio,
} from 'lucide-react';
import { Trip, Ambulance } from '@/lib/types';
import { useJyvaStore } from '@/store/useJyvaStore';

interface IncomingAmbulanceCardProps {
  trip: Trip;
  ambulance?: Ambulance;
}

export default function IncomingAmbulanceCard({ trip, ambulance }: IncomingAmbulanceCardProps) {
  const acknowledgeTrip = useJyvaStore((s) => s.acknowledgeTrip);
  const markTripReady = useJyvaStore((s) => s.markTripReady);
  const ambulances = useJyvaStore((s) => s.ambulances);

  const amb = ambulance || ambulances.find((a) => a.id === trip.ambulanceId);

  // Compute live ETA formatted in minutes
  const etaSec = trip.etaSec ?? 360;
  const etaMinutes = Math.max(1, Math.round(etaSec / 60));

  const priority = trip.priority || 'STABLE';
  const isCritical = priority === 'CRITICAL';
  const isUrgent = priority === 'URGENT';

  // Card border and badge styles matching stitch design
  const cardBorderClass = isCritical
    ? 'border-l-4 border-l-[#c5221f]'
    : isUrgent
    ? 'border-l-4 border-l-amber-500'
    : 'border-l-4 border-l-emerald-500';

  const priorityPillClass = isCritical
    ? 'bg-[#fee9e7] text-[#c5221f]'
    : isUrgent
    ? 'bg-[#fef3c7] text-[#92400e]'
    : 'bg-[#daf2e8] text-[#0f5146]';

  const etaColorClass = isCritical
    ? 'text-[#c5221f]'
    : isUrgent
    ? 'text-[#92400e]'
    : 'text-emerald-700';

  // Status mapping
  const isAcknowledged = trip.status === 'ACKNOWLEDGED' || trip.status === 'HOSPITAL_READY' || trip.status === 'ARRIVED';
  const isReady = trip.status === 'HOSPITAL_READY' || trip.status === 'ARRIVED';

  // Origin display
  const originLabel =
    trip.origin.type === 'HOSPITAL_TRANSFER'
      ? `Transfer from: ${trip.origin.hospitalName || 'Regional Hospital'}`
      : `From: ${trip.origin.label || 'Incident Scene'}`;

  // Operator and Base Hospital
  const operatorName = amb?.operator?.name || '108 Emergency Service';
  const baseHospitalInfo = amb?.baseHospitalId ? ` • Sion Base` : '';

  // Vitals
  const hr = trip.vitals?.hr ?? 80;
  const spo2 = trip.vitals?.spo2 ?? 98;
  const sbp = trip.vitals?.sbp ?? 120;
  const dbp = trip.vitals?.dbp ?? 80;
  const gcs = trip.vitals?.gcs ?? 15;

  const speedKmh = amb?.speedKmh || (isCritical ? 64 : isUrgent ? 52 : 45);
  const distanceKm = ((etaMinutes * (speedKmh / 60))).toFixed(1);

  return (
    <div
      className={`bg-white border border-[#e1eee7] rounded-3xl p-4 shadow-[0_4px_20px_-2px_rgba(15,81,70,0.04),0_2px_6px_-1px_rgba(15,81,70,0.02)] transition-all hover:-translate-y-0.5 ${cardBorderClass}`}
    >
      {/* Top Header: Priority Badge, ID, Plate, and ETA */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {(() => {
            const PriorityIcon = isCritical ? AlertTriangle : isUrgent ? AlertCircle : CheckCircle2;
            return (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${priorityPillClass}`}
                role="status"
                aria-label={`Patient Priority: ${priority}`}
              >
                <PriorityIcon className="w-3 h-3 shrink-0" />
                <span>{priority}</span>
              </span>
            );
          })()}
          <span className="text-sm font-extrabold text-[#132a24]">{amb?.id || trip.ambulanceId}</span>
          <span className="font-mono text-[10px] text-[#7a958e]">
            Plate: {amb?.plate || 'MH-01-ER-1081'}
          </span>
        </div>

        {/* Live ETA Countdown */}
        <div className="flex items-center gap-1 text-right">
          <span className="text-[10px] uppercase text-[#7a958e] font-semibold">ETA</span>
          <span className={`text-lg font-bold tracking-tight ${etaColorClass}`}>
            {etaMinutes} min
          </span>
        </div>
      </div>

      {/* Operator & Origin Details */}
      <div className="mt-1.5 flex flex-col text-xs text-[#547169]">
        <span className="font-medium text-[#132a24]">
          {operatorName}
          {baseHospitalInfo}
        </span>
        <span className="text-[#7a958e] text-[11px] flex items-center gap-1 mt-0.5">
          {trip.origin.type === 'HOSPITAL_TRANSFER' ? (
            <ArrowRightLeft className="w-3 h-3 text-[#7a958e]" />
          ) : (
            <Navigation className="w-3 h-3 text-[#7a958e]" />
          )}
          {originLabel}
        </span>
      </div>

      {/* Protocol & Status Tags */}
      <div className="my-2.5 flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-[#daf2e8] text-xs font-semibold text-[#0f5146] border border-[#bfe7d5]">
          {trip.caseType.charAt(0) + trip.caseType.slice(1).toLowerCase()}
        </span>

        {isReady ? (
          <span className="px-2.5 py-0.5 rounded-full bg-[#daf2e8] text-[#0a4239] border border-[#a6e6cf] text-[10px] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#0f5146]" />
            Bay 2 Ready
          </span>
        ) : isAcknowledged ? (
          <span className="px-2.5 py-0.5 rounded-full bg-[#edf7f3] text-[#0f5146] border border-[#d2e4dc] text-[10px] font-medium flex items-center gap-1">
            <Check className="w-3 h-3 text-[#0f5146]" />
            Acknowledged
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full bg-[#fffbeb] border border-[#fde68a] text-[#92400e] text-[10px] font-semibold flex items-center gap-1">
            <Radio className="w-3 h-3 text-amber-500 animate-pulse" />
            Alert Received
          </span>
        )}
      </div>

      {/* Vitals Summary Strip (4 tiles matching Stitch design) */}
      <div className="grid grid-cols-4 gap-2 p-2 rounded-2xl bg-[#f4fbf7] border border-[#e1eee7] text-center">
        <div>
          <span className="text-[9px] text-[#7a958e] block font-semibold uppercase">HR</span>
          <span
            className={`font-mono text-xs font-bold ${hr > 110 || hr < 50 ? 'text-[#c5221f]' : 'text-[#132a24]'}`}
          >
            {hr} <span className="text-[8px] font-normal text-[#7a958e]">BPM</span>
          </span>
        </div>
        <div>
          <span className="text-[9px] text-[#7a958e] block font-semibold uppercase">SpO2</span>
          <span
            className={`font-mono text-xs font-bold ${spo2 < 92 ? 'text-[#c5221f]' : 'text-[#132a24]'}`}
          >
            {spo2}% {spo2 < 92 && <span className="text-[8px] font-normal text-[#c5221f]">(Low)</span>}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-[#7a958e] block font-semibold uppercase">BP</span>
          <span className="font-mono text-xs font-bold text-[#132a24]">
            {sbp}/{dbp}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-[#7a958e] block font-semibold uppercase">GCS</span>
          <span
            className={`font-mono text-xs font-bold ${gcs < 13 ? 'text-[#9d4300]' : 'text-[#132a24]'}`}
          >
            {gcs}/15
          </span>
        </div>
      </div>

      {/* Card Actions & Telemetry Footer */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#edf4f0] flex-wrap gap-2">
        <span className="font-mono text-[10px] text-[#7a958e] flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5" />
          {speedKmh} km/h • {distanceKm} km dist
        </span>

        <div className="flex items-center gap-2">
          {/* Acknowledge Button - only shown when pending acknowledgment */}
          {!isAcknowledged && (
            <button
              onClick={() => acknowledgeTrip(trip.id)}
              className="px-4 py-1.5 rounded-full bg-[#0f5146] text-white text-[10px] font-semibold hover:bg-[#0c433a] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              Acknowledge
            </button>
          )}

          {/* Mark Ready Button */}
          {isReady ? (
            <button
              disabled
              className="px-4 py-1.5 rounded-full bg-[#0f5146] text-[#64f9bc] text-[10px] font-semibold flex items-center gap-1 cursor-default shadow-xs"
            >
              <CheckCircle2 className="w-3 h-3 text-[#64f9bc]" />
              Bay Ready
            </button>
          ) : (
            <button
              onClick={() => markTripReady(trip.id)}
              className="px-4 py-1.5 rounded-full bg-white text-[#0f5146] text-[10px] font-semibold border border-[#d2e4dc] hover:bg-[#edf7f3] active:scale-95 transition-all cursor-pointer"
            >
              Mark Ready
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
