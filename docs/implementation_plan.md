# Final Phase Implementation Plan — D3E with PostGIS

## 1. Architecture Decision

```mermaid
graph LR
    subgraph "MongoDB — Realtime & Auth"
        A1["Auth / Demo Users"]
        A2["Chat Messages"]
        A3["Groups"]
        A4["WebRTC / Socket.io"]
    end

    subgraph "PostgreSQL + PostGIS — Spatial Intelligence"
        B1["POIs (faridabad_poi.geojson)"]
        B2["Roads (faridabad_roads.geojson)"]
        B3["Demographics (Census CSV)"]
        B4["Decision Engine Queries"]
    end

    UI["Dashboard UI (Leaflet)"] --> A1
    UI --> A2
    UI --> B4
    B4 --> B1
    B4 --> B2
    B4 --> B3
```

| Database | Responsibility | Already Working? |
|----------|---------------|-----------------|
| **MongoDB** | Auth sessions, demo users, chat messages, groups, Socket.io, WebRTC signaling | ✅ Yes — fully functional |
| **PostgreSQL/PostGIS** | Spatial POI storage, road networks, census demographics, D3E aggregation queries | ❌ New — to be implemented |

> [!IMPORTANT]
> **Map Library**: Keeping **Leaflet + OpenStreetMap** (no Google Maps key needed). No migration required — it's already working.

---

## 2. Prerequisites — PostgreSQL Setup

> [!WARNING]
> PostgreSQL is **not currently installed** on your system. You will need to install it before I can run the seed scripts.

### Installation Steps (Windows)
1. Download PostgreSQL installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. During installation, **check the PostGIS option** in Stack Builder or install PostGIS separately
3. Set a password for the `postgres` user
4. After install, create the project database:

```sql
CREATE DATABASE geo_dashboard_gis;
\c geo_dashboard_gis
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Environment Variable to Add
```env
# Add to .env.local
POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/geo_dashboard_gis
```

---

## 3. Your Data — Assessment

| File | Content | Import Target |
|------|---------|---------------|
| [faridabad_poi.geojson](file:///d:/Projects/geo-dashboard/public/faridabad_poi.geojson) | ~8400 lines — Schools, hospitals, restaurants, cafes, bus/railway stations | `pois` table |
| [faridabad_roads.geojson](file:///d:/Projects/geo-dashboard/public/faridabad_roads.geojson) | 20.3 MB — Road network (primary, secondary, tertiary, residential) | `roads` table |
| [Census CSV](file:///d:/Projects/geo-dashboard/public/table-2011-PC11_PCA-TV-0%20(1).csv) | Faridabad District Census 2011 — Population 18,09,733, households, literacy | `demographics` table |

> [!TIP]
> **Crime data gap**: No crime dataset exists. The plan generates **synthetic but realistic crime data** distributed across Faridabad wards/sectors based on population density and urban classification. This is sufficient for a project demo and can be swapped with real NCRB data later.

---

## 4. Proposed Changes

### Component 1: PostgreSQL Connection Layer

---

#### [NEW] [postgres.js](file:///d:/Projects/geo-dashboard/lib/postgres.js)
PostgreSQL connection pool utility using the existing `pg` package (already in `package.json`).
- Creates and caches a connection pool
- Reads `POSTGRES_URL` from environment
- Provides `query()` helper for PostGIS spatial queries
- Handles connection errors gracefully

---

### Component 2: PostGIS Schema & Seed Pipeline

---

#### [NEW] [create-tables.js](file:///d:/Projects/geo-dashboard/scripts/create-tables.js)
SQL schema creation script that sets up PostGIS tables:

```sql
-- POIs table (schools, hospitals, restaurants, transit)
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    osm_id VARCHAR(64),
    name VARCHAR(256),
    amenity VARCHAR(64),        -- school, hospital, restaurant, cafe, fast_food, bus_station
    category VARCHAR(32),       -- infrastructure, competition, transit, demand_anchor
    geom GEOMETRY(Point, 4326), -- Centroid point computed from Polygon features
    properties JSONB DEFAULT '{}'
);
CREATE INDEX idx_pois_geom ON pois USING GIST(geom);
CREATE INDEX idx_pois_amenity ON pois(amenity);
CREATE INDEX idx_pois_category ON pois(category);

-- Roads table (connectivity layer)
CREATE TABLE roads (
    id SERIAL PRIMARY KEY,
    osm_id VARCHAR(64),
    name VARCHAR(256),
    highway VARCHAR(32),        -- primary, secondary, tertiary, residential
    geom GEOMETRY(LineString, 4326),
    properties JSONB DEFAULT '{}'
);
CREATE INDEX idx_roads_geom ON roads USING GIST(geom);

