'use client';

import React from 'react';
import { Priority } from '@/lib/types';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

interface PriorityBannerProps {
  priority: Priority;
  headline: string;
  patientInfo?: string;
}

export function PriorityBanner({
  priority,
  headline,
  patientInfo = 'Adult Male, 54y • ID #JY-9022',
}: PriorityBannerProps) {
  const isCritical = priority === 'CRITICAL';
  const isUrgent = priority === 'URGENT';

  const containerBg = isCritical
    ? 'bg-[#dc2626]'
    : isUrgent
      ? 'bg-[#d97706]'
      : 'bg-[#0f5146]';

  const subtextColor = isCritical
    ? 'text-rose-100'
    : isUrgent
      ? 'text-amber-100'
      : 'text-teal-100';

  const codePillText = isCritical
    ? 'CODE RED'
    : isUrgent
      ? 'CODE AMBER'
      : 'CODE GREEN';

  const Icon = isCritical
    ? AlertTriangle
    : isUrgent
      ? AlertCircle
      : ShieldCheck;

  return (
    <div
      className={`rounded-2xl text-white p-3.5 shadow-sm flex items-center space-x-3 mb-3 ${containerBg}`}
      data-purpose="priority-warning-banner"
    >
      <div className="p-2 bg-white/20 rounded-xl shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-black tracking-wide uppercase">
            {headline}
          </span>
          <span className="text-[11px] font-mono bg-white/25 font-bold px-2.5 py-0.5 rounded-full shrink-0">
            {codePillText}
          </span>
        </div>
        <p className={`text-xs font-medium mt-0.5 ${subtextColor}`}>
          {patientInfo}
        </p>
      </div>
    </div>
  );
}

export default PriorityBanner;
