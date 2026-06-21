const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        } else if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    });
  }
}

loadEnv();

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('Error: POSTGRES_URL environment variable is not defined.');
  process.exit(1);
}

const client = new Client({ connectionString });

const schemaSQL = `
-- Enable PostGIS extension if not exists
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop tables if they exist to start clean for seeding (optional, but good for reset)
DROP TABLE IF EXISTS pois CASCADE;
DROP TABLE IF EXISTS roads CASCADE;
DROP TABLE IF EXISTS demographics CASCADE;
DROP TABLE IF EXISTS crime_incidents CASCADE;

-- POIs table
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    osm_id VARCHAR(64),
    name VARCHAR(256),
    amenity VARCHAR(64),
    category VARCHAR(32),
    geom GEOMETRY(Point, 4326),
    properties JSONB DEFAULT '{}'
);
CREATE INDEX idx_pois_geom ON pois USING GIST(geom);
CREATE INDEX idx_pois_amenity ON pois(amenity);
CREATE INDEX idx_pois_category ON pois(category);

-- Roads table
CREATE TABLE roads (
    id SERIAL PRIMARY KEY,
    osm_id VARCHAR(64),
    name VARCHAR(256),
    highway VARCHAR(32),
    geom GEOMETRY(LineString, 4326),
    properties JSONB DEFAULT '{}'
);
CREATE INDEX idx_roads_geom ON roads USING GIST(geom);

-- Demographics table
CREATE TABLE demographics (
    id SERIAL PRIMARY KEY,
    geo_level INTEGER,
    urban_rural INTEGER,
    indicator INTEGER,
    value BIGINT,
    ward INTEGER DEFAULT 0
);

-- Synthetic crime layer
CREATE TABLE crime_incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(32),
    severity VARCHAR(16),
    geom GEOMETRY(Point, 4326),
    reported_at TIMESTAMP DEFAULT NOW(),
    ward VARCHAR(64)
);
CREATE INDEX idx_crime_geom ON crime_incidents USING GIST(geom);
`;

async function main() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected. Running schema SQL...');
    await client.query(schemaSQL);
    console.log('Schema tables and indices created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
