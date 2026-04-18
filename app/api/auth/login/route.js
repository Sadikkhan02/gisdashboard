import { findDemoUser, publicUser } from '@/lib/demoUsers';
import { createApiResponse } from '@/utils/apiResponse';

export async function POST(req) {
  const body = await req.json();
  const email = String(body.email || '').trim();
  const password = String(body.password || '');
  const user = findDemoUser(email, password);

  if (!user) {
    return Response.json(
      {
        success: false,
        message: 'Invalid demo credentials.',
      },
      { status: 401 }
    );
  }

  return Response.json(createApiResponse(publicUser(user), 'Login successful.'));
}
