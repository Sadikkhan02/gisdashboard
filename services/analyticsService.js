import Location from '@/models/Location';
import { dbConnect } from '@/lib/mongodb';

const sampleLocations = [
  {
    id: 'loc-1',
    name: 'Delhi Central',
    category: 'theft',
    location: { type: 'Point', coordinates: [77.209, 28.6139] },
    population: 32000,
    crime: 165,
    developmentIndex: 0.74,
  },
  {
    id: 'loc-2',
    name: 'Mumbai Harbor',
    category: 'fraud',
    location: { type: 'Point', coordinates: [72.8777, 19.076] },
    population: 41000,
    crime: 210,
    developmentIndex: 0.8,
  },
  {
    id: 'loc-3',
    name: 'Bengaluru Tech Park',
    category: 'cyber',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    population: 28000,
    crime: 95,
    developmentIndex: 0.88,
  },
  {
    id: 'loc-4',
    name: 'Hyderabad West',
    category: 'other',
    location: { type: 'Point', coordinates: [78.4867, 17.385] },
    population: 24000,
    crime: 110,
    developmentIndex: 0.82,
  },
  {
    id: 'loc-5',
    name: 'Kolkata North',
    category: 'theft',
    location: { type: 'Point', coordinates: [88.3639, 22.5726] },
    population: 26000,
    crime: 140,
    developmentIndex: 0.7,
  },
  {
    id: 'loc-6',
    name: 'Chennai Port',
    category: 'fraud',
    location: { type: 'Point', coordinates: [80.2707, 13.0827] },
    population: 23000,
    crime: 88,
    developmentIndex: 0.79,
  }
];