-- Demographics table (census population data)
CREATE TABLE demographics (
    id SERIAL PRIMARY KEY,
    geo_level INTEGER,
    urban_rural INTEGER,        -- 0=total, 1=urban, 2=rural
    indicator INTEGER,          -- 1=households, 2=population, 3=males, 4=females, etc.
    value BIGINT,
    ward INTEGER DEFAULT 0
);

-- Synthetic crime layer (generated from POI density)
CREATE TABLE crime_incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(32),  -- theft, fraud, cyber, assault, vandalism
    severity VARCHAR(16),       -- low, medium, high
    geom GEOMETRY(Point, 4326),
    reported_at TIMESTAMP DEFAULT NOW(),
    ward VARCHAR(64)
);
CREATE INDEX idx_crime_geom ON crime_incidents USING GIST(geom);
```

#### [NEW] [seed-postgis.js](file:///d:/Projects/geo-dashboard/scripts/seed-postgis.js)
Node.js seed script that:
1. **Parses `faridabad_poi.geojson`** → Extracts features, computes centroid from Polygon geometries → Inserts into `pois` table with amenity category mapping:
   - `school` → category `demand_anchor`
   - `hospital` → category `infrastructure`
   - `restaurant/cafe/fast_food` → category `competition`
   - `bus_station/railway station` → category `transit`
2. **Parses `faridabad_roads.geojson`** → Extracts road LineStrings → Inserts into `roads` table
3. **Parses Census CSV** → Maps indicator codes to human-readable metrics → Inserts into `demographics`
4. **Generates crime data** → Creates ~500 synthetic incidents distributed proportionally to POI density (higher crime near dense commercial areas, lower near residential)

---

### Component 3: Decision Engine — PostGIS Integration

---

#### [MODIFY] [decisionEngine.js](file:///d:/Projects/geo-dashboard/services/decisionEngine.js)
**Complete rewrite** to use real PostGIS queries instead of `_pseudoRandom()`:

```javascript
// Each metric computed from real spatial data
async analyzeArea(bbox, priority, customWeights) {
    const metrics = {
        // Count of crime incidents within bbox / area size
        safety:       await this._computeSafety(bbox),
        // Average development proxy from infrastructure density
        growth:       await this._computeGrowth(bbox),
        // Population from demographics / viewport area
        density:      await this._computeDensity(bbox),
        // Transit POI count (bus+railway) / area
        connectivity: await this._computeConnectivity(bbox)
    };
    // ... WSM algorithm stays the same
}
```

PostGIS queries used:
- `ST_MakeEnvelope(west, south, east, north, 4326)` for viewport bbox
- `ST_Contains()` for point-in-bbox filtering
- `COUNT(*) / ST_Area()` for density calculations
- `ST_DWithin()` for proximity scoring
- Aggregation by amenity category

#### [MODIFY] [route.js (decision)](file:///d:/Projects/geo-dashboard/app/api/decision/route.js)
Update to pass PostgreSQL pool to the engine. Add error handling for PostGIS connection issues with a fallback message.

---

### Component 4: Phase 7 — UI Polish & Optimization

---

#### [MODIFY] [page.js (dashboard)](file:///d:/Projects/geo-dashboard/app/dashboard/page.js)
- Remove the `getMockDashboardData()` function (lines 33-104) — no more hardcoded mock data
- Add loading skeleton components for KPI cards, map, and charts
- Add empty-state UI when viewport has no data
- Fix `MetricRow` in Intelligence view — currently uses `border-slate-100` (light) inside a `bg-slate-900` (dark) container

#### [MODIFY] [MapComponent.js](file:///d:/Projects/geo-dashboard/components/map/MapComponent.js)
- Change `defaultCenter` from `[22.9734, 78.6569]` (center of India) to `[28.4089, 77.3178]` (Faridabad)
- Change default `zoom` from `5` to `12` for city-level view
- Add marker clustering for handling 500+ POI markers from PostGIS

#### [MODIFY] [DecisionIntelligencePanel.js](file:///d:/Projects/geo-dashboard/components/dashboard/DecisionIntelligencePanel.js)
- Add loading skeleton state (not just a spinner)
- Add "Data Source: PostGIS" indicator 
- Add timestamp showing when scores were last computed

#### [MODIFY] [globals.css](file:///d:/Projects/geo-dashboard/app/globals.css)
- Add `custom-scrollbar` class (referenced in dashboard page but not defined)
- Add skeleton loading keyframe animations
- Add smooth view-transition styles

---

### Component 5: Documentation

---

#### [NEW] [DUAL_DATABASE_ARCHITECTURE.md](file:///d:/Projects/geo-dashboard/docs/DUAL_DATABASE_ARCHITECTURE.md)
Documents the dual-database architecture decision:
- MongoDB: Auth, realtime (chat, Socket.io, WebRTC), message/group persistence
- PostgreSQL/PostGIS: All GIS spatial data, D3E intelligence queries, POI/road/demographics storage
- Why two databases: MongoDB excels at flexible document storage and realtime sync; PostGIS excels at spatial indexing, geometric operations (`ST_Contains`, `ST_Distance`, `ST_Area`), and analytical aggregation

#### [NEW] [PHASE_7_UI_POLISH_AND_OPTIMIZATION.md](file:///d:/Projects/geo-dashboard/docs/PHASE_7_UI_POLISH_AND_OPTIMIZATION.md)
Documents the UI polish work: map recentering, loading skeletons, mock data removal, CSS fixes, dark theme corrections.

#### [MODIFY] [PHASE_8_DATA_DRIVEN_DECISION_ENGINE.md](file:///d:/Projects/geo-dashboard/docs/PHASE_8_DATA_DRIVEN_DECISION_ENGINE.md)
Update to reflect actual PostGIS implementation instead of "PostGIS/Mock" placeholder. Add seed pipeline documentation and real query examples.

#### [MODIFY] [IMPLEMENTATION_STATUS.md](file:///d:/Projects/geo-dashboard/docs/IMPLEMENTATION_STATUS.md)
- Mark Phase 7 ✅ and Phase 8 ✅ as complete
- Update "present and usable" section with PostGIS items
- Remove "placeholder or incomplete" items that are now resolved
- Correct map library references (Leaflet, not Google Maps)

#### [MODIFY] [PROJECT_EXECUTION_DOCUMENT.md](file:///d:/Projects/geo-dashboard/docs/PROJECT_EXECUTION_DOCUMENT.md)
Add dual-database architecture to Section 5 (Technology Stack). Correct map references.

---

### Component 6: Cleanup

---

#### [MODIFY] [.env.local](file:///d:/Projects/geo-dashboard/.env.local)
Add `POSTGRES_URL` variable. Remove unused `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## 5. Execution Order

