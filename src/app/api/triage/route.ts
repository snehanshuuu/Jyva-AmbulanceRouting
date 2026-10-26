import { NextRequest, NextResponse } from 'next/server';
import { calculateTriageScore } from '@/engine/triage/score';
import { calculateVitalsTrend } from '@/engine/triage/trend';
import { Vitals, AgeBand } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vitals, complaint, ageBand, vitalsHistory } = body;

    if (!vitals) {
      return NextResponse.json(
        { error: 'vitals object is required' },
        { status: 400 }
      );
    }

    const triage = calculateTriageScore(
      vitals as Vitals,
      (complaint as string) || '',
      (ageBand as AgeBand) || 'ADULT'
    );

    let trend = null;
    if (Array.isArray(vitalsHistory) && vitalsHistory.length > 0) {
      trend = calculateVitalsTrend(vitalsHistory, complaint, ageBand);
    }

    return NextResponse.json({
      ...triage,
      trend: trend ? trend.trend : 'STABLE',
      trendDetails: trend,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error computing triage';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
