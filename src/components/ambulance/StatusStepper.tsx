'use client';

import React from 'react';
import { TripStatus } from '@/lib/types';
import { Check } from 'lucide-react';

interface StatusStepperProps {
  status: TripStatus;
}

export function StatusStepper({ status }: StatusStepperProps) {
  // Mapping of 4-step sequence
  // 1: Sent (ALERT_SENT, ACKNOWLEDGED, HOSPITAL_READY, ARRIVED)
  // 2: Acknowledged (ACKNOWLEDGED, HOSPITAL_READY, ARRIVED)
  // 3: Ready (HOSPITAL_READY, ARRIVED)
  // 4: Arrived (ARRIVED)

  const steps = [
    { key: 'sent', label: 'Sent', order: 1 },
    { key: 'ack', label: 'Acknowledged', order: 2 },
    { key: 'ready', label: 'Ready', order: 3 },
    { key: 'arrived', label: 'Arrived', order: 4 },
  ];

  let currentStep = 0;
  if (status === 'ALERT_SENT') currentStep = 1;
  else if (status === 'ACKNOWLEDGED') currentStep = 2;
  else if (status === 'HOSPITAL_READY') currentStep = 3;
  else if (status === 'ARRIVED') currentStep = 4;

  return (
    <div
      className="grid grid-cols-4 gap-2 mt-3 text-center text-xs font-semibold"
      data-purpose="transmission-stepper"
    >
      {steps.map((step) => {
        const isCompleted = currentStep > step.order;
        const isActive = currentStep === step.order;

        if (isCompleted || (isActive && step.order === 4)) {
          // Completed style
          return (
            <div
              key={step.key}
              className="bg-[#c6f3e3] text-[#0a4239] py-2 px-1 rounded-full border border-[#a6e6cf] flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-[#0f5146]" strokeWidth={3} />
              <span>{step.label}</span>
            </div>
          );
        }

        if (isActive) {
          // Active / In Progress style
          return (
            <div
              key={step.key}
              className="bg-[#fef3c7] text-[#92400e] py-2 px-1 rounded-full border border-[#fde68a] flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse"></span>
              <span>{step.label}</span>
            </div>
          );
        }

        // Pending style
        return (
          <div
            key={step.key}
            className="bg-[#f0f7f4] text-[#547169] py-2 px-1 rounded-full border border-[#d9ebe2] flex items-center justify-center gap-1.5"
          >
            <span className="text-[#547169]/50 text-xs">○</span>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default StatusStepper;
