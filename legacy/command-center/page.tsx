'use client';

import React from 'react';
import { KpiStrip } from '@/components/panels/KpiStrip';
import { MapView } from '@/components/map/MapView';
import { IncidentList } from '@/components/panels/IncidentList';
import { FleetList } from '@/components/panels/FleetList';
import { EventFeed } from '@/components/panels/EventFeed';
import { PlusCircle } from 'lucide-react';

export default function CommandCenterPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Emergency Command Center
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              ROLE: DISPATCHER
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Realtime city-wide incident queue, automated ambulance dispatch, and dynamic green corridor tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer">
            <PlusCircle className="h-4 w-4" />
            <span>Create Incident</span>
          </button>
        </div>
      </div>

      {/* KPI metrics bar */}
      <KpiStrip />

      {/* Main Grid: Map & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map & Live Feed */}
        <div className="lg:col-span-8 space-y-6">
          <MapView />
          <EventFeed />
        </div>

        {/* Right Column: Incident Queue & Fleet Status */}
        <div className="lg:col-span-4 space-y-6">
          <IncidentList />
          <FleetList />
        </div>
      </div>
    </div>
  );
}
