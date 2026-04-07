import { dbConnect } from '@/lib/mongodb';
import { createApiResponse } from '@/utils/apiResponse';

export async function GET() {
  try {
    const connection = await dbConnect();

    return Response.json(
      createApiResponse(
        {
          database: 'mongodb',
          readyState: connection.connection.readyState,
        },
        'Database connection successful.'
      )
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'Database connection failed.',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
