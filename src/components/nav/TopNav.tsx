'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useJyvaStore } from '@/store/useJyvaStore';
import {
  Activity,
  Ambulance,
  Building2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Home,
} from 'lucide-react';

export function TopNav() {
  const pathname = usePathname();
  const {
    isSimRunning,
    setIsSimRunning,
    simSpeed,
    setSimSpeed,
    timeSavedS,
    resetDemo,
  } = useJyvaStore();

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/ambulance', label: 'Ambulance Screen', icon: Ambulance },
    { href: '/hospital', label: 'Hospital Screen', icon: Building2 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all">
              <div className="h-full w-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Jyva
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  V2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                Clear roads. Ready hospitals.
              </p>
            </div>
          </Link>

          {/* Navigation items: Only /ambulance and /hospital */}
          <nav className="hidden md:flex items-center gap-1.5 ml-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700/70'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls: Simulation bar */}
        <div className="flex items-center gap-2.5">
          {/* Time saved pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400">Time Saved:</span>
            <span className="font-bold text-emerald-400">{Math.round(timeSavedS)}s</span>
          </div>

          {/* Simulation controls: Play/Pause & Speed */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsSimRunning(!isSimRunning)}
              title={isSimRunning ? 'Pause Simulation' : 'Resume Simulation'}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isSimRunning
                  ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isSimRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>

            <div className="flex items-center border-l border-slate-800 pl-1">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSimSpeed(s)}
                  className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                    simSpeed === s
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Reset Demo button */}
          <button
            type="button"
            onClick={() => resetDemo()}
            title="Reset Demo to Initial Seed State"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation bar */}
      <div className="md:hidden flex items-center justify-around px-4 py-2 border-t border-slate-900 bg-slate-950/95 text-xs">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
                isActive ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
export default TopNav;
