'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ambulance,
  Building2,
  Lock,
  ArrowRight,
  Shield,
  Zap,
  Activity,
  Bell,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useJyvaStore } from '@/store/useJyvaStore';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ambulance' | 'hospital'>('ambulance');

  // Ambulance form state
  const [ambId, setAmbId] = useState('AMB-014');
  const [ambPin, setAmbPin] = useState('1234');
  const [showAmbPin, setShowAmbPin] = useState(false);

  // Hospital form state
  const [hospId, setHospId] = useState('HOSP-SION');
  const [hospPass, setHospPass] = useState('demo123');
  const [showHospPass, setShowHospPass] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset form and loading states on mount and clear sessionStorage
  React.useEffect(() => {
    try {
      sessionStorage.clear();
    } catch {}
    const t = setTimeout(() => {
      setIsLoading(false);
      setErrorMessage(null);
      setActiveTab('ambulance');
      setAmbId('AMB-014');
      setAmbPin('1234');
      setHospId('HOSP-SION');
      setHospPass('demo123');
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const fillDemoAmbulance = () => {
    setAmbId('AMB-014');
    setAmbPin('1234');
    setErrorMessage(null);
  };

  const fillDemoHospital = () => {
    setHospId('HOSP-SION');
    setHospPass('demo123');
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const isAmb = activeTab === 'ambulance';
    const payload = {
      role: isAmb ? 'AMBULANCE' : 'HOSPITAL',
      identifier: isAmb ? ambId.trim() : hospId.trim(),
      secret: isAmb ? ambPin.trim() : hospPass.trim(),
    };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      useJyvaStore.getState().resetDemo();
      router.push(data.redirectUrl || (isAmb ? '/ambulance' : '/hospital'));
      router.refresh();
    } catch {
      setErrorMessage('Network error connecting to Jyva authorization server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ebf7f3] flex flex-col justify-between selection:bg-[#0f5146] selection:text-white p-4 md:p-6 lg:p-8 font-sans antialiased text-[#132a24]">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-4 px-4 md:px-8 mb-2">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-full bg-[#0f5146] flex items-center justify-center shadow-[0_4px_12px_rgba(15,81,70,0.18)]">
            {/* Geometric J / Medical Lifeline */}
            <svg
              className="w-6 h-6 text-[#64f9bc]"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path d="M11 2v4a2 2 0 0 1-2 2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2" />
              <path d="M8 12h3l1.5-4 3 8 2-4h3.5" strokeWidth="2.2" />
              <circle cx="20" cy="6" fill="currentColor" r="2" stroke="none" />
            </svg>
          </div>
          <div className="flex items-baseline space-x-2.5">
            <span className="text-2xl font-black tracking-tight text-[#132a24]">JYVA</span>
            <span className="text-[11px] font-semibold text-[#547169] tracking-wider uppercase hidden sm:inline">
              Emergency Coordination Portal
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-[#0f5146] bg-white border border-[#e2efe8] px-3.5 py-1.5 rounded-full shadow-[0_2px_6px_rgba(15,81,70,0.04)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Demo System Active</span>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-center my-auto px-4 md:px-8 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Hero & Telemetry Preview */}
          <section className="lg:col-span-7 flex flex-col justify-center space-y-7">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#132a24] tracking-tight leading-[1.12]">
                Clear roads. Ready hospitals.{' '}
                <br className="hidden sm:block" />
                <span className="text-[#0f5146] underline decoration-[#a6d8c8] decoration-2 underline-offset-4">
                  Every minute counts.
                </span>
              </h1>
              <p className="text-[#537068] text-base sm:text-lg leading-relaxed max-w-xl font-normal pt-1">
                Find the fastest route, choose the hospital with the shortest wait, and alert it before you arrive.
              </p>
            </div>

            {/* Tactical Corridors Vector Simulation Card */}
            <div className="bg-[#0b1a18] text-white rounded-3xl p-6 sm:p-8 shadow-[0_16px_36px_rgba(11,26,24,0.22)] border border-[#173832] relative overflow-hidden flex flex-col justify-between min-h-[240px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#45dfa4] animate-pulse" />
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-teal-200/80">
                    Live Navigation Preview
                  </span>
                </div>
                <span className="text-xs font-mono text-[#45dfa4] bg-[#45dfa4]/10 border border-[#45dfa4]/30 px-3 py-1 rounded-full font-semibold">
                  Optimal Pathway
                </span>
              </div>

              <div className="relative py-6 my-auto">
                <svg className="w-full h-20" fill="none" viewBox="0 0 460 70">
                  <path
                    d="M 30 45 C 130 5, 200 65, 300 25 C 360 0, 390 35, 420 20"
                    stroke="#183630"
                    strokeLinecap="round"
                    strokeWidth="6"
                  />
                  <path
                    d="M 30 45 C 130 5, 200 65, 300 25 C 360 0, 390 35, 420 20"
                    stroke="url(#routeGradient)"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#45dfa4" />
                      <stop offset="60%" stopColor="#2dd4bf" />
                      <stop offset="100%" stopColor="#45dfa4" />
                    </linearGradient>
                  </defs>
                  <circle className="animate-pulse" cx="30" cy="45" fill="#45dfa4" r="8" />
                  <circle cx="30" cy="45" fill="#ffffff" r="4" />
                  <g transform="translate(408, 4)">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"
                      fill="#f43f5e"
                    />
                  </g>
                </svg>

                <div className="flex items-center justify-between text-xs font-mono mt-1">
                  <div className="flex items-center space-x-1.5 text-teal-100/80">
                    <span className="w-2 h-2 rounded-full bg-[#45dfa4]" />
                    <span className="font-medium">Ambulance en route</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="font-medium">Hospital Emergency (Sion)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: The Login Card */}
          <section className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-7 sm:p-9 lg:p-10 shadow-[0_4px_24px_rgba(15,81,70,0.05)] border border-[#e2efe8] relative">
              {/* Tab Segmented Control */}
              <div className="w-full p-1 bg-[#eef6f2] rounded-full flex items-center justify-between mb-7 border border-[#e2efe8]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ambulance');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2.5 rounded-full font-semibold text-xs sm:text-sm tracking-tight transition-all duration-200 flex items-center justify-center space-x-2 ${
                    activeTab === 'ambulance'
                      ? 'bg-white text-[#132a24] shadow-[0_2px_6px_rgba(15,81,70,0.06)]'
                      : 'text-[#537068] hover:text-[#132a24]'
                  }`}
                >
                  <Ambulance className={`w-4 h-4 ${activeTab === 'ambulance' ? 'text-[#0f5146]' : 'text-[#537068]'}`} />
                  <span>Ambulance Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('hospital');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2.5 rounded-full font-semibold text-xs sm:text-sm tracking-tight transition-all duration-200 flex items-center justify-center space-x-2 ${
                    activeTab === 'hospital'
                      ? 'bg-white text-[#132a24] shadow-[0_2px_6px_rgba(15,81,70,0.06)]'
                      : 'text-[#537068] hover:text-[#132a24]'
                  }`}
                >
                  <Building2 className={`w-4 h-4 ${activeTab === 'hospital' ? 'text-[#0f5146]' : 'text-[#537068]'}`} />
                  <span>Hospital Login</span>
                </button>
              </div>

              {/* Error Alert Banner */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Ambulance Tab Pane */}
              {activeTab === 'ambulance' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-[#132a24] tracking-tight">Paramedic Crew Access</h2>
                    <p className="text-xs text-[#537068] mt-0.5">Secure beacon pairing &amp; mobile corridor transmitter</p>
                  </div>

                  <form className="space-y-4" onSubmit={handleLogin}>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#537068] mb-1.5" htmlFor="amb-id">
                        Ambulance ID or Plate Number
                      </label>
                      <div className="relative rounded-2xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#537068]">
                          <Ambulance className="w-4 h-4" />
                        </div>
                        <input
                          id="amb-id"
                          type="text"
                          value={ambId}
                          onChange={(e) => setAmbId(e.target.value)}
                          placeholder="e.g. AMB-014"
                          required
                          className="block w-full pl-11 pr-4 py-3 bg-[#f7fcf9] border border-[#d6e8df] rounded-full text-[#132a24] font-mono text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#0f5146]/20 focus:border-[#0f5146] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#537068] mb-1.5" htmlFor="amb-pin">
                        Crew Access PIN
                      </label>
                      <div className="relative rounded-2xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#537068]">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="amb-pin"
                          type={showAmbPin ? 'text' : 'password'}
                          value={ambPin}
                          onChange={(e) => setAmbPin(e.target.value)}
                          placeholder="••••"
                          required
                          className="block w-full pl-11 pr-11 py-3 bg-[#f7fcf9] border border-[#d6e8df] rounded-full text-[#132a24] font-mono tracking-widest text-sm focus:bg-white focus:ring-2 focus:ring-[#0f5146]/20 focus:border-[#0f5146] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAmbPin(!showAmbPin)}
                          aria-label="Toggle PIN visibility"
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#537068] hover:text-[#132a24]"
                        >
                          {showAmbPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#537068] mt-1.5 flex items-center space-x-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#0f5146] shrink-0" />
                        <span>Sign in with your ambulance ID and crew PIN.</span>
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-6 bg-[#0f5146] hover:bg-[#0c4239] disabled:opacity-60 text-white font-medium text-sm rounded-full shadow-[0_2px_8px_rgba(15,81,70,0.18)] flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
                      >
                        <span>{isLoading ? 'Signing in...' : 'Log in as Ambulance'}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-200" />
                      </button>
                    </div>
                  </form>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={fillDemoAmbulance}
                      className="inline-block px-5 py-2 text-xs font-semibold text-[#0f5146] bg-white hover:bg-[#ebf7f3] border border-[#d2e5dc] rounded-full transition-colors shadow-sm"
                    >
                      Use demo account (AMB-014 / 1234)
                    </button>
                  </div>
                </div>
              )}

              {/* Hospital Tab Pane */}
              {activeTab === 'hospital' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-[#132a24] tracking-tight">ER Command Center</h2>
                    <p className="text-xs text-[#537068] mt-0.5">Triage charge nurse &amp; trauma team live dashboard</p>
                  </div>

                  <form className="space-y-4" onSubmit={handleLogin}>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#537068] mb-1.5" htmlFor="hosp-id">
                        Hospital Identifier
                      </label>
                      <div className="relative rounded-2xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#537068]">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <input
                          id="hosp-id"
                          type="text"
                          value={hospId}
                          onChange={(e) => setHospId(e.target.value)}
                          placeholder="e.g. HOSP-SION"
                          required
                          className="block w-full pl-11 pr-4 py-3 bg-[#f7fcf9] border border-[#d6e8df] rounded-full text-[#132a24] font-mono text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#0f5146]/20 focus:border-[#0f5146] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#537068] mb-1.5" htmlFor="hosp-pass">
                        ER Staff Password
                      </label>
                      <div className="relative rounded-2xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#537068]">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="hosp-pass"
                          type={showHospPass ? 'text' : 'password'}
                          value={hospPass}
                          onChange={(e) => setHospPass(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="block w-full pl-11 pr-11 py-3 bg-[#f7fcf9] border border-[#d6e8df] rounded-full text-[#132a24] font-mono tracking-widest text-sm focus:bg-white focus:ring-2 focus:ring-[#0f5146]/20 focus:border-[#0f5146] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowHospPass(!showHospPass)}
                          aria-label="Toggle password visibility"
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#537068] hover:text-[#132a24]"
                        >
                          {showHospPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#537068] mt-1.5 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0f5146] shrink-0" />
                        <span>Sign in with your hospital ID and staff password.</span>
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-6 bg-[#0f5146] hover:bg-[#0c4239] disabled:opacity-60 text-white font-medium text-sm rounded-full shadow-[0_2px_8px_rgba(15,81,70,0.18)] flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
                      >
                        <span>{isLoading ? 'Signing in...' : 'Log in as Hospital'}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-200" />
                      </button>
                    </div>
                  </form>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={fillDemoHospital}
                      className="inline-block px-5 py-2 text-xs font-semibold text-[#0f5146] bg-white hover:bg-[#ebf7f3] border border-[#d2e5dc] rounded-full transition-colors shadow-sm"
                    >
                      Use demo account (HOSP-SION / demo123)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* System Highlights Section */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#e2efe8] rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,81,70,0.03)] flex items-start space-x-4 hover:border-[#a6d8c8] transition-colors">
            <div className="h-10 w-10 rounded-full bg-[#e3f4ec] flex-shrink-0 flex items-center justify-center text-[#0f5146]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#132a24] uppercase tracking-wider">Fastest route</h3>
              <p className="text-xs text-[#537068] mt-0.5 leading-snug">Traffic-aware routing with automatic re-routing.</p>
            </div>
          </div>

          <div className="bg-white border border-[#e2efe8] rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,81,70,0.03)] flex items-start space-x-4 hover:border-[#a6d8c8] transition-colors">
            <div className="h-10 w-10 rounded-full bg-[#e3f4ec] flex-shrink-0 flex items-center justify-center text-[#0f5146]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#132a24] uppercase tracking-wider">Best hospital</h3>
              <p className="text-xs text-[#537068] mt-0.5 leading-snug">Ranked by travel time plus waiting time.</p>
            </div>
          </div>

          <div className="bg-white border border-[#e2efe8] rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,81,70,0.03)] flex items-start space-x-4 hover:border-[#a6d8c8] transition-colors">
            <div className="h-10 w-10 rounded-full bg-[#e3f4ec] flex-shrink-0 flex items-center justify-center text-[#0f5146]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#132a24] uppercase tracking-wider">Early alert</h3>
              <p className="text-xs text-[#537068] mt-0.5 leading-snug">Patient priority sent to the hospital before arrival.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto pt-8 pb-4 text-center text-xs text-[#537068] border-t border-[#d8ebe2] mt-8 px-4 md:px-8">
        <p className="font-normal">Demo data, not medical advice</p>
      </footer>
    </div>
  );
}
