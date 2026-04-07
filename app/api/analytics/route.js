import { createApiResponse } from '@/utils/apiResponse';
import { getAnalyticsByViewport } from '@/services/analyticsService';

function parseBounds(searchParams) {
  const north = Number(searchParams.get('north'));
  const south = Number(searchParams.get('south'));
  const east = Number(searchParams.get('east'));
  const west = Number(searchParams.get('west'));

  if ([north, south, east, west].some((value) => Number.isNaN(value))) {
    return null;
  }

  return { north, south, east, west };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const bounds = parseBounds(searchParams);
  const region = searchParams.get('region');
  const range = searchParams.get('range');

  if (!bounds) {
    return Response.json(
      {
        success: false,
        message: 'Viewport bounds are required.',
      },
      { status: 400 }
    );
  }

  const analytics = await getAnalyticsByViewport(bounds);

  return Response.json(
    createApiResponse(analytics, 'Viewport analytics loaded successfully.', {
      region,
      range,
      ...bounds,
    })
  );
}
