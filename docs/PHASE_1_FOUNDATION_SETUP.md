# Phase 1 Documentation - Foundation Setup

## 1. Objective

Phase 1 establishes the project foundation for the GeoSpatial Intelligence Dashboard with Communication System. The goal is to prepare a scalable codebase that supports dashboard analytics today and GIS, chat, and video capabilities in later phases.

For this repository, Phase 1 is an adaptation phase rather than a greenfield phase. The dashboard UI already existed, so the work focused on aligning the project structure, data layer direction, and base backend contracts with that UI.

## 2. Phase 1 Scope

Phase 1 covers:

- Next.js application baseline
- MongoDB foundation setup
- reusable database connection utility
- initial Mongoose models
- modular project folders
- shared API response utility
- test API route for backend and database verification
- base state management and data-fetching scaffolding
- documentation aligned with the current codebase

## 3. Foundation Decisions

### Application Framework

- Next.js with App Router
- JavaScript
- Tailwind CSS

### Data Layer

- MongoDB as the primary database
- Mongoose as the ODM

### Client State and Fetching

- Zustand for shared client state
- TanStack Query for server-state management
- Axios installed for API communication patterns

## 4. Folder Structure Implemented

The repository now includes the following Phase 1 structure:

```text
app/         routes and API endpoints
components/  reusable UI and providers
docs/        project and phase documentation
lib/         database and API utilities
models/      Mongoose schemas
services/    business logic helpers
store/       Zustand store definitions
utils/       shared utility helpers
```

This keeps backend concerns, UI concerns, and shared logic separated for easier scaling.

## 5. Database Setup

MongoDB is the selected database because it fits both major product areas:

- geospatial records using GeoJSON
- communication data such as messages and groups

### Environment Variables

Phase 1 expects:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=geo_dashboard
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
JWT_SECRET=your_secret
```

### Connection Utility

A reusable database connector was added in `lib/mongodb.js`. It:

- validates that `MONGODB_URI` exists
- caches the Mongoose connection across reloads
- supports an optional `MONGODB_DB` override

## 6. Models Created

### Location Model

Implemented in `models/Location.js`.

Fields:

- `name`
- `location.type`
- `location.coordinates`
- `population`
- `crime`
- `developmentIndex`

The model includes a `2dsphere` index for future viewport-based geospatial queries.

### Message Model

Implemented in `models/Message.js`.

Fields:

- `senderId`
- `receiverId`
- `message`
- `type`
- `createdAt`

This model provides the base persistence layer for the future chat system.

## 7. API Setup

### Test Route

Phase 1 adds `app/api/test/route.js` to verify:

- API routing is active
- the backend runtime is working
- MongoDB connection succeeds when environment variables are set correctly

### Placeholder Dashboard Routes

The following routes were normalized so they return valid JSON responses during Phase 1 instead of broken SQL placeholders:

- `app/api/kpi/route.js`
- `app/api/charts/route.js`
- `app/api/map/route.js`
- `app/api/feed/route.js`

These routes are still Phase 1 placeholder endpoints. They keep the app stable until real MongoDB-backed analytics are added in later phases.

## 8. UI Setup

The project already contained a dashboard UI. Instead of replacing it, Phase 1 preserves and formalizes it as the baseline application shell.

The current layout represents the target operational dashboard:

- left section: data and chart panels
- center section: map workspace
- right section: analytics feed

This aligns with the intended enterprise dashboard structure while avoiding unnecessary UI churn.

## 9. State and Provider Setup

### React Query Provider

`components/providers/AppProviders.js` was added and wired through `app/layout.js`.

This prepares the app for:

- cached API requests
- shared loading and error state patterns
- later migration away from mock dashboard data

### Zustand Store

`store/appStore.js` provides a base store for:

- active region
- date range
- viewport state

This is the initial state foundation for future GIS filtering and collaboration flows.

## 10. Service and Utility Setup

Phase 1 also introduces:

- `services/dashboardService.js` for dashboard-oriented business logic
- `utils/apiResponse.js` for consistent API payload formatting

These are light scaffolds now, but they create the structure needed for later phases.

## 11. Dependencies Installed

Phase 1 added the following core dependencies:

- `mongoose`
- `axios`
- `@tanstack/react-query`
- `zustand`

## 12. Output of Phase 1

At the end of this phase, the repository now has:

- a working Next.js dashboard baseline
- MongoDB connection scaffolding
- Mongoose models for location and message data
- reusable provider and state foundations
- a database test endpoint
- corrected placeholder dashboard APIs
- project documentation aligned with the real repo state

## 13. What Phase 1 Does Not Yet Complete

Phase 1 prepares the foundation, but it does not yet deliver:

- live MongoDB-backed dashboard analytics
- viewport-driven map queries
- group model and collaboration persistence
- Socket.io messaging
- WebRTC video calling

Those belong to later phases.

## 14. Next Phase

Phase 2 should focus on:

- capturing Google Maps bounds
- storing viewport state in the client store
- replacing mock dashboard state with TanStack Query
- querying MongoDB using the `Location` model
- returning map, KPI, and chart data from real aggregation pipelines
