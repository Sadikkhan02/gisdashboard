# Project Execution Document

## 1. Overview

The GeoSpatial Intelligence Dashboard is a full-stack operational platform that combines geospatial analytics with collaboration tooling. The current repository already contains the dashboard UI foundation, so execution should focus on adapting backend services, data models, and realtime capabilities to the existing interface.

The platform is intended to help users:

- monitor geographically distributed incidents or assets
- analyze data within the currently visible map viewport
- view KPI and trend summaries in real time
- coordinate through chat, group communication, file sharing, and video calls

## 2. Execution Principle

The UI is already present in this project. Work should therefore follow an adaptation strategy:

- preserve the current dashboard layout and component structure
- replace mock data with live APIs
- align map interactions with viewport-based analytics
- add communication capabilities as new modules without disrupting the dashboard shell

## 3. Existing UI Baseline

The repository already includes:

- top navigation with region and date controls
- KPI summary cards
- incident trend, hourly, category, and donut charts
- Google Maps panel with clustering and heatmap toggle
- activity feed panel

This baseline should remain the core analyst workspace.

## 4. Refined Product Scope

### 4.1 GIS Analytics Module

Primary capabilities:

- interactive Google Map
- marker and heatmap visualization
- viewport-aware querying
- GeoJSON-based storage and retrieval
- analytics refresh based on visible area
- chart synchronization with map filters

### 4.2 Communication Module

Primary capabilities:

- one-to-one chat
- group chat
- realtime messaging
- file and image sharing
- WebRTC-based video calling

## 5. Recommended Technology Direction

### Frontend

- Next.js App Router
- JavaScript
- Tailwind CSS
- existing reusable dashboard components

### Data and State

- TanStack Query for server-state fetching and caching
- Zustand for cross-component client state such as selected region, active viewport, active conversation, and call state

### Mapping and Visualization

- Google Maps JavaScript API
- current marker clustering support
- charting library should be standardized

Note:
The current codebase uses `recharts`, while the original brief proposes Apache ECharts. To avoid unnecessary UI churn, keep the existing chart layer initially and revisit chart standardization later if advanced geo-analytics visuals require ECharts.

### Backend

- Next.js API routes
- Node.js runtime
- MongoDB for locations, messages, groups, attachments, and call metadata

### Realtime

- Socket.io for chat and signaling
- WebRTC for peer-to-peer video/audio communication

## 6. Target Architecture

```text
Dashboard UI
   ->
Filter + viewport state
   ->
Next.js API routes
   ->
MongoDB queries and aggregations
   ->
Socket.io realtime channel
   ->
WebRTC signaling and media sessions
```

## 7. Database Design

### 7.1 `locations`

```json
{
  "name": "Location A",
  "location": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]
  },
  "data": {
    "population": 20000,
    "crime": 120,
    "developmentIndex": 0.7
  },
  "category": "incident",
  "severity": "high",
  "createdAt": "2026-04-06T00:00:00.000Z"
}
```

### 7.2 `messages`

```json
{
  "senderId": "user1",
  "receiverId": "user2",
  "message": "Hello",
  "type": "text",
  "attachmentUrl": null,
  "createdAt": "2026-04-06T00:00:00.000Z"
}
```

### 7.3 `groups`

```json
{
  "groupName": "Team A",
  "members": ["user1", "user2"],
  "createdBy": "user1",
  "createdAt": "2026-04-06T00:00:00.000Z"
}
```

### 7.4 `calls` (recommended)

```json
{
  "roomId": "call-room-123",
  "participants": ["user1", "user2"],
  "status": "active",
  "startedAt": "2026-04-06T00:00:00.000Z"
}
```

## 8. Core Functional Concept

### Viewport-Based Analytics Flow

1. User pans or zooms the map.
2. The app reads the current map bounds.
3. Bounds are stored in client state.
4. The dashboard triggers API requests using those bounds.
5. MongoDB executes geo-spatial filtering and aggregation.
6. Map markers, KPI cards, feed highlights, and charts update together.

### Example Geo Query

```javascript
db.locations.find({
  location: {
    $geoWithin: {
      $box: [
        [west, south],
        [east, north]
      ]
    }
  }
});
```

### Recommended Aggregation Extensions

- count by severity
- count by category
- hourly distribution
- trend over date range
- top hotspot clusters within current viewport

## 9. Project Workflow

### 9.1 Delivery Workflow

The project should be executed as an adaptation workflow rather than a redesign workflow.

1. Start from the existing dashboard UI.
2. Replace mock state with structured API contracts.
3. Connect APIs to MongoDB and GeoJSON data.
4. Capture map viewport changes and use them as live filters.
5. Synchronize KPI cards, charts, map markers, and feed results.
6. Add collaboration capabilities after analytics data flow is stable.
7. Harden the system with validation, indexing, testing, and performance tuning.

