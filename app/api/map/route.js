import { createApiResponse } from '@/utils/apiResponse';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region');
  const range = searchParams.get('range');

  return Response.json(
    createApiResponse(
      {
        markers: [
          { id: 1, position: { lat: 20.5937, lng: 78.9629 } },
        ],
        heatmapPoints: [
          { lat: 20.5937, lng: 78.9629, weight: 10 },
        ],
      },
      'Phase 1 placeholder map response.',
      { region, range }
    )
  );
}
