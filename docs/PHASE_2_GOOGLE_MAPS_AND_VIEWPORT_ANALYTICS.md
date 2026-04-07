# Phase 2 Documentation - Google Map Integration and Viewport Analytics

## 1. Objective

Phase 2 introduces the core GIS behavior of the platform by turning the dashboard map into an interactive analytics driver. The goal is to detect the currently visible geographic area, send those bounds to the backend, execute geospatial filtering, and refresh dashboard data from the viewport.

This phase establishes the first live map-to-data workflow in the project.

## 2. Phase 2 Scope

Phase 2 covers:

- Google Maps integration in the dashboard workspace
- map event handling for pan and zoom
- viewport bounding-box detection
- Zustand-based viewport state storage
- a new analytics API driven by bounds
- MongoDB geospatial query support through the `Location` model
- dynamic marker, heatmap, KPI, chart, and feed updates
- Phase 2 project documentation

## 3. Google Maps Integration

The dashboard already contained a map panel, but Phase 2 turns it into a reusable GIS interaction layer.

Implemented in `components/map/MapComponent.js`.

### Features now supported

- map rendering inside the dashboard center panel
- pan and zoom interaction
- map type switching for roadmap, satellite, and terrain
- marker rendering
- heatmap rendering
- marker clustering
- viewport event capture

## 4. Map Component Responsibilities

`components/map/MapComponent.js` now handles:

- Google Map initialization
- marker and heatmap rendering
- layer selection
- map type selection
- viewport bounds extraction
- emitting viewport changes back to the dashboard

This keeps map-specific logic isolated from the page-level dashboard orchestration.

## 5. Viewport Detection System

Phase 2 captures the visible map area using the Google Maps bounds API.

### Core method

- `map.getBounds()`

### Extracted values

- `north`
- `south`
- `east`
- `west`

These values form the viewport bounding box used by the analytics API.

## 6. Viewport Trigger Workflow

The map now reacts to user interaction through:

- `onLoad`
- `onDragEnd`
- `onZoomChanged`

Workflow:

1. User pans or zooms the map.
2. The component reads the latest bounds.
3. Bounds are normalized into `{ north, south, east, west }`.
4. Zustand stores the active viewport.
5. React Query calls the analytics API.
6. The dashboard refreshes with viewport-specific data.

## 7. API Integration for GIS Data

Phase 2 adds a dedicated endpoint:

- `app/api/analytics/route.js`

### Request shape

```text
GET /api/analytics?north=...&south=...&east=...&west=...&region=...&range=...
```

### Current behavior

The endpoint:

- validates viewport bounds
- loads viewport analytics from the service layer
- returns a normalized response payload for the dashboard

## 8. Geo Query Implementation

Viewport filtering is implemented in `services/analyticsService.js` using the `Location` model.

### MongoDB query shape

```javascript
Location.find({
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

### Fallback behavior

If MongoDB is unavailable or no location data is present yet, the service falls back to an in-memory sample dataset so the viewport analytics workflow remains testable during development.

## 9. Data Flow Architecture

```text
User interacts with map
   ->
Viewport bounds detected
   ->
Zustand stores bounds
   ->
React Query requests /api/analytics
   ->
Analytics service runs MongoDB geo query or fallback filter
   ->
Filtered data returned
   ->
Map markers, feed, KPI cards, and charts update
```

## 10. Marker Rendering System

Markers are now driven by viewport analytics instead of only static local values.

### Features

- dynamic marker rendering from API data
- marker updates after pan and zoom
- heatmap generation from returned location weights
- marker clustering for better scalability

## 11. State Management

Phase 2 uses Zustand and React Query together.

### Zustand

Implemented in `store/appStore.js`.

State currently includes:

- `activeRegion`
- `dateRange`
- `viewport`
- `locationData`

### React Query

Used in `app/dashboard/page.js` to:

- fetch viewport analytics
- cache analytics responses
- handle repeated viewport requests efficiently

## 12. Dashboard Integration

The dashboard page now uses viewport analytics from `lib/api.js` through React Query.

Current integration includes:

- updating markers from viewport data
- updating heatmap points from viewport data
- updating KPI cards from viewport data
- updating charts from viewport data
- updating feed items from viewport data

This is the first phase where map interaction influences the rest of the dashboard.

## 13. Output of Phase 2

At the end of Phase 2, the system now provides:

- functional Google Maps integration
- roadmap, satellite, and terrain switching
- viewport bounding-box detection
- API requests driven by map interaction
- MongoDB-compatible geospatial filtering
- fallback analytics for local testing
- dynamic dashboard refresh based on visible area

## 14. Files Added or Updated

### Added

- `app/api/analytics/route.js`
- `services/analyticsService.js`

### Updated

- `components/map/MapComponent.js`
- `app/dashboard/page.js`
- `store/appStore.js`
- `lib/api.js`
- `components/feed/FeedPanel.js`

## 15. What Phase 2 Does Not Yet Complete

Phase 2 establishes GIS interaction, but it does not yet complete:

- production-grade MongoDB seed data
- advanced chart aggregation pipelines
- ECharts migration
- region-aware backend filtering
- group chat, Socket.io, or WebRTC features

## 16. Next Phase

Phase 3 should focus on:

- stronger dashboard aggregation logic
- richer analytics APIs
- improved chart synchronization and metrics quality
- replacing placeholder chart formulas with domain-specific analytics
