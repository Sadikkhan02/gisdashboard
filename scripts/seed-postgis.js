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

// Category mapping helper
function getCategory(properties) {
  const amenity = properties.amenity || '';
  const railway = properties.railway || '';
  if (amenity === 'school') return 'demand_anchor';
  if (amenity === 'hospital') return 'infrastructure';
  if (['restaurant', 'cafe', 'fast_food'].includes(amenity)) return 'competition';
  if (amenity === 'bus_station' || railway === 'station') return 'transit';
  return 'other';
}

// Sanitization of Census CSV
function sanitizeCSV(rawContent) {
  let content = rawContent;
  if (content.includes('\u0000')) {
    content = content.replace(/\u0000/g, '');
  }
  const firstLine = content.split('\n')[0] || '';
  if (firstLine.includes('s t a t e')) {
    content = content.split(/\r?\n/).map(line => {
      return line.replace(/ /g, '');
    }).join('\n');
  }
  return content;
}

// Simple CSV Parser
function parseCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }
  return rows;
}

async function bulkInsertPOIs(client, features) {
  if (features.length === 0) return;
  const batchSize = 200;
  for (let i = 0; i < features.length; i += batchSize) {
    const batch = features.slice(i, i + batchSize);
    const valuePlaceholders = [];
    const values = [];
    let paramCounter = 1;
    
    batch.forEach(feat => {
      const osm_id = feat.id || feat.properties['@id'] || `poi-${Math.random()}`;
      const name = feat.properties.name || 'Unnamed POI';
      const amenity = feat.properties.amenity || '';
      const category = getCategory(feat.properties);
      
      valuePlaceholders.push(`($${paramCounter}, $${paramCounter+1}, $${paramCounter+2}, $${paramCounter+3}, ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($${paramCounter+4}), 4326)), $${paramCounter+5})`);
      values.push(
        osm_id,
        name,
        amenity,
        category,
        JSON.stringify(feat.geometry),
        JSON.stringify(feat.properties)
      );
      paramCounter += 6;
    });
    
    const queryText = `INSERT INTO pois (osm_id, name, amenity, category, geom, properties) VALUES ` + valuePlaceholders.join(', ');
    await client.query(queryText, values);
  }
  console.log(`Successfully seeded ${features.length} POIs.`);
}

async function bulkInsertRoads(client, features) {
  const lineStringFeatures = features.filter(f => f.geometry && f.geometry.type === 'LineString');
  if (lineStringFeatures.length === 0) return;
  const batchSize = 100;
  for (let i = 0; i < lineStringFeatures.length; i += batchSize) {
    const batch = lineStringFeatures.slice(i, i + batchSize);
    const valuePlaceholders = [];
    const values = [];
    let paramCounter = 1;
    
    batch.forEach(feat => {
      const osm_id = feat.id || feat.properties['@id'] || `road-${Math.random()}`;
      const name = feat.properties.name || 'Unnamed Road';
      const highway = feat.properties.highway || '';
      
      valuePlaceholders.push(`($${paramCounter}, $${paramCounter+1}, $${paramCounter+2}, ST_SetSRID(ST_GeomFromGeoJSON($${paramCounter+3}), 4326), $${paramCounter+4})`);
      values.push(
        osm_id,
        name,
        highway,
        JSON.stringify(feat.geometry),
        JSON.stringify(feat.properties)
      );
      paramCounter += 5;
    });
    
    const queryText = `INSERT INTO roads (osm_id, name, highway, geom, properties) VALUES ` + valuePlaceholders.join(', ');
    await client.query(queryText, values);
  }
  console.log(`Successfully seeded ${lineStringFeatures.length} roads.`);
}

async function bulkInsertDemographics(client, rows) {
  if (rows.length === 0) return;
  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuePlaceholders = [];
    const values = [];
    let paramCounter = 1;
    
    batch.forEach(row => {
      valuePlaceholders.push(`($${paramCounter}, $${paramCounter+1}, $${paramCounter+2}, $${paramCounter+3}, $${paramCounter+4})`);
      values.push(
        parseInt(row.geo_level || 0, 10),
        parseInt(row.urbrur || 0, 10),
        parseInt(row.indicator || 0, 10),
        BigInt(row.value || 0),
        parseInt(row.ward || 0, 10)
      );
      paramCounter += 5;
    });
    
    const queryText = `INSERT INTO demographics (geo_level, urban_rural, indicator, value, ward) VALUES ` + valuePlaceholders.join(', ');
    await client.query(queryText, values);
  }
  console.log(`Successfully seeded ${rows.length} demographic records.`);
}

