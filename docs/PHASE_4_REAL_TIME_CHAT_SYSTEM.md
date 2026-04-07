# Phase 4 Documentation - Real-Time Chat System

## 1. Objective

Phase 4 introduces a real-time one-to-one communication system into the GeoSpatial Intelligence Dashboard. The goal of this phase is to let users exchange messages instantly inside the same operational workspace while ensuring those messages are persisted for reload and later retrieval.

This phase adds the first live collaboration capability to the platform.

## 2. Chat System Overview

The Phase 4 chat module now supports:

- one-to-one messaging
- real-time delivery through Socket.io
- message persistence in MongoDB
- support-ready schema for text, image, and file messages
- chat user list and active conversation switching

This creates the foundation for broader collaboration features in later phases.

## 3. Technology Used

Phase 4 uses:

- Socket.io for real-time communication
- Socket.io Client for browser connectivity
- MongoDB with Mongoose for message persistence
- Next.js App Router for the main application shell
- Next.js route handlers for message and user APIs
- Zustand for active chat and socket-related state

## 4. Socket Architecture

A custom Next.js server was introduced in `server.js` so Socket.io can run alongside the dashboard application.

### Socket flow

```text
User opens dashboard
   ->
Socket connection established
   ->
User joins private room by user id
   ->
Message sent from chat UI
   ->
Server stores message in MongoDB
   ->
Server emits message to sender and receiver rooms
   ->
Receiver UI updates instantly
```

This architecture keeps the realtime path and persistence path aligned.

## 5. Socket Setup

### Server-side

Implemented in `server.js`.

Responsibilities:

- initialize the Next.js app
- create the HTTP server
- attach Socket.io
- listen for connection and join events
- save outgoing messages to MongoDB
- emit `receive_message` events to the correct participants

### Client-side

Implemented in `lib/socket-client.js`.

Responsibilities:

- create a browser-side socket singleton
- connect using the shared `/socket.io` path
- reuse the same socket instance across the chat UI

## 6. Message Flow

### Sending Message

1. User types a message in the chat input.
2. The client emits `send_message`.
3. The server receives the payload.
4. The message is stored in MongoDB.
5. The server emits `receive_message` to both users.
6. The UI updates instantly.

### Receiving Message

1. The connected client listens for `receive_message`.
2. The message is mapped to the correct direct conversation.
3. Zustand updates the active chat state.
4. The message appears without a page refresh.

## 7. Database Design

The `Message` model was extended in `models/Message.js`.

### Structure

```json
{
  "senderId": "analyst-1",
  "receiverId": "analyst-2",
  "message": "Hello",
  "type": "text",
  "fileUrl": null,
  "fileName": null,
  "createdAt": "timestamp"
}
```

### Supported message types

- text
- image
- file

Phase 4 UI focuses on text messaging, while the schema is already prepared for media expansion in Phase 5.

## 8. API Layer

### Message API

Implemented in `app/api/messages/route.js`.

Supports:

- `GET` to load message history between two users
- `POST` to save a message through HTTP if needed

### User API

Implemented in `app/api/users/route.js`.

Provides:

- a direct chat user list
- role and status metadata for the chat sidebar

### Service Layer

Implemented in `services/messageService.js`.

Responsibilities:

- load conversation history from MongoDB
- create new persistent message records
- normalize response objects for the UI

## 9. Chat UI Design

A dedicated chat component was added in `components/chat/ChatBox.js`.

### Features

- user list for direct conversations
- active message window
- message timestamps
- input field
- send button
- socket connection status indicator

The component is integrated directly into the dashboard so communication and analytics remain in the same workspace.

## 10. State Management

The Zustand store in `store/appStore.js` now manages:

- current user id
- active chat id
- available chat users
- messages grouped by conversation
- socket connection state
- viewport and analytics state from earlier phases

This keeps collaboration and dashboard state inside one shared store without breaking the GIS workflow.

## 11. Message Persistence

All live messages are stored through MongoDB before being emitted back to clients.

Benefits:

- conversation history survives reloads
- messages can be fetched by API when a chat is opened
- the UI does not rely only on in-memory realtime state
- later group-chat and media features can build on the same persistence layer

## 12. Dashboard Integration

Phase 4 integrates the chat module into the main dashboard page.

Implemented in `app/dashboard/page.js`.

This means the application now combines:

- geospatial analytics
- viewport-driven visualization
- internal real-time communication

inside a single operational screen.

## 13. Output of Phase 4

At the end of Phase 4, the system now provides:

- real-time one-to-one chat
- Socket.io-based communication
- MongoDB-backed message persistence
- chat history loading through APIs
- responsive direct-message UI inside the dashboard

## 14. Files Added or Updated

### Added

- `server.js`
- `lib/socket-client.js`
- `services/messageService.js`
- `app/api/messages/route.js`
- `app/api/users/route.js`
- `components/chat/ChatBox.js`
- `docs/PHASE_4_REAL_TIME_CHAT_SYSTEM.md`

### Updated

- `models/Message.js`
- `store/appStore.js`
- `lib/api.js`
- `app/dashboard/page.js`
- `package.json`

## 15. What Phase 4 Does Not Yet Complete

Phase 4 establishes direct realtime messaging, but it does not yet include:

- group chat
- file upload handling in the chat UI
- image previews
- media storage pipeline
- WebRTC calling

These belong to the next collaboration phases.

## 16. Next Phase

Phase 5 should focus on:

- group chat functionality
- file and image sharing
- attachment metadata and upload handling
- richer communication workflows inside the dashboard
