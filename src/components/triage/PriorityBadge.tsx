import React from 'react';
import { PatientPriority } from '@/lib/types';
import { AlertCircle, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface PriorityBadgeProps {
  priority: PatientPriority;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriorityBadge({ priority, className = '', size = 'md' }: PriorityBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2 font-semibold',
  };

  const configs = {
    CRITICAL: {
      label: 'CRITICAL',
      bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
      icon: AlertCircle,
      desc: 'Immediate Resuscitation',
    },
    URGENT: {
      label: 'URGENT',
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      icon: AlertTriangle,
      desc: 'Prompt Emergency Care',
    },
    STABLE: {
      label: 'STABLE',
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
      icon: CheckCircle2,
      desc: 'Standard Intake',
    },
    P1: {
      label: 'P1 CRITICAL',
      bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
      icon: AlertCircle,
      desc: 'Immediate Resuscitation',
    },
    P2: {
      label: 'P2 EMERGENT',
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      icon: AlertTriangle,
      desc: 'Bedside < 10m',
    },
    P3: {
      label: 'P3 URGENT',
      bg: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
      icon: Clock,
      desc: 'Prompt care',
    },
    P4: {
      label: 'P4 NON-URGENT',
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
      icon: CheckCircle2,
      desc: 'Standard intake',
    },
  };

  const conf = (configs as Record<string, typeof configs.P1>)[priority] || configs.STABLE;
  const Icon = conf.icon;

  return (
    <span
      className={`inline-flex items-center rounded-md border font-mono uppercase tracking-wider font-bold ${conf.bg} ${sizeClasses[size]} ${className}`}
      title={`${conf.label}: ${conf.desc}`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
      <span>{conf.label}</span>
    </span>
  );
}
