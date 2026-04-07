import { createApiResponse } from '@/utils/apiResponse';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region');
  const range = searchParams.get('range');

  return Response.json(
    createApiResponse(
      {
        events: [
          { id: 1, title: 'Accident on Highway', timestamp: '2 min ago', location: 'Sector 12', severity: 'high' },
          { id: 2, title: 'Protest rally', timestamp: '15 min ago', location: 'City Center', severity: 'medium' },
          { id: 3, title: 'Power outage', timestamp: '1 hour ago', location: 'Industrial Area', severity: 'low' },
        ],
      },
      'Phase 1 placeholder feed response.',
      { region, range }
    )
  );
}
