# Phase 6 Documentation - Video Calling & Meeting System (WebRTC)

## 1. Objective

The objective of Phase 6 is to implement real-time video communication between users using WebRTC technology. This phase enables users to conduct meetings, collaborate visually, and discuss GIS data directly within the platform.

This completes the communication system by adding live interaction capabilities.

---

## 2. Video Calling Overview

The system supports:
- **One-to-one video calls**: Direct face-to-face communication.
- **Basic meeting functionality**: Dedicated meeting views within the dashboard.
- **Real-time audio and video streaming**: Low-latency communication.
- **Peer-to-peer communication**: Direct media transfer between users after signaling.

This allows users to communicate face-to-face without leaving the application environment.

---

## 3. Technology Used

- **WebRTC**: Peer-to-peer media streaming protocol.
- **Socket.io**: Signaling server for handshaking and metadata exchange.
- **Browser MediaDevices API**: Camera and microphone access.
- **Zustand**: State management for call status and stream references.

---

## 4. WebRTC Architecture

WebRTC establishes a direct connection between users via a signaling process.

### The Flow:
1. **User A initiates call**: Local stream is captured.
2. **Offer created (SDP)**: Session Description Protocol describes the media capabilities.
3. **Offer sent via Socket.io**: Signaling server delivers the offer to User B.
4. **User B receives offer**: Prompted to accept the call.
5. **Answer created**: User B generates their own SDP.
6. **Answer sent back**: Signaling server delivers the answer to User A.
7. **ICE candidates exchanged**: Interactive Connectivity Establishment finds the best network path.
8. **Peer-to-peer connection established**: Direct link created.
9. **Video stream starts**: Media flows between peers.

---

## 5. Signaling System

Socket.io is used for signaling, as WebRTC itself does not provide a signaling mechanism.

### Responsibilities:
- **Exchange offer and answer**: Standard SDP handshaking.
- **Exchange ICE candidates**: Network path discovery.
- **Notify users about call events**: Call incoming, call accepted, call rejected, call ended.
- **User Presence**: Ensuring users are online before initiating calls.

---

## 6. Call Flow

### Call Initiation
1. User clicks "Start Call" in the Chat sidebar.
2. `navigator.mediaDevices.getUserMedia()` is called to request camera/mic access.
3. Local video is displayed in the preview window.
4. WebRTC `RTCPeerConnection` is initialized.
5. Signaling `call:offer` sent through socket.

### Call Acceptance
1. Receiver gets a `call:incoming` notification via socket.
2. Receiver clicks "Accept".
3. `getUserMedia()` called for receiver's local stream.
4. Receiver processes the offer and creates an answer.
5. Signaling `call:answer` sent back.

### Connection & Stream
1. ICE candidates are exchanged and added to the peer connection.
2. The `ontrack` event triggers when the remote stream arrives.
3. Both users now see and hear each other.

---

## 7. Media Handling

Browser APIs used:
- `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`

### Functionality:
- **Camera access**: Front/Main camera capture.
- **Microphone access**: Audio input.
- **Stream management**: Attaching `MediaStream` objects to `<video>` elements using `srcObject`.
- **Stream Cleanup**: Properly stopping tracks when the call ends to release hardware.

---

## 8. UI Components

### Current Implementation:
- **Integrated UI**: The video calling interface is currently integrated directly into `components/chat/ChatBox.js` to ensure seamless transition from chat to video.
- **RemoteVideoTile**: A sub-component used to render video feeds from other participants.
- **Local Preview**: A dedicated video element for the user's own camera feed.

### Planned Refactoring:
- `components/video/VideoCallOverlay.js`: A dedicated overlay for active calls.
- `components/video/RemoteParticipant.js`: Specialized component for remote streams.
- `components/video/CallControls.js`: Unified control bar for mute, video toggle, and end call.

---

## 9. Socket Events

The system uses the following Socket.io events for signaling:
- `start_call` / `start_group_call`: Initiates the handshaking process.
- `accept_call` / `accept_group_call`: Confirms participation.
- `webrtc_offer`: Exchanges SDP offer.
- `webrtc_answer`: Exchanges SDP answer.
- `webrtc_ice_candidate`: Exchanges network routing info.
- `end_call`: Terminates the session.
- `reject_call`: Declines an incoming call.

---

## 10. State Management

The implementation leverages a combination of local component state and the global Zustand store (`store/appStore.js`):
- **Local State**: Manages `MediaStream` references and `RTCPeerConnection` instances for performance.
- **Global State**: Tracks `callNotification` and shared UI visibility.
- **Peer Map**: Uses a `Map` in `ChatBox.js` to track multiple peer connections in group calls.

---

## 11. Limitations (Current Version)

- **One-to-one and Basic Group Calls**: Supported but relies on mesh networking (each peer connects to every other peer).
- **Scalability**: High CPU/Bandwidth usage for large groups due to the mesh architecture.
- **UI Complexity**: `ChatBox.js` has become large because it contains both messaging and video logic.

---

## 12. Performance Considerations

- **Mesh Networking**: Acceptable for 2-4 participants; requires SFU for larger groups.
- **STUN/TURN**: Uses Google's public STUN servers for NAT traversal.
- **Resource Cleanup**: Critical to stop media tracks and close peer connections on `useEffect` unmount.

---

## 13. Features Implemented

- [x] One-to-one and Group WebRTC Signaling.
- [x] Local and Remote video rendering.
- [x] Socket.io-based handshaking pipeline.
- [x] Call history integration (calls show up as specialized messages in chat).
- [x] Incoming call notifications across the dashboard.
- [x] **Media Track Controls**: Audio Mute/Unmute and Video On/Off.
- [x] **Screen Sharing**: Real-time display sharing using `getDisplayMedia`.

---

## 14. Files Added or Updated

### Updated
- `components/chat/ChatBox.js`: Primary container for WebRTC logic and UI.
- `server.js`: Updated to handle specialized signaling events.
- `store/appStore.js`: Added `callNotification` state.
- `lib/socket-client.js`: Ensures socket singleton is available for signaling.

---

## 15. Output of Phase 6

At the end of Phase 6, the system achieves:
- **Instant Video Collaboration**: Users can start or join calls directly from any conversation.
- **Peer-to-Peer Media Flow**: Low latency communication optimized for dashboard analysts.
- **Unified Communication Hub**: Chat and Video are no longer separate silos.

---

## 16. Next Steps (Action Plan)

1. **Refactor WebRTC Logic**: Extract signaling and peer management into a custom `useWebRTC` hook.
2. **Modularize UI**: Move video elements to a dedicated `components/video/` directory.
3. **Enhance Media Controls**: Implement Mute/Unmute and Video On/Off functionality.
4. **Connection Robustness**: Add ICE connection state monitoring and automatic retry logic.
5. **Phase 7 Implementation**: Focus on UI polish, performance tuning, and final deployment.
