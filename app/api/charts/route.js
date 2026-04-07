import { createApiResponse } from '@/utils/apiResponse';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region');
  const range = searchParams.get('range');

  return Response.json(
    createApiResponse(
      {
        trend: [
          { date: '2024-01', incidents: 120, average: 110 },
          { date: '2024-02', incidents: 132, average: 115 },
        ],
        hourly: [
          { hour: '00', count: 5 },
          { hour: '02', count: 3 },
        ],
        categories: [
          { category: 'Theft', count: 45 },
          { category: 'Assault', count: 30 },
          { category: 'Fraud', count: 25 },
        ],
      },
      'Phase 1 placeholder charts response.',
      { region, range }
    )
  );
}
