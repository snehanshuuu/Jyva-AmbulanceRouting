'use client';

import React, { useEffect, Suspense } from 'react';
import { useJyvaStore } from '@/store/useJyvaStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tick = useJyvaStore((s) => s.tick);
  const isSimRunning = useJyvaStore((s) => s.isSimRunning);

  // Background simulation clock ticker
  useEffect(() => {
    if (!isSimRunning) return;

    const interval = setInterval(() => {
      tick(1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimRunning, tick]);

  return (
    <div className="h-screen h-[100dvh] w-full overflow-hidden bg-[#ebf7f3] text-[#132a24] flex flex-col font-sans selection:bg-[#0f5146] selection:text-white">
      <main className="flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col">
        <Suspense fallback={<div className="p-8 text-center text-[#547169] text-xs font-mono">Loading dashboard...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
