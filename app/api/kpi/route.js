import { createApiResponse } from '@/utils/apiResponse';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region');
  const range = searchParams.get('range');

  return Response.json(
    createApiResponse(
      {
        totalIncidents: '1,234',
        totalIncidentsChange: 12,
        highSeverity: '98',
        highSeverityChange: 5,
        riskScore: '67',
        riskScoreChange: 3,
        geoCoverage: '78%',
        geoCoverageChange: 2,
      },
      'Phase 1 placeholder KPI response.',
      { region, range }
    )
  );
}