function inBounds(location, bounds) {
  const [lng, lat] = location.location.coordinates;

  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

function classifySeverity(crime) {
  if (crime >= 160) return 'high';
  if (crime >= 110) return 'medium';
  return 'low';
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function getChartSeries(totalCrime, totalPopulation, averageDevelopmentIndex, count) {
  return {
    trendData: [
      { label: 'Week 1', crime: Math.max(totalCrime - 40, 0), baseline: Math.max(totalCrime - 55, 0) },
      { label: 'Week 2', crime: Math.max(totalCrime - 20, 0), baseline: Math.max(totalCrime - 30, 0) },
      { label: 'Week 3', crime: totalCrime, baseline: Math.max(totalCrime - 10, 0) },
      { label: 'Week 4', crime: totalCrime + Math.round(count * 8), baseline: totalCrime },
    ],
    hourlyData: [
      { label: '06:00', value: Math.round(totalCrime * 0.08) },
      { label: '12:00', value: Math.round(totalCrime * 0.18) },
      { label: '18:00', value: Math.round(totalCrime * 0.26) },
      { label: '22:00', value: Math.round(totalCrime * 0.12) },
    ],
    areaData: [
      { label: 'Population', primary: Math.round(totalPopulation / 1000), secondary: Math.round(totalPopulation / 1200) },
      { label: 'Crime', primary: totalCrime, secondary: Math.round(totalCrime * 0.82) },
      { label: 'Development', primary: Math.round(averageDevelopmentIndex * 100), secondary: Math.round(averageDevelopmentIndex * 92) },
    ],
  };
}

function buildAnalyticsPayload(locations, bounds) {
  const normalized = locations.map((item) => ({
    ...item,
    category: item.category || 'other',
  }));

  const totalPopulation = normalized.reduce((sum, item) => sum + item.population, 0);
  const totalCrime = normalized.reduce((sum, item) => sum + item.crime, 0);
  const averageDevelopmentIndex =
    normalized.length > 0
      ? normalized.reduce((sum, item) => sum + item.developmentIndex, 0) / normalized.length
      : 0;

  const severityCounts = normalized.reduce(
    (accumulator, item) => {
      const severity = classifySeverity(item.crime);
      accumulator[severity] += 1;
      return accumulator;
    },
    { low: 0, medium: 0, high: 0 }
  );

  const crimeDistribution = normalized.reduce(
    (accumulator, item) => {
      const key = item.category || 'other';
      accumulator[key] = (accumulator[key] || 0) + item.crime;
      return accumulator;
    },
    { theft: 0, fraud: 0, cyber: 0, other: 0 }
  );

  const markers = normalized.map((item) => {
    const [lng, lat] = item.location.coordinates;

    return {
      id: item._id?.toString?.() || item.id || item.name,
      name: item.name,
      position: { lat, lng },
      population: item.population,
      crime: item.crime,
      developmentIndex: item.developmentIndex,
      severity: classifySeverity(item.crime),
      category: item.category,
    };
  });

  const { trendData, hourlyData, areaData } = getChartSeries(
    totalCrime,
    totalPopulation,
    averageDevelopmentIndex,
    normalized.length
  );

  const categoryData = Object.entries(crimeDistribution).map(([category, count]) => ({
    name: category[0].toUpperCase() + category.slice(1),
    value: count,
  }));

  const severityPieData = Object.entries(severityCounts).map(([name, value]) => ({
    name: name[0].toUpperCase() + name.slice(1),
    value,
  }));

  return {
    viewport: bounds,
    kpiData: {
      totalLocations: formatNumber(normalized.length),
      totalPopulation: formatNumber(totalPopulation),
      totalCrime: formatNumber(totalCrime),
      avgDevelopment: `${Math.round(averageDevelopmentIndex * 100)}%`,
      totalLocationsChange: normalized.length ? 6 : 0,
      totalPopulationChange: totalPopulation ? 4 : 0,
      totalCrimeChange: totalCrime ? 9 : 0,
      avgDevelopmentChange: averageDevelopmentIndex ? 2 : 0,
    },
    totals: {
      totalLocations: normalized.length,
      totalPopulation,
      totalCrime,
      avgDevelopment: Number(averageDevelopmentIndex.toFixed(2)),
    },
    crimeDistribution,
    trendData,
    hourlyData,
    areaData,
    categoryData,
    pieData: severityPieData,
    mapMarkers: markers,
    heatmapPoints: markers.map((marker) => ({
      lat: marker.position.lat,
      lng: marker.position.lng,
      weight: marker.crime,
    })),
    activeCases: [
      { name: 'Active', value: Math.min(totalCrime, 100) },
      { name: 'Other', value: Math.max(100 - Math.min(totalCrime, 100), 0) },
    ],
    resolvedCases: [
      { name: 'Resolved', value: Math.round(averageDevelopmentIndex * 100) },
      { name: 'Other', value: Math.max(100 - Math.round(averageDevelopmentIndex * 100), 0) },
    ],
    pendingCases: [
      { name: 'Pending', value: Math.min(normalized.length * 10, 100) },
      { name: 'Other', value: Math.max(100 - Math.min(normalized.length * 10, 100), 0) },
    ],
    events: markers.slice(0, 5).map((marker, index) => ({
      id: marker.id,
      title: `${marker.name} update`,
      timestamp: `${index + 1} min ago`,
      location: `${marker.position.lat.toFixed(2)}, ${marker.position.lng.toFixed(2)}`,
      severity: marker.severity,
    })),
    summary: {
      locationsInView: normalized.length,
      totalPopulation,
      totalCrime,
      averageDevelopmentIndex: Number(averageDevelopmentIndex.toFixed(2)),
      dataSource: 'mongodb',
    },
  };
}

export async function getAnalyticsByViewport(bounds) {
  try {
    await dbConnect();

    const locations = await Location.find({
      location: {
        $geoWithin: {
          $box: [
            [bounds.west, bounds.south],
            [bounds.east, bounds.north],
          ],
        },
      },
    })
      .lean()
      .limit(250);

    if (locations.length > 0) {
      return buildAnalyticsPayload(locations, bounds);
    }
  } catch {
    // Fall back to in-memory sample data so the analytics layer remains testable.
  }

  const fallbackLocations = sampleLocations.filter((location) => inBounds(location, bounds));
  const payload = buildAnalyticsPayload(fallbackLocations, bounds);

  return {
    ...payload,
    summary: {
      ...payload.summary,
      dataSource: 'sample-fallback',
    },
  };
}
