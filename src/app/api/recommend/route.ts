import { NextRequest, NextResponse } from 'next/server';
import { rankHospitals } from '@/engine/recommend/rank';
import defaultHospitals from '@/data/hospitals.json';
import { Hospital, LatLng } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { origin, incidentType, priority } = body;

    if (!origin || !origin.lat || !origin.lng) {
      return NextResponse.json(
        { error: 'origin with lat and lng coordinates is required' },
        { status: 400 }
      );
    }

    const hospitals = defaultHospitals as unknown as Hospital[];
    const ranked = rankHospitals(
      hospitals,
      origin as LatLng,
      {
        caseType: incidentType,
        priority:
          priority === 'CRITICAL' || priority === 'P1'
            ? 'CRITICAL'
            : priority === 'URGENT' || priority === 'P2' || priority === 'P3'
              ? 'URGENT'
              : 'STABLE',
      }
    );

    return NextResponse.json({
      recommendations: ranked,
      topHospital: ranked[0] || null,
      alternate: ranked[1] || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error ranking hospitals';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
