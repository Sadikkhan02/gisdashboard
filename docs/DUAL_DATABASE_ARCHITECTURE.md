# Dual Database Architecture: MongoDB + PostGIS

This document details the architectural separation and division of labor between MongoDB and PostgreSQL/PostGIS in the Geospatial Intelligence Dashboard.

## Architectural Decision Matrix

| Database | Responsibility | Key Package | Rationale |
| :--- | :--- | :--- | :--- |
| **MongoDB** | Authentication sessions, demo user profiles, real-time direct chat messages, collaboration groups, Socket.io room states, and WebRTC signaling logs. | `mongoose` | Requires highly flexible schema layouts, rapid key-value or sub-document reads, and works natively with web socket serialization. |
| **PostgreSQL (PostGIS)** | Spatial POI (points of interest) nodes, road networks, district Census demographics, crime logs, and viewport intelligence suitability scoring. | `pg` | Spatially indexed engine (`ST_Contains`, `ST_Intersects`, `ST_DWithin`, `ST_Area`) allowing advanced analytical aggregation queries over dynamic Leaflet bounding boxes. |

## Data Flow Diagram

```mermaid
graph TD
    UI[Leaflet Dashboard UI] -->|Auth & Chat| Mongo[MongoDB Database]
    UI -->|Viewport Analytics & D3E| PG[PostgreSQL + PostGIS]
    PG --> POI[pois table]
    PG --> Roads[roads table]
    PG --> Census[demographics table]
    PG --> Crime[crime_incidents table]
```

## Setup & Environment Configuration

Ensure both databases are configured in `.env.local`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=geo_dashboard
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/geo_dashboard_gis
```
