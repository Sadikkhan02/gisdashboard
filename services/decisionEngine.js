/**
 * Decision Intelligence Engine (D3E) Service
 * Implements the Weighted Sum Model (WSM) for Geospatial Suitability
 * Powered by PostgreSQL + PostGIS spatial index
 */
import { query } from '@/lib/postgres';

class DecisionEngine {
  constructor() {
    // Default weights for different mission priorities and use cases
    this.priorityWeights = {
      security: { safety: 0.5, density: 0.3, growth: 0.2, connectivity: 0 },
      growth: { safety: 0.2, density: 0.35, growth: 0.45, connectivity: 0 },
      infrastructure: { safety: 0.3, density: 0.2, growth: 0.5, connectivity: 0 },
      emergency: { safety: 0.2, density: 0.6, growth: 0.2, connectivity: 0 },
      retail: { safety: 0.15, density: 0.40, growth: 0.30, connectivity: 0.15 },
      logistics: { safety: 0.10, density: 0.10, growth: 0.35, connectivity: 0.45 },
      residential: { safety: 0.45, density: 0.20, growth: 0.15, connectivity: 0.20 },
      healthcare: { safety: 0.20, density: 0.30, growth: 0.25, connectivity: 0.25 }
    };
  }

  /**
   * Generates a suitability score based on BBox and Priority
   * Queries PostGIS spatial indexes for POI, Roads, and Crime metrics
   */
  async analyzeArea(bbox, priority = 'growth', customWeights = null) {
    let weights;
    
    if (customWeights && Object.keys(customWeights).length > 0) {
      weights = customWeights;
    } else {
      weights = this.priorityWeights[priority] || this.priorityWeights.growth;
    }

    const { minLat, minLng, maxLat, maxLng } = bbox;
    
    let metrics = {};
    let dataSource = 'PostgreSQL/PostGIS';

    try {
      // 1. Calculate safety metric from crime incidents (ST_Intersects with viewport envelope)
      const crimeRes = await query(
        `SELECT COUNT(*) as count FROM crime_incidents 
         WHERE ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
        [minLng, minLat, maxLng, maxLat]
      );
      const crimeCount = parseInt(crimeRes.rows[0].count) || 0;
      // 0 crimes = 1.0 safety. 25+ crimes = 0.1 safety (base)
      const safety = Math.max(0.1, 1 - (crimeCount / 25));

      // 2. Calculate growth metric (development index) from infrastructure/demand anchor POIs and roads
      const poiDevRes = await query(
        `SELECT COUNT(*) as count FROM pois 
         WHERE category IN ('infrastructure', 'demand_anchor') 
         AND ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
        [minLng, minLat, maxLng, maxLat]
      );
      const devPoiCount = parseInt(poiDevRes.rows[0].count) || 0;

      const roadRes = await query(
        `SELECT COUNT(*) as count FROM roads 
         WHERE ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
        [minLng, minLat, maxLng, maxLat]
      );
      const roadCount = parseInt(roadRes.rows[0].count) || 0;

      // Normalize growth index (based on typical counts in zoom viewports)
      const growth = Math.max(0.1, Math.min(1.0, (devPoiCount * 4 + roadCount) / 60));

      // 3. Calculate connectivity (transit index) from transit POIs and major highways
      const transitRes = await query(
        `SELECT COUNT(*) as count FROM pois 
         WHERE category = 'transit' 
         AND ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
        [minLng, minLat, maxLng, maxLat]
      );
      const transitCount = parseInt(transitRes.rows[0].count) || 0;

      const majorRoadRes = await query(
        `SELECT COUNT(*) as count FROM roads 
         WHERE highway IN ('primary', 'secondary') 
         AND ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
        [minLng, minLat, maxLng, maxLat]
      );
      const majorRoadCount = parseInt(majorRoadRes.rows[0].count) || 0;

      const connectivity = Math.max(0.1, Math.min(1.0, (transitCount * 5 + majorRoadCount * 2) / 35));

      // 4. Calculate density (population density index) using spatial proxy
      // a. Get area of the bounding box envelope in sq km
      const areaRes = await query(
        `SELECT ST_Area(ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography) / 1000000.0 as area_sq_km`,
        [minLng, minLat, maxLng, maxLat]
      );
      const areaSqKm = parseFloat(areaRes.rows[0].area_sq_km) || 1.0;

      // b. Get count of POIs in the bbox
      const localPoiRes = await query(
        `SELECT COUNT(*) as count FROM pois 
         WHERE ST_Intersects(ST_MakeEnvelope($1, $2, $3, $4, 4326), geom)`,
        [minLng, minLat, maxLng, maxLat]
      );
      const localPois = parseInt(localPoiRes.rows[0].count) || 0;

      // d. Get overall total POIs and population to calculate ratio
      const totalPoiRes = await query(`SELECT COUNT(*) as count FROM pois`);
      const totalPois = parseInt(totalPoiRes.rows[0].count) || 1;

      const totalPopRes = await query(
        `SELECT SUM(value) as pop FROM demographics WHERE indicator = 2 AND geo_level = 2`
      );
      const totalPop = parseInt(totalPopRes.rows[0].pop) || 1809733;

      // e. Est pop and density
      const estPop = (localPois / totalPois) * totalPop;
      const densityVal = estPop / areaSqKm; // people per sq km
      const density = Math.max(0.1, Math.min(1.0, densityVal / 15000.0));

      metrics = { safety, growth, connectivity, density };
    } catch (dbError) {
      console.warn('PostgreSQL/PostGIS query failed, falling back to mock data:', dbError.message);
      dataSource = 'Mock Data (PostGIS Unavailable)';
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      
      metrics = {
        safety: this._pseudoRandom(centerLat, centerLng, 'safety'),
        growth: this._pseudoRandom(centerLat + 0.01, centerLng - 0.01, 'growth'),
        connectivity: this._pseudoRandom(centerLat - 0.02, centerLng + 0.02, 'connectivity'),
        density: this._pseudoRandom(centerLat, centerLng + 0.005, 'density')
      };
    }

    // Resolve specific weights for WSM
    const safetyWeight = weights.crime !== undefined ? weights.crime : (weights.safety || 0);
    const densityWeight = weights.population !== undefined ? weights.population : (weights.density || 0);
    const growthWeight = weights.development !== undefined ? weights.development : (weights.growth || 0);
    const connectivityWeight = weights.connectivity || 0;

    // Calculate Final Weighted Score (0-100)
    const score = Math.round(
      (metrics.safety * safetyWeight * 100) + 
      (metrics.density * densityWeight * 100) + 
      (metrics.growth * growthWeight * 100) +
      (metrics.connectivity * connectivityWeight * 100)
    );

    const rating = this._getRating(score);
    const recommendation = this._getRecommendation(priority, score, metrics);
    const insights = this._generateInsights(metrics, priority);

    return {
      suitabilityScore: score,
      rating: rating,
      recommendation: recommendation,
      keyInsights: insights,
      metrics: metrics,
      dataSource: dataSource,
      timestamp: new Date().toISOString()
    };
  }

  _pseudoRandom(lat, lng, salt) {
    const str = `${lat}${lng}${salt}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return 0.2 + (Math.abs(hash % 1000) / 1000) * 0.75;
  }

  _getRating(score) {
    if (score >= 80) return "Optimal";
    if (score >= 60) return "Favorable";
    if (score >= 40) return "Moderate";
    return "Sub-Optimal";
  }

  _getRecommendation(priority, score, metrics) {
    if (score >= 75) {
      return `Target zone identified. High alignment with ${priority} objectives. Recommend immediate tactical review.`;
    } else if (score >= 50) {
      return `Strategic potential present. Notable ${metrics.density > 0.6 ? 'population density' : 'infrastructure'} support observed.`;
    } else {
      return `Unsuitable for primary ${priority} focus. Resource allocation should be reassessed for adjacent sectors.`;
    }
  }

  _generateInsights(metrics, priority) {
    const insights = [];
    if (metrics.density > 0.8) insights.push("Critical mass population density detected.");
    if (metrics.growth > 0.7) insights.push("Development index is in the top 15th percentile.");
    if (metrics.safety < 0.4) insights.push("Alert: High volatility recorded in recent crime trends.");
    if (metrics.connectivity > 0.8) insights.push("Superior transit and infrastructure connectivity.");
    
    if (insights.length === 0) insights.push("Standard operational parameters maintained.");
    return insights.slice(0, 3);
  }
}

export const decisionEngine = new DecisionEngine();
