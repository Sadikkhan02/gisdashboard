/**
 * Decision Intelligence Engine (D3E) Service
 * Implements the Weighted Sum Model (WSM) for Geospatial Suitability
 */

class DecisionEngine {
  constructor() {
    // Default weights for different mission priorities
    this.priorityWeights = {
      security: { crime: 0.5, population: 0.3, development: 0.2 },
      growth: { development: 0.45, population: 0.35, crime: 0.2 },
      infrastructure: { development: 0.5, population: 0.2, crime: 0.3 },
      emergency: { population: 0.6, development: 0.2, crime: 0.2 }
    };
  }

  /**
   * Generates a suitability score based on BBox and Priority
   * In a production environment, this would query PostGIS or external Gov APIs.
   * For the prototype, it uses a deterministic heuristic based on coordinates.
   */
  async analyzeArea(bbox, priority = 'growth', customWeights = null) {
    let weights;
    
    if (customWeights && Object.keys(customWeights).length > 0) {
      weights = customWeights;
    } else {
      weights = this.priorityWeights[priority] || this.priorityWeights.growth;
    }
    
    // Extract lat/lng center to use as seed for deterministic "realism"
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;
    
    // Simulate real-world variances based on location
    // In reality, these values would come from our DB/GeoJSON layers
    const metrics = {
      safety: this._pseudoRandom(centerLat, centerLng, 'safety'),
      growth: this._pseudoRandom(centerLat + 0.01, centerLng - 0.01, 'growth'),
      connectivity: this._pseudoRandom(centerLat - 0.02, centerLng + 0.02, 'connectivity'),
      density: this._pseudoRandom(centerLat, centerLng + 0.005, 'density')
    };

    // Calculate Final Weighted Score (0-100)
    const score = Math.round(
      (metrics.safety * (weights.crime || weights.safety || 0) * 100) + 
      (metrics.density * (weights.population || weights.density || 0) * 100) + 
      (metrics.growth * (weights.development || weights.growth || 0) * 100) +
      (metrics.connectivity * (weights.connectivity || weights.transit || 0) * 100)
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
      timestamp: new Date().toISOString()
    };
  }

  _pseudoRandom(lat, lng, salt) {
    // Generates a deterministic float between 0.2 and 0.95 based on coordinates
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
