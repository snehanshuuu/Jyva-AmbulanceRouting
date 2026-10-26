'use client';

import React from 'react';
import { LatLng, RoutePlan } from '@/lib/types';
import { getNextTurnManeuver } from '@/engine/route';
import { ArrowUpRight, ArrowUpLeft, ArrowUp, Flag } from 'lucide-react';

interface RouteTurnGuidanceProps {
  route?: RoutePlan | null;
  distanceTravelledM?: number;
  currentPos?: LatLng;
}

export function RouteTurnGuidance({
  route,
  distanceTravelledM = 0,
  currentPos,
}: RouteTurnGuidanceProps) {
  const maneuver = route
    ? getNextTurnManeuver(route, distanceTravelledM, currentPos)
    : {
        instruction: 'Turn right onto Eastern Express Hwy',
        distanceRemainingM: 300,
        modifier: 'right' as const,
        distanceNotice: 'In 300 meters',
      };

  const renderIcon = () => {
    switch (maneuver.modifier) {
      case 'right':
      case 'slight right':
        return <ArrowUpRight className="w-5 h-5 text-[#64f9bc]" />;
      case 'left':
      case 'slight left':
        return <ArrowUpLeft className="w-5 h-5 text-[#64f9bc]" />;
      case 'arrive':
        return <Flag className="w-5 h-5 text-[#64f9bc]" />;
      default:
        return <ArrowUp className="w-5 h-5 text-[#64f9bc]" />;
    }
  };

  const isRight = maneuver.modifier === 'right' || maneuver.modifier === 'slight right';
  const isLeft = maneuver.modifier === 'left' || maneuver.modifier === 'slight left';
  const isArrive = maneuver.modifier === 'arrive';

  return (
    <div
      className="bg-[#0a1e19]/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-xl border border-white/10 flex items-center space-x-4 max-w-xl pointer-events-auto"
      data-purpose="turn-by-turn-hud"
    >
      {/* Direction Arrow in circular style matching Stitch design */}
      <div className="w-10 h-10 rounded-full bg-[#0f5146] text-[#64f9bc] border border-[#2c685c] flex items-center justify-center font-bold shrink-0 shadow-inner">
        {renderIcon()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#64f9bc] font-bold uppercase tracking-wider">{maneuver.distanceNotice}</p>
        <h4 className="text-base font-bold text-white leading-tight truncate">{maneuver.instruction}</h4>
      </div>

      {/* Dynamic Lane Indicator */}
      <div className="flex items-center space-x-1 pl-3.5 border-l border-white/15 text-sm font-mono font-bold select-none shrink-0">
        <span className="text-white/20">|</span>
        <span className={isLeft ? 'text-[#64f9bc] text-base font-black' : 'text-white/30'}>
          {isLeft ? '↖' : '↑'}
        </span>
        <span className={!isLeft && !isRight && !isArrive ? 'text-[#64f9bc] text-base font-black' : 'text-white/30'}>
          ↑
        </span>
        <span className={isRight ? 'text-[#64f9bc] text-base font-black' : 'text-white/30'}>
          {isRight ? '↗' : '↑'}
        </span>
        <span className="text-white/20">|</span>
      </div>
    </div>
  );
}

export default RouteTurnGuidance;
