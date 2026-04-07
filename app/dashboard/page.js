'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import KPISection from '@/components/kpi/KPISection';
import IncidentTrendChart from '@/components/charts/IncidentTrendChart';
import IncidentsByHourChart from '@/components/charts/IncidentsByHourChart';
import IncidentsByCategoryChart from '@/components/charts/IncidentsByCategoryChart';
import MapComponent from '@/components/map/MapComponent';
import FeedPanel from '@/components/feed/FeedPanel';
import DonutChart from '@/components/charts/DonutChart';
import AreaChart from '@/components/charts/AreaChart';
import ChatBox from '@/components/chat/ChatBox';
import Card from '@/components/common/Card';
import { fetchViewportAnalytics } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

function getMockDashboardData() {
  return {
    kpiData: {
      totalLocations: '6',
      totalPopulation: '174,000',
      totalCrime: '808',
      avgDevelopment: '79%',
      totalLocationsChange: 6,
      totalPopulationChange: 4,
      totalCrimeChange: 9,
      avgDevelopmentChange: 2,
    },
    trendData: [
      { label: 'Week 1', crime: 520, baseline: 490 },
      { label: 'Week 2', crime: 610, baseline: 560 },
      { label: 'Week 3', crime: 700, baseline: 640 },
      { label: 'Week 4', crime: 808, baseline: 700 },
    ],
    hourlyData: [
      { label: '06:00', value: 65 },
      { label: '12:00', value: 140 },
      { label: '18:00', value: 210 },
      { label: '22:00', value: 96 },
    ],
    areaData: [
      { label: 'Population', primary: 174, secondary: 145 },
      { label: 'Crime', primary: 808, secondary: 662 },
      { label: 'Development', primary: 79, secondary: 72 },
    ],
    categoryData: [
      { name: 'Theft', value: 305 },
      { name: 'Fraud', value: 298 },
      { name: 'Cyber', value: 95 },
      { name: 'Other', value: 110 },
    ],
    pieData: [
      { name: 'Low', value: 2 },
      { name: 'Medium', value: 2 },
      { name: 'High', value: 2 },
    ],
    mapMarkers: [{ id: 1, position: { lat: 20.5937, lng: 78.9629 } }],
    heatmapPoints: [{ lat: 20.5937, lng: 78.9629, weight: 10 }],
    activeCases: [{ name: 'Active', value: 45 }, { name: 'Other', value: 55 }],
    resolvedCases: [{ name: 'Resolved', value: 30 }, { name: 'Other', value: 70 }],
    pendingCases: [{ name: 'Pending', value: 25 }, { name: 'Other', value: 75 }],
    events: [
      { id: 1, title: 'Accident on Highway', timestamp: '2 min ago', location: 'Sector 12', severity: 'high' },
      { id: 2, title: 'Protest rally', timestamp: '15 min ago', location: 'City Center', severity: 'medium' },
    ],
    summary: {
      locationsInView: 6,
      totalPopulation: 174000,
      totalCrime: 808,
      averageDevelopmentIndex: 0.79,
      dataSource: 'mock',
    },
  };
}

function MetricRow({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [region, setRegion] = useState('All Regions');
  const [dateRange, setDateRange] = useState('Last 7 days');
  const viewport = useAppStore((state) => state.viewport);
  const setViewport = useAppStore((state) => state.setViewport);
  const setLocationData = useAppStore((state) => state.setLocationData);
  const fallbackData = getMockDashboardData();

  const { data: analyticsData, isFetching } = useQuery({
    queryKey: ['viewport-analytics', viewport, region, dateRange],
    queryFn: async () => {
      const data = await fetchViewportAnalytics({ viewport, region, dateRange });
      setLocationData(data.mapMarkers);
      return data;
    },
    enabled: Boolean(viewport),
  });

  const dashboardData = analyticsData || fallbackData;
  const {
    kpiData,
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
    summary,
  } = dashboardData;

  const handleLayerChange = (layer) => {
    console.log('Layer changed:', layer);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar onRegionChange={setRegion} onDateRangeChange={setDateRange} />

      <KPISection data={kpiData} />

      <div className="grid grid-cols-12 gap-4 px-6 pb-6">
        <div className="col-span-12 xl:col-span-8">
          <Card className="overflow-hidden p-0">
            <MapComponent
              markers={mapMarkers}
              heatmapData={heatmapPoints}
              onLayerChange={handleLayerChange}
              onViewportChange={setViewport}
            />
          </Card>
        </div>

        <div className="col-span-12 space-y-4 xl:col-span-4">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Analytics Snapshot</h3>
              <span className="text-xs text-slate-500">{isFetching ? 'Updating...' : summary.dataSource}</span>
            </div>
            <MetricRow label="Locations in View" value={summary.locationsInView} tone="text-teal-700" />
            <MetricRow label="Population in View" value={summary.totalPopulation.toLocaleString()} />
            <MetricRow label="Crime Count" value={summary.totalCrime.toLocaleString()} tone="text-rose-600" />
            <MetricRow label="Avg Development" value={`${Math.round(summary.averageDevelopmentIndex * 100)}%`} tone="text-sky-700" />
          </Card>

          <Card>
            <h3 className="mb-2 font-semibold text-slate-900">Severity Share</h3>
            <DonutChart data={pieData} title="Viewport Severity" />
          </Card>

          <FeedPanel events={events} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 px-6 pb-6">
        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card>
            <h3 className="mb-2 font-semibold">Crime Trend</h3>
            <IncidentTrendChart data={trendData} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card>
            <h3 className="mb-2 font-semibold">Crime Distribution</h3>
            <IncidentsByCategoryChart data={categoryData} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card>
            <h3 className="mb-2 font-semibold">Hourly Pattern</h3>
            <IncidentsByHourChart data={hourlyData} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card>
            <h3 className="mb-2 font-semibold">Comparative Metrics</h3>
            <AreaChart data={areaData} />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 px-6 pb-6">
        <div className="col-span-12 xl:col-span-8">
          <ChatBox />
        </div>
        <div className="col-span-12 grid grid-cols-1 gap-4 md:grid-cols-3 xl:col-span-4 xl:grid-cols-1">
          <Card>
            <DonutChart data={activeCases} title="Active Cases %" />
          </Card>
          <Card>
            <DonutChart data={resolvedCases} title="Resolved Cases %" />
          </Card>
          <Card>
            <DonutChart data={pendingCases} title="Pending Cases %" />
          </Card>
        </div>
      </div>
    </div>
  );
}
