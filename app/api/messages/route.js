import { createApiResponse } from '@/utils/apiResponse';
import { createMessage, getConversationMessages } from '@/services/messageService';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const peerId = searchParams.get('peerId');

  if (!userId || !peerId) {
    return Response.json(
      {
        success: false,
        message: 'userId and peerId are required.',
      },
      { status: 400 }
    );
  }

  const messages = await getConversationMessages(userId, peerId);

  return Response.json(createApiResponse(messages, 'Messages loaded successfully.'));
}

export async function POST(req) {
  const body = await req.json();

  if (!body.senderId || !body.receiverId || !body.message) {
    return Response.json(
      {
        success: false,
        message: 'senderId, receiverId, and message are required.',
      },
      { status: 400 }
    );
  }

  const message = await createMessage(body);
  return Response.json(createApiResponse(message, 'Message saved successfully.'), { status: 201 });
}