```mermaid
graph TD
    A["1. PostgreSQL Connection Utility<br/>(lib/postgres.js)"] --> B["2. PostGIS Schema Script<br/>(scripts/create-tables.js)"]
    B --> C["3. Seed Script<br/>(scripts/seed-postgis.js)"]
    C --> D["4. Decision Engine Rewrite<br/>(Real PostGIS queries)"]
    D --> E["5. Decision API Update<br/>(PostGIS integration)"]
    E --> F["6. UI Polish<br/>(Map center, skeletons, mock removal)"]
    F --> G["7. CSS Fixes<br/>(Dark theme, scrollbar, animations)"]
    G --> H["8. Documentation<br/>(Dual DB, Phase 7, Phase 8)"]
    H --> I["9. Verification<br/>(Build + functional test)"]
```

> [!NOTE]
> Steps 1-3 require PostgreSQL with PostGIS to be installed and running. Steps 4-8 are code changes I can start writing immediately. Step 3 (seeding) will be run once you confirm your PostgreSQL is ready.

---

## 6. Verification Plan

### Automated Tests
```bash
npm run build                          # No build errors
npm run lint                           # Code quality check
node scripts/create-tables.js          # Create PostGIS schema
node scripts/seed-postgis.js           # Populate spatial data
```

### Manual Verification
- Dashboard map centers on Faridabad at city zoom level
- Intelligence view → D3E panel shows real scores from PostGIS data
- Changing viewport (pan/zoom) recalculates D3E scores from actual POI/crime/demographic data
- Switching priority (Security/Growth/Infrastructure) changes the WSM weights and produces different scores
- Chat, group chat, and video calling still work (MongoDB side — no regression)
- `npm run build` succeeds with no errors

---

## Open Questions

> [!IMPORTANT]
> **Q1: PostgreSQL Installation** — PostgreSQL is not currently on your system. Please install it with PostGIS extension before I begin execution. Do you need help with the installation steps, or will you handle it and let me know when it's ready?

> [!NOTE]
> **Q2: Crime Data** — I'll generate ~500 synthetic crime incidents distributed across Faridabad based on POI density patterns. This gives realistic-looking data for the D3E demo. Is this acceptable, or do you have a real crime dataset to import?
