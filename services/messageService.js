import Message from '@/models/Message';
import { dbConnect } from '@/lib/mongodb';

export async function getConversationMessages(userId, peerId) {
  await dbConnect();

  const query = peerId.startsWith('group-')
    ? { receiverId: peerId }
    : {
        $or: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      };

  const messages = await Message.find(query)
    .sort({ createdAt: 1 })
    .lean();

  return messages.map((message) => ({
    id: message._id.toString(),
    senderId: message.senderId,
    senderName: message.senderName || '',
    receiverId: message.receiverId,
    message: message.message,
    type: message.type,
    fileUrl: message.fileUrl || null,
    fileName: message.fileName || null,
    createdAt: message.createdAt,
  }));
}

export async function createMessage(payload) {
  await dbConnect();

  const created = await Message.create({
    senderId: payload.senderId,
    senderName: payload.senderName || '',
    receiverId: payload.receiverId,
    message: payload.message,
    type: payload.type || 'text',
    fileUrl: payload.fileUrl || null,
    fileName: payload.fileName || null,
  });

  return {
    id: created._id.toString(),
    senderId: created.senderId,
    senderName: created.senderName || '',
    receiverId: created.receiverId,
    message: created.message,
    type: created.type,
    fileUrl: created.fileUrl,
    fileName: created.fileName,
    createdAt: created.createdAt,
  };
}
