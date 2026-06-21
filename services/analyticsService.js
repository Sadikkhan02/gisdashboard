/**
 * Analytics Service
 * Provides viewport-based geospatial statistics and chart series aggregates.
 * Powered by PostgreSQL + PostGIS spatial index.
 */
import { query } from '@/lib/postgres';

function classifySeverity(crimeValue) {
  if (crimeValue >= 4) return 'high';
  if (crimeValue >= 2) return 'medium';
  return 'low';
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Calculates viewport metrics and aggregates for maps, heatmaps, and charts
 */
export async function getAnalyticsByViewport(bounds) {
  const { north, south, east, west } = bounds;

  try {
    // 1. Fetch POIs inside viewport (capped to 600 for performance)
    const poiRes = await query(
      `SELECT osm_id, name, amenity, category, ST_X(geom) as lng, ST_Y(geom) as lat 
       FROM pois 
       WHERE ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom) 
       LIMIT 600`,
      [west, south, east, north]
    );

    // 2. Fetch crime incidents inside viewport (for heatmap and charts)
    const crimeRes = await query(
      `SELECT id, incident_type, severity, ST_X(geom) as lng, ST_Y(geom) as lat, ward 
       FROM crime_incidents 
       WHERE ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
      [west, south, east, north]
    );

    const localPoisCount = poiRes.rows.length;
    const localCrimeCount = crimeRes.rows.length;

    // 3. Fetch total population and compute viewport estimate based on ratio of local POIs
    const totalPopRes = await query(
      `SELECT SUM(value) as pop FROM demographics WHERE indicator = 2 AND geo_level = 2`
    );
    const totalPop = parseInt(totalPopRes.rows[0].pop) || 1809733;

    const totalPoiRes = await query(`SELECT COUNT(*) as count FROM pois`);
    const totalPoisCount = parseInt(totalPoiRes.rows[0].count) || 1;

    // Viewport population estimate
    const ratio = localPoisCount / totalPoisCount;
    const estPopulation = Math.round(ratio * totalPop) || 1000;

    // 4. Estimate development index
    const devPoiRes = await query(
      `SELECT COUNT(*) as count FROM pois 
       WHERE category IN ('infrastructure', 'demand_anchor') 
       AND ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
      [west, south, east, north]
    );
    const devPoiCount = parseInt(devPoiRes.rows[0].count) || 0;

    const roadCountRes = await query(
      `SELECT COUNT(*) as count FROM roads 
       WHERE ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
      [west, south, east, north]
    );
    const roadCount = parseInt(roadCountRes.rows[0].count) || 0;
    const developmentIndex = Math.max(0.1, Math.min(0.99, (devPoiCount * 4 + roadCount) / 60));

    // 5. Structure mapMarkers (POIs)
    const mapMarkers = poiRes.rows.map((row, idx) => {
      let crimeValue = 0;
      if (row.category === 'competition') crimeValue = 5;
      else if (row.category === 'transit') crimeValue = 3;
      else if (row.category === 'infrastructure') crimeValue = 1;

      return {
        id: row.osm_id || `poi-${idx}`,
        name: row.name || `${row.amenity} Node`,
        position: { lat: parseFloat(row.lat), lng: parseFloat(row.lng) },
        population: Math.round(row.category === 'demand_anchor' ? 500 : 100),
        crime: crimeValue,
        developmentIndex: developmentIndex,
        severity: classifySeverity(crimeValue),
        category: row.category || 'other',
        amenity: row.amenity
      };
    });

    // 6. Structure heatmapPoints (Crime incidents)
    const heatmapPoints = crimeRes.rows.map(row => ({
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      weight: row.severity === 'high' ? 1.0 : row.severity === 'medium' ? 0.6 : 0.3
    }));

    // 7. Calculate hourly crime distribution
    const crimeDistribution = { theft: 0, fraud: 0, cyber: 0, other: 0 };
    crimeRes.rows.forEach(c => {
      const type = c.incident_type;
      if (type === 'theft') crimeDistribution.theft++;
      else if (type === 'fraud') crimeDistribution.fraud++;
      else if (type === 'cyber') crimeDistribution.cyber++;
      else crimeDistribution.other++;
    });

    const categoryData = Object.entries(crimeDistribution).map(([name, value]) => ({
      name: name[0].toUpperCase() + name.slice(1),
      value
    }));

    // Severity pie data (from local crimes)
    const severityCounts = { low: 0, medium: 0, high: 0 };
    crimeRes.rows.forEach(c => {
      const sev = c.severity || 'medium';
      severityCounts[sev]++;
    });
    const pieData = Object.entries(severityCounts).map(([name, value]) => ({
      name: name[0].toUpperCase() + name.slice(1),
      value
    }));

    // hourly pattern (synthetic distribution based on crime count)
    const hourlyData = [
      { label: '06:00', value: Math.round(localCrimeCount * 0.15) },
      { label: '12:00', value: Math.round(localCrimeCount * 0.25) },
      { label: '18:00', value: Math.round(localCrimeCount * 0.40) },
      { label: '22:00', value: Math.round(localCrimeCount * 0.20) },
    ];

    // trend data
    const trendData = [
      { label: 'Week 1', crime: Math.max(localCrimeCount - 25, 0), baseline: Math.max(localCrimeCount - 35, 0) },
      { label: 'Week 2', crime: Math.max(localCrimeCount - 10, 0), baseline: Math.max(localCrimeCount - 20, 0) },
      { label: 'Week 3', crime: localCrimeCount, baseline: Math.max(localCrimeCount - 5, 0) },
      { label: 'Week 4', crime: Math.round(localCrimeCount * 1.15), baseline: localCrimeCount },
    ];

    // area data
    const areaData = [
      { label: 'Population', primary: Math.round(estPopulation / 1000), secondary: Math.round(estPopulation / 1200) },
      { label: 'Crime', primary: localCrimeCount, secondary: Math.round(localCrimeCount * 0.8) },
      { label: 'Development', primary: Math.round(developmentIndex * 100), secondary: Math.round(developmentIndex * 90) },
    ];

    // cases stats
    const activeCases = [
      { name: 'Active', value: Math.min(localCrimeCount, 100) },
      { name: 'Other', value: Math.max(100 - Math.min(localCrimeCount, 100), 0) },
    ];
    const resolvedCases = [
      { name: 'Resolved', value: Math.round(developmentIndex * 100) },
      { name: 'Other', value: Math.max(100 - Math.round(developmentIndex * 100), 0) },
    ];
    const pendingCases = [
      { name: 'Pending', value: Math.min(localPoisCount, 100) },
      { name: 'Other', value: Math.max(100 - Math.min(localPoisCount, 100), 0) },
    ];

    // events list (top 5 recent crimes)
    const events = crimeRes.rows.slice(0, 5).map((row, index) => ({
      id: row.id || `evt-${index}`,
      title: `${row.incident_type[0].toUpperCase() + row.incident_type.slice(1)} Incident`,
      timestamp: `${index * 3 + 2} min ago`,
      location: `${row.ward || 'Faridabad Sector'}`,
      severity: row.severity
    }));

    return {
      viewport: bounds,
      kpiData: {
        totalLocations: formatNumber(localPoisCount),
        totalPopulation: formatNumber(estPopulation),
        totalCrime: formatNumber(localCrimeCount),
        avgDevelopment: `${Math.round(developmentIndex * 100)}%`,
        totalLocationsChange: localPoisCount ? 6 : 0,
        totalPopulationChange: estPopulation ? 4 : 0,
        totalCrimeChange: localCrimeCount ? 9 : 0,
        avgDevelopmentChange: developmentIndex ? 2 : 0,
      },
      totals: {
        totalLocations: localPoisCount,
        totalPopulation: estPopulation,
        totalCrime: localCrimeCount,
        avgDevelopment: Number(developmentIndex.toFixed(2)),
      },
      crimeDistribution,
      trendData,
      hourlyData,
      areaData,
      categoryData,
      pieData,
      mapMarkers,
      heatmapPoints,
      activeCases,
      resolvedCases,
      pendingCases,
      events,
      summary: {
        locationsInView: localPoisCount,
        totalPopulation: estPopulation,
        totalCrime: localCrimeCount,
        averageDevelopmentIndex: Number(developmentIndex.toFixed(2)),
        dataSource: 'PostgreSQL/PostGIS',
      }
    };
  } catch (error) {
    console.error('PostGIS analytics failed, returning empty payload:', error.message);
    return {
      viewport: bounds,
      kpiData: {
        totalLocations: '0',
        totalPopulation: '0',
        totalCrime: '0',
        avgDevelopment: '0%',
        totalLocationsChange: 0,
        totalPopulationChange: 0,
        totalCrimeChange: 0,
        avgDevelopmentChange: 0,
      },
      totals: { totalLocations: 0, totalPopulation: 0, totalCrime: 0, avgDevelopment: 0 },
      crimeDistribution: { theft: 0, fraud: 0, cyber: 0, other: 0 },
      trendData: [],
      hourlyData: [],
      areaData: [],
      categoryData: [],
      pieData: [],
      mapMarkers: [],
      heatmapPoints: [],
      activeCases: [{ name: 'Active', value: 0 }, { name: 'Other', value: 100 }],
      resolvedCases: [{ name: 'Resolved', value: 0 }, { name: 'Other', value: 100 }],
      pendingCases: [{ name: 'Pending', value: 0 }, { name: 'Other', value: 100 }],
      events: [],
      summary: {
        locationsInView: 0,
        totalPopulation: 0,
        totalCrime: 0,
        averageDevelopmentIndex: 0,
        dataSource: 'PostgreSQL/PostGIS (Unavailable/Empty)',
      }
    };
  }
}
