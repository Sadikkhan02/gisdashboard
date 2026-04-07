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
    receiverId: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

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

  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      if (!userId) {
        return;
      }

      socket.join(`user:${userId}`);
    });

    socket.on('send_message', async (payload) => {
      try {
        await connectMongo();

        const created = await Message.create({
          senderId: payload.senderId,
          receiverId: payload.receiverId,
          message: payload.message,
          type: payload.type || 'text',
          fileUrl: payload.fileUrl || null,
          fileName: payload.fileName || null,
        });

        const outgoing = {
          id: created._id.toString(),
          senderId: created.senderId,
          receiverId: created.receiverId,
          message: created.message,
          type: created.type,
          fileUrl: created.fileUrl,
          fileName: created.fileName,
          createdAt: created.createdAt,
        };

        io.to(`user:${created.senderId}`).to(`user:${created.receiverId}`).emit('receive_message', outgoing);
      } catch (error) {
        socket.emit('chat_error', {
          message: 'Unable to send message.',
          error: error.message,
        });
      }
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