### 9.2 Developer Workflow

Recommended implementation cycle for each module:

1. Define the user interaction and expected output in the existing UI.
2. Define request and response payloads for the module API.
3. Implement or update the database model.
4. Build the API route and validate returned data.
5. Connect the frontend component to live data.
6. Test loading, success, empty, and error states.
7. Optimize only after the flow is functionally correct.

### 9.3 GIS Analytics Workflow

1. User changes region, date range, or map viewport.
2. Client state stores the active filters.
3. The dashboard triggers analytics requests.
4. The backend runs geo-spatial and aggregation queries.
5. The response updates KPI cards, charts, map markers or heatmap, and feed context.
6. The analyst continues exploring with updated intelligence.

### 9.4 Communication Workflow

1. User opens a direct chat or group conversation.
2. Client loads message history from the backend.
3. Socket.io subscribes the user to realtime updates.
4. New messages are stored in MongoDB and broadcast to relevant participants.
5. Attachments are uploaded, linked to messages, and rendered in the conversation.
6. If a call is initiated, Socket.io handles signaling and WebRTC establishes media exchange.

### 9.5 Team Workflow

Suggested workstream split for faster execution:

- frontend track: dashboard integration, component wiring, loading states, communication UI
- backend track: MongoDB models, API routes, aggregations, upload handling
- realtime track: Socket.io events, presence, chat delivery, WebRTC signaling
- qa track: scenario validation, regression testing, performance checks

## 10. Functional Modules and Adaptation Plan

### Phase 1. Foundation Alignment

Goals:

- keep existing UI components
- replace starter homepage behavior
- define documentation and implementation direction
- prepare environment variables and shared config

Deliverables:

- project documentation
- dashboard-first app entry
- backend integration plan

### Phase 2. Data Layer Modernization

Goals:

- replace SQL-style placeholder APIs with MongoDB-backed handlers
- define `locations`, `messages`, and `groups` collections
- create reusable database connection utility

Deliverables:

- MongoDB connection layer
- seed strategy for GeoJSON sample data
- typed API response contracts where helpful

### Phase 3. Viewport-Driven GIS Analytics

Goals:

- capture bounds from Google Maps events
- pass bounds to data-fetching hooks
- return aggregated KPI and chart data for the visible area

Deliverables:

- `/api/map`
- `/api/kpi`
- `/api/charts`
- client-side query hooks integrated into the dashboard

### Phase 4. Dashboard Data Integration

Goals:

- remove hardcoded mock data from `app/dashboard/page.js`
- source cards, charts, and feed from live APIs
- support region/date/viewport as combined filters

Deliverables:

- synchronized dashboard state
- loading and error handling
- real filter-driven analytics

### Phase 5. Communication System

Goals:

- implement direct chat
- persist messages to MongoDB
- deliver realtime updates via Socket.io

Deliverables:

- conversation list UI
- chat panel UI
- message send/receive flow

### Phase 6. Group Collaboration and File Sharing

Goals:

- create groups
- manage members
- upload and attach images/documents

Deliverables:

- group conversations
- attachment metadata model
- upload API integration

### Phase 7. Video Calling

Goals:

- use Socket.io for signaling
- establish peer connections with WebRTC
- surface call controls inside the collaboration workflow

Deliverables:

- call initiation
- accept/reject flow
- active call UI

### Phase 8. Hardening and Optimization

Goals:

- add indexes for geo and chat queries
- improve rendering and loading states
- test dashboard and communication flows

Deliverables:

- optimized geo queries
- reliable reconnect behavior
- production readiness checklist

## 11. One-Month Roadmap

### Week 1

- baseline cleanup and documentation
- MongoDB integration
- dashboard entry-point alignment
- map event capture

### Week 2

- geo query implementation
- viewport-based KPI and chart APIs
- live dashboard data binding

### Week 3

- chat system foundation
- realtime messaging
- feed and collaboration integration

### Week 4

- group chat
- file sharing
- video calling
- optimization and testing

## 12. Expected Outcomes

- a production-oriented geospatial dashboard
- viewport-aware analytics powered by geospatial queries
- a unified operational workspace for monitoring and collaboration
- a scalable full-stack architecture that can grow into enterprise usage

## 13. Implementation Guidance for This Repo

- treat `app/dashboard/page.js` as the main workspace
- preserve existing chart, KPI, map, and feed components where possible
- standardize API response shapes before wiring live data
- avoid rebuilding UI unless a feature demands structural change
- introduce communication features as additive panels or routes

## 14. Success Criteria

The project should be considered successfully adapted when:

- the dashboard loads from real APIs instead of mock state
- map movement changes analytics output
- geographic data is stored and queried from MongoDB
- users can exchange realtime messages
- teams can communicate through group chat and video sessions
