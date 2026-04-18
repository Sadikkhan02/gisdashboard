'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import KPISection from '@/components/kpi/KPISection';
import IncidentTrendChart from '@/components/charts/IncidentTrendChart';
import IncidentsByHourChart from '@/components/charts/IncidentsByHourChart';
import IncidentsByCategoryChart from '@/components/charts/IncidentsByCategoryChart';
import FeedPanel from '@/components/feed/FeedPanel';
import DonutChart from '@/components/charts/DonutChart';
import AreaChart from '@/components/charts/AreaChart';
import ChatBox from '@/components/chat/ChatBox';
import Card from '@/components/common/Card';
import { fetchViewportAnalytics } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[560px] place-items-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-600">
      Loading Leaflet map...
    </div>
  ),
});

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
    mapMarkers: [
      { id: 'delhi', name: 'Delhi Central', position: { lat: 28.6139, lng: 77.209 }, crime: 165 },
      { id: 'mumbai', name: 'Mumbai Harbor', position: { lat: 19.076, lng: 72.8777 }, crime: 210 },
      { id: 'bengaluru', name: 'Bengaluru Tech Park', position: { lat: 12.9716, lng: 77.5946 }, crime: 95 },
      { id: 'hyderabad', name: 'Hyderabad West', position: { lat: 17.385, lng: 78.4867 }, crime: 110 },
      { id: 'kolkata', name: 'Kolkata North', position: { lat: 22.5726, lng: 88.3639 }, crime: 140 },
      { id: 'chennai', name: 'Chennai Port', position: { lat: 13.0827, lng: 80.2707 }, crime: 88 },
    ],
    heatmapPoints: [
      { lat: 28.6139, lng: 77.209, weight: 165 },
      { lat: 19.076, lng: 72.8777, weight: 210 },
      { lat: 12.9716, lng: 77.5946, weight: 95 },
      { lat: 17.385, lng: 78.4867, weight: 110 },
      { lat: 22.5726, lng: 88.3639, weight: 140 },
      { lat: 13.0827, lng: 80.2707, weight: 88 },
    ],
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
  const router = useRouter();
  const [region, setRegion] = useState('All Regions');
  const [dateRange, setDateRange] = useState('Last 7 days');
  const currentUser = useAppStore((state) => state.currentUser);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const logout = useAppStore((state) => state.logout);
  const viewport = useAppStore((state) => state.viewport);
  const setViewport = useAppStore((state) => state.setViewport);
  const setLocationData = useAppStore((state) => state.setLocationData);
  const fallbackData = getMockDashboardData();

  useEffect(() => {
    const storedUser = window.localStorage.getItem('geo-dashboard-user');

    if (!storedUser) {
      router.replace('/login');
      return;
    }

    if (!currentUserId) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, [currentUserId, router, setCurrentUser]);

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

  const handleLogout = () => {
    window.localStorage.removeItem('geo-dashboard-user');
    logout();
    router.replace('/login');
  };

  if (!currentUserId) {
    return <div className="grid min-h-screen place-items-center bg-[#f5f7fb] text-sm text-slate-600">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onRegionChange={setRegion}
        onDateRangeChange={setDateRange}
      />

      <section className="px-6 pt-6">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#168c7a]">Operations overview</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">Geospatial intelligence dashboard</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                Monitoring regional incident density, crime trends, population exposure, and team response channels.
              </p>
            </div>
            <div className="rounded-lg bg-[#e9f8f4] px-4 py-3 text-sm text-[#0f4d43]">
              Signed in as <span className="font-semibold">{currentUser?.name}</span>
            </div>
          </div>
        </div>
      </section>

      <KPISection data={kpiData} />

      <div className="grid grid-cols-12 gap-4 px-6 pb-6">
        <div className="col-span-12 xl:col-span-8">
          <MapComponent
            markers={mapMarkers}
            heatmapData={heatmapPoints}
            onLayerChange={handleLayerChange}
            onViewportChange={setViewport}
          />
        </div>

        <div className="col-span-12 space-y-4 xl:col-span-4">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-950">Analytics Snapshot</h3>
              <span className="text-xs text-slate-500">{isFetching ? 'Updating...' : summary.dataSource}</span>
            </div>
            <MetricRow label="Locations in View" value={summary.locationsInView} tone="text-teal-700" />
            <MetricRow label="Population in View" value={summary.totalPopulation.toLocaleString()} />
            <MetricRow label="Crime Count" value={summary.totalCrime.toLocaleString()} tone="text-rose-600" />
            <MetricRow label="Avg Development" value={`${Math.round(summary.averageDevelopmentIndex * 100)}%`} tone="text-sky-700" />
          </Card>

          <Card>
            <h3 className="mb-1 font-semibold text-slate-950">Severity Share</h3>
            <p className="mb-3 text-xs text-slate-500">Low, medium, and high severity incidents inside the current viewport.</p>
            <DonutChart data={pieData} title="Viewport Severity" />
          </Card>

          <FeedPanel events={events} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 px-6 pb-6">
        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card>
            <h3 className="mb-1 font-semibold text-slate-950">Crime Trend</h3>
            <p className="mb-3 text-xs text-slate-500">Weekly reported incidents compared with the historical baseline.</p>
            <IncidentTrendChart data={trendData} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card>
            <h3 className="mb-1 font-semibold text-slate-950">Crime Distribution</h3>
            <p className="mb-3 text-xs text-slate-500">Incident count grouped by category for the selected region.</p>
            <IncidentsByCategoryChart data={categoryData} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card>
            <h3 className="mb-1 font-semibold text-slate-950">Hourly Pattern</h3>
            <p className="mb-3 text-xs text-slate-500">Incidents by time of day with expected activity as comparison.</p>
            <IncidentsByHourChart data={hourlyData} />
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card>
            <h3 className="mb-1 font-semibold text-slate-950">Comparative Metrics</h3>
            <p className="mb-3 text-xs text-slate-500">Population, crime, and development values against previous period.</p>
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
