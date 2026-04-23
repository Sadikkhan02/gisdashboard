import { NextResponse } from 'next/server';
import { decisionEngine } from '@/services/decisionEngine';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const minLat = parseFloat(searchParams.get('minLat'));
    const minLng = parseFloat(searchParams.get('minLng'));
    const maxLat = parseFloat(searchParams.get('maxLat'));
    const maxLng = parseFloat(searchParams.get('maxLng'));
    const priority = searchParams.get('priority') || 'growth';

    if (isNaN(minLat) || isNaN(minLng) || isNaN(maxLat) || isNaN(maxLng)) {
      return NextResponse.json({ error: 'Invalid bounding box parameters' }, { status: 400 });
    }

    const bbox = { minLat, minLng, maxLat, maxLng };
    
    // Extract custom weights if provided
    const weights = {
      safety: parseFloat(searchParams.get('w_safety')) || undefined,
      density: parseFloat(searchParams.get('w_density')) || undefined,
      growth: parseFloat(searchParams.get('w_growth')) || undefined,
      connectivity: parseFloat(searchParams.get('w_connectivity')) || undefined
    };

    // Filter out undefined weights
    const filteredWeights = Object.fromEntries(
      Object.entries(weights).filter(([_, v]) => v !== undefined)
    );

    const analysis = await decisionEngine.analyzeArea(bbox, priority, filteredWeights);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Decision Engine API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
