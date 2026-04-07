import { createApiResponse } from '@/utils/apiResponse';

const users = [
  { id: 'analyst-1', name: 'Asha Rao', role: 'Lead Analyst', status: 'online' },
  { id: 'analyst-2', name: 'Vikram Shah', role: 'Field Coordinator', status: 'online' },
  { id: 'analyst-3', name: 'Meera Iyer', role: 'Operations Desk', status: 'away' },
  { id: 'analyst-4', name: 'Rohan Patel', role: 'Risk Monitor', status: 'offline' }
];

export async function GET() {
  return Response.json(createApiResponse(users, 'Chat users loaded successfully.'));
}
