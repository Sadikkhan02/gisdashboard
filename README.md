# GeoSpatial Intelligence Dashboard

GeoSpatial Intelligence Dashboard is a Next.js application for geospatial monitoring, analytics, and collaborative operations. The current codebase already includes the core dashboard UI shell: KPI cards, chart panels, an interactive Google Map, and an activity feed.

This repository is being adapted toward a broader platform that combines:

- GIS-based analytics
- viewport-driven insights
- operational dashboards
- internal communication workflows

## Current Implementation

Implemented in the repo today:

- Next.js App Router frontend
- Tailwind CSS styling
- dashboard layout with navbar, KPI cards, charts, map, and feed
- Google Maps integration with markers, clustering, and heatmap toggle
- mock dashboard state wired through the main dashboard page
- MongoDB connection utility and Mongoose models
- TanStack Query provider and Zustand store scaffolding
- Phase 1 API routes for KPI, chart, feed, map, and backend connectivity testing

Planned next:

- MongoDB-backed viewport geo queries
- live dashboard analytics APIs
- one-to-one and group chat
- file sharing
- Socket.io messaging
- WebRTC video calling

## Project Structure

```text
app/
  api/                 API routes and Phase 1 backend endpoints
  dashboard/           Main intelligence dashboard page
  page.js              Redirects users into the dashboard
components/
  charts/              Recharts visualizations
  common/              Shared UI building blocks
  feed/                Activity feed UI
  kpi/                 KPI cards and section
  layout/              Navbar and layout elements
  map/                 Google Maps integration
  providers/           App-level providers
models/
  Location.js          GIS location schema
  Message.js           Chat message schema
services/
  dashboardService.js  Business logic scaffolding
store/
  appStore.js          Zustand state scaffolding
utils/
  apiResponse.js       Shared API response formatter
lib/
  api.js               Client-side API helpers
  mongodb.js           MongoDB connection helper
docs/
  PHASE_1_FOUNDATION_SETUP.md
  PROJECT_EXECUTION_DOCUMENT.md
  IMPLEMENTATION_STATUS.md
```

## Run Locally

Install dependencies if needed, then start the app:

```bash
npm run dev
```

Open `http://localhost:3000`. The root route forwards to the dashboard view.

## Environment

Create `.env.local` with the values required for your setup:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=geo_dashboard
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
JWT_SECRET=your_secret
```

You can test backend connectivity with `GET /api/test` once MongoDB is configured.

## Architecture Direction

Target architecture for this project:

```text
Next.js UI
   ->
Next.js API routes / server actions
   ->
MongoDB with GeoJSON and collaboration data
   ->
Socket.io for realtime messaging
   ->
WebRTC for video communication
```

## Documentation

Detailed planning and execution guidance lives in:

- `docs/PHASE_1_FOUNDATION_SETUP.md`
- `docs/PROJECT_EXECUTION_DOCUMENT.md`
- `docs/IMPLEMENTATION_STATUS.md`

## Notes

The existing dashboard UI is preserved and treated as the baseline experience. Upcoming work should adapt backend and data layers to this UI rather than rebuilding the interface from scratch.
