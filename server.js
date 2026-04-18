const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true, trim: true },
    senderName: { type: String, default: '', trim: true },
    receiverId: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['text', 'image', 'file', 'call'], default: 'text' },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
const groupSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    members: { type: [String], default: [] },
    createdBy: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  }
);
const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);
const liveGroups = new Map();
const activeCalls = new Map();

const testUsers = [
  { id: 'analyst-1', name: 'Asha Rao', role: 'Lead Analyst', status: 'online', type: 'user' },
  { id: 'analyst-2', name: 'Vikram Shah', role: 'Field Coordinator', status: 'online', type: 'user' },
  { id: 'analyst-3', name: 'Meera Iyer', role: 'Operations Desk', status: 'away', type: 'user' },
];

function memberDetailsFor(memberIds) {
  return memberIds.map((memberId) => testUsers.find((user) => user.id === memberId)).filter(Boolean);
}

function normalizeGroupName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48);
}

async function connectMongo() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable.');
  }

  return mongoose.connect(uri, {
    bufferCommands: false,
    dbName: process.env.MONGODB_DB || undefined,
  });
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  function emitToUser(userId, eventName, payload) {
    if (!userId) {
      return;
    }

    io.to(`user:${userId}`).emit(eventName, payload);
  }

  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      if (!userId) {
        return;
      }

      socket.data.userId = userId;
      socket.join(`user:${userId}`);
      socket.join('group:group-command');
      socket.join('group:group-field');

      for (const group of liveGroups.values()) {
        if (group.members.includes(userId)) {
          socket.join(`group:${group.id}`);
        }
      }
    });

    socket.on('join_group', (groupId) => {
      if (!groupId) {
        return;
      }

      socket.join(`group:${groupId}`);
    });

    socket.on('create_group', async (payload = {}) => {
      const name = normalizeGroupName(payload.name);
      const creatorId = payload.creatorId || socket.data.userId;
      const members = Array.from(new Set([creatorId, ...(payload.members || [])].filter(Boolean)));

      if (!name || !creatorId || members.length < 2) {
        socket.emit('chat_error', {
          message: 'Create a group with a name and at least two members.',
        });
        return;
      }

      const group = {
        id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        role: 'Group chat',
        status: 'online',
        type: 'group',
        description: `${members.length} members`,
        members,
        memberDetails: memberDetailsFor(members),
        createdBy: creatorId,
        createdAt: new Date().toISOString(),
      };

      liveGroups.set(group.id, group);
      socket.join(`group:${group.id}`);

      try {
        await connectMongo();
        await Group.findOneAndUpdate(
          { groupId: group.id },
          {
            groupId: group.id,
            name: group.name,
            description: group.description,
            members: group.members,
            createdBy: group.createdBy,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (error) {
        socket.emit('chat_error', {
          message: 'Group created for active users, but it could not be saved for reload.',
          error: error.message,
        });
      }

      for (const memberId of members) {
        io.to(`user:${memberId}`).emit('group_created', group);
      }
    });

    socket.on('send_message', async (payload) => {
      try {
        await connectMongo();

        const created = await Message.create({
          senderId: payload.senderId,
          senderName: payload.senderName || '',
          receiverId: payload.receiverId,
          message: payload.message,
          type: payload.type || 'text',
          fileUrl: payload.fileUrl || null,
          fileName: payload.fileName || null,
        });

        const outgoing = {
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

        if (created.receiverId.startsWith('group-')) {
          io.to(`group:${created.receiverId}`).emit('receive_message', outgoing);
        } else {
          io.to(`user:${created.senderId}`).to(`user:${created.receiverId}`).emit('receive_message', outgoing);
        }
      } catch (error) {
        socket.emit('chat_error', {
          message: 'Unable to send message.',
          error: error.message,
        });
      }
    });

    socket.on('start_call', (payload = {}) => {
      const call = {
        callId: payload.callId,
        fromUserId: payload.fromUserId || socket.data.userId,
        fromName: payload.fromName || 'Team member',
        targetId: payload.targetId,
        targetName: payload.targetName || 'Direct chat',
        createdAt: new Date().toISOString(),
      };

      if (!call.callId || !call.fromUserId || !call.targetId) {
        socket.emit('call_error', { message: 'Unable to start call.' });
        return;
      }

      socket.join(`call:${call.callId}`);
      emitToUser(call.targetId, 'incoming_call', call);
    });

    socket.on('start_group_call', (payload = {}) => {
      const call = {
        callId: payload.callId,
        groupId: payload.groupId,
        groupName: payload.groupName || 'Group call',
        fromUserId: payload.fromUserId || socket.data.userId,
        fromName: payload.fromName || 'Team member',
        type: 'group',
        createdAt: new Date().toISOString(),
      };

      if (!call.callId || !call.groupId || !call.fromUserId) {
        socket.emit('call_error', { message: 'Unable to start group call.' });
        return;
      }

      activeCalls.set(call.callId, {
        ...call,
        participants: new Map([[call.fromUserId, { userId: call.fromUserId, name: call.fromName }]]),
      });

      socket.join(`call:${call.callId}`);
      socket.to(`group:${call.groupId}`).emit('incoming_group_call', call);
    });

    socket.on('accept_group_call', (payload = {}) => {
      const call = activeCalls.get(payload.callId);
      const userId = payload.fromUserId || socket.data.userId;

      if (!call || !userId) {
        socket.emit('call_error', { message: 'This group call is no longer active.' });
        return;
      }

      const existingParticipants = Array.from(call.participants.values()).filter(
        (participant) => participant.userId !== userId
      );

      socket.join(`call:${payload.callId}`);
      call.participants.set(userId, {
        userId,
        name: payload.fromName || 'Team member',
      });

      socket.emit('group_call_participants', {
        callId: payload.callId,
        participants: existingParticipants,
      });

      socket.to(`call:${payload.callId}`).emit('group_call_participant_joined', {
        callId: payload.callId,
        userId,
        name: payload.fromName || 'Team member',
      });
    });

    socket.on('accept_call', (payload = {}) => {
      if (!payload.callId || !payload.fromUserId || !payload.toUserId) {
        socket.emit('call_error', { message: 'Unable to accept call.' });
        return;
      }

      socket.join(`call:${payload.callId}`);
      emitToUser(payload.toUserId, 'call_accepted', {
        callId: payload.callId,
        fromUserId: payload.fromUserId,
        fromName: payload.fromName || 'Team member',
      });
    });

    socket.on('reject_call', (payload = {}) => {
      emitToUser(payload.toUserId, 'call_rejected', {
        callId: payload.callId,
        fromUserId: payload.fromUserId || socket.data.userId,
      });
    });

    socket.on('webrtc_offer', (payload = {}) => {
      emitToUser(payload.toUserId, 'webrtc_offer', payload);
    });

    socket.on('webrtc_answer', (payload = {}) => {
      emitToUser(payload.toUserId, 'webrtc_answer', payload);
    });

    socket.on('webrtc_ice_candidate', (payload = {}) => {
      emitToUser(payload.toUserId, 'webrtc_ice_candidate', payload);
    });

    socket.on('end_call', (payload = {}) => {
      if (payload.type === 'group') {
        const call = activeCalls.get(payload.callId);
        const userId = payload.fromUserId || socket.data.userId;

        if (call && userId) {
          call.participants.delete(userId);
          socket.to(`call:${payload.callId}`).emit('group_call_participant_left', {
            callId: payload.callId,
            userId,
          });

          if (call.participants.size === 0) {
            activeCalls.delete(payload.callId);
          }
        }

        socket.leave(`call:${payload.callId}`);
        return;
      }

      emitToUser(payload.toUserId, 'call_ended', {
        callId: payload.callId,
        fromUserId: payload.fromUserId || socket.data.userId,
      });

      socket.leave(`call:${payload.callId}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