async function seedCrimeIncidents(client, features) {
  const crimeTypes = ['theft', 'fraud', 'cyber', 'assault', 'vandalism'];
  const severities = ['low', 'medium', 'high'];
  const incidents = [];
  
  const validPois = features.filter(f => f.geometry && f.geometry.type === 'Point');
  const poiSource = validPois.length > 0 ? validPois : features;
  
  for (let i = 0; i < 500; i++) {
    const feat = poiSource[Math.floor(Math.random() * poiSource.length)];
    let coords;
    if (feat.geometry.type === 'Point') {
      coords = feat.geometry.coordinates;
    } else if (feat.geometry.type === 'Polygon') {
      const outerRing = feat.geometry.coordinates[0];
      let sumLng = 0, sumLat = 0;
      outerRing.forEach(c => { sumLng += c[0]; sumLat += c[1]; });
      coords = [sumLng / outerRing.length, sumLat / outerRing.length];
    } else {
      coords = [77.3178, 28.4089];
    }
    
    const offsetLng = coords[0] + (Math.random() - 0.5) * 0.015;
    const offsetLat = coords[1] + (Math.random() - 0.5) * 0.015;
    
    const type = crimeTypes[Math.floor(Math.random() * crimeTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const wardId = Math.floor(Math.random() * 40) + 1;
    
    incidents.push({
      incident_type: type,
      severity: severity,
      geometry: {
        type: 'Point',
        coordinates: [offsetLng, offsetLat]
      },
      ward: `Ward ${wardId}`
    });
  }
  
  const batchSize = 100;
  for (let i = 0; i < incidents.length; i += batchSize) {
    const batch = incidents.slice(i, i + batchSize);
    const valuePlaceholders = [];
    const values = [];
    let paramCounter = 1;
    
    batch.forEach(inc => {
      valuePlaceholders.push(`($${paramCounter}, $${paramCounter+1}, ST_SetSRID(ST_GeomFromGeoJSON($${paramCounter+2}), 4326), $${paramCounter+3})`);
      values.push(
        inc.incident_type,
        inc.severity,
        JSON.stringify(inc.geometry),
        inc.ward
      );
      paramCounter += 4;
    });
    
    const queryText = `INSERT INTO crime_incidents (incident_type, severity, geom, ward) VALUES ` + valuePlaceholders.join(', ');
    await client.query(queryText, values);
  }
  console.log(`Successfully generated and seeded 500 synthetic crime incidents.`);
}

async function main() {
  const client = new Client({ connectionString });
  
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    
    // Clear existing data
    console.log('Clearing existing table data...');
    await client.query('TRUNCATE TABLE pois, roads, demographics, crime_incidents RESTART IDENTITY CASCADE;');

    // 1. Seed POIs
    console.log('Parsing faridabad_poi.geojson...');
    const poiPath = path.resolve(__dirname, '../public/faridabad_poi.geojson');
    const poiData = JSON.parse(fs.readFileSync(poiPath, 'utf8'));
    console.log(`Seeding POIs... (${poiData.features.length} features found)`);
    await bulkInsertPOIs(client, poiData.features);

    // 2. Seed Roads
    console.log('Parsing faridabad_roads.geojson... (this may take a few seconds)');
    const roadsPath = path.resolve(__dirname, '../public/faridabad_roads.geojson');
    const roadsData = JSON.parse(fs.readFileSync(roadsPath, 'utf8'));
    console.log(`Seeding Roads... (${roadsData.features.length} features found)`);
    await bulkInsertRoads(client, roadsData.features);

    // 3. Seed Demographics
    console.log('Parsing table-2011-PC11_PCA-TV-0 (1).csv...');
    const csvPath = path.resolve(__dirname, '../public/table-2011-PC11_PCA-TV-0 (1).csv');
    const rawCsv = fs.readFileSync(csvPath, 'utf8');
    const sanitizedCsv = sanitizeCSV(rawCsv);
    const demographicRows = parseCSV(sanitizedCsv);
    console.log(`Seeding Demographics... (${demographicRows.length} rows found)`);
    await bulkInsertDemographics(client, demographicRows);

    // 4. Seed Crime Incidents
    console.log('Generating synthetic crime incidents...');
    await seedCrimeIncidents(client, poiData.features);

    console.log('All spatial and demographic data seeded successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
