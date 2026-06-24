'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import KPISection from '@/components/kpi/KPISection';
import IncidentTrendChart from '@/components/charts/IncidentTrendChart';
import IncidentsByHourChart from '@/components/charts/IncidentsByHourChart';
import IncidentsByCategoryChart from '@/components/charts/IncidentsByCategoryChart';
import FeedPanel from '@/components/feed/FeedPanel';
import DonutChart from '@/components/charts/DonutChart';
import AreaChart from '@/components/charts/AreaChart';
import ChatBox from '@/components/chat/ChatBox';
import SocketListener from '@/components/chat/SocketListener';
import CallNotificationOverlay from '@/components/chat/CallNotificationOverlay';
import Card from '@/components/common/Card';
import DecisionIntelligencePanel from '@/components/dashboard/DecisionIntelligencePanel';
import AnalyticsStudio from '@/components/dashboard/AnalyticsStudio';
import { clearCurrentUser, readCurrentUser } from '@/lib/auth-session';
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

const emptyDashboardData = {
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
    dataSource: 'N/A',
  },
};

function MetricRow({ label, value, tone = 'text-slate-900', borderClass = 'border-slate-100', labelTone = 'text-slate-500' }) {
  return (
    <div className={`flex items-center justify-between border-b ${borderClass} py-3 last:border-b-0`}>
      <span className={`text-sm ${labelTone}`}>{label}</span>
      <span className={`text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [region, setRegion] = useState('All Regions');
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [selectedPriority, setSelectedPriority] = useState('growth');
  
  const currentUser = useAppStore((state) => state.currentUser);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const logout = useAppStore((state) => state.logout);
  const viewport = useAppStore((state) => state.viewport);
  const setViewport = useAppStore((state) => state.setViewport);
  const setLocationData = useAppStore((state) => state.setLocationData);
  const currentView = useAppStore((state) => state.currentView);
  const isSidebarExpanded = useAppStore((state) => state.isSidebarExpanded);
  const selectedLocation = useAppStore((state) => state.selectedLocation);
  const setSelectedLocation = useAppStore((state) => state.setSelectedLocation);
  
  const fallbackData = emptyDashboardData;

  useEffect(() => {
    const storedUser = readCurrentUser();

    if (!storedUser) {
      router.replace('/login');
      return;
    }

    if (!currentUserId) {
      setCurrentUser(storedUser);
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

  const dashboardData = analyticsData || emptyDashboardData;
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
    clearCurrentUser();
    logout();
    router.replace('/login');
  };

  if (!currentUserId) {
    return <div className="grid min-h-screen place-items-center bg-[#f5f7fb] text-sm text-slate-600">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <SocketListener />
      <CallNotificationOverlay />
      <Sidebar />
      
      <main className={`transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <Navbar
          user={currentUser}
          onLogout={handleLogout}
          onRegionChange={setRegion}
          onDateRangeChange={setDateRange}
        />

        {/* Header Section (Only in Dashboard) */}
        {currentView === 'dashboard' && (
          <section className="px-6 pt-6">
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#168c7a]">Operations overview {selectedLocation ? `— ${selectedLocation.name}` : ''}</p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-950">
                    {selectedLocation ? `Intelligence Report: ${selectedLocation.name}` : 'Geospatial intelligence dashboard'}
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                    {selectedLocation 
                      ? `Displaying hyper-local analytics and safety metrics for ${selectedLocation.name}. Crime count: ${selectedLocation.crime}.`
                      : 'Monitoring regional incident density, crime trends, population exposure, and team response channels.'
                    }
                  </p>
                </div>
                {selectedLocation && (
                  <button 
                    onClick={() => setSelectedLocation(null)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Clear Filter
                  </button>
                )}
                {!selectedLocation && (
                  <div className="rounded-lg bg-[#e9f8f4] px-4 py-3 text-sm text-[#0f4d43]">
                    Signed in as <span className="font-semibold">{currentUser?.name}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <>
            <KPISection 
              isLoading={!analyticsData || isFetching}
              data={selectedLocation ? {
                ...kpiData,
                totalLocations: '1',
                totalCrime: selectedLocation.crime,
                totalPopulation: (selectedLocation.crime * 210).toLocaleString(),
              } : kpiData} 
            />
            <div className="grid grid-cols-12 gap-4 px-6 pb-6">
              <div className="col-span-12 xl:col-span-8">
                <MapComponent
                  key="main-dashboard-map"
                  markers={mapMarkers}
                  heatmapData={heatmapPoints}
                  onLayerChange={handleLayerChange}
                  onViewportChange={setViewport}
                  onMarkerClick={setSelectedLocation}
                />
              </div>
              <div className="col-span-12 space-y-4 xl:col-span-4">
                <Card title={selectedLocation ? `Snapshot: ${selectedLocation.name}` : "Analytics Snapshot"}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{isFetching ? 'Updating...' : summary.dataSource}</span>
                  </div>
                  <MetricRow label="Point ID" value={selectedLocation ? selectedLocation.id.toUpperCase() : 'Aggregated'} tone="text-teal-700" />
                  <MetricRow label="Population Density" value={selectedLocation ? 'High' : summary.totalPopulation.toLocaleString()} />
                  <MetricRow label="Local Crime Index" value={selectedLocation ? selectedLocation.crime : summary.totalCrime.toLocaleString()} tone="text-rose-600" />
                  <MetricRow label="Development" value={selectedLocation ? '82%' : `${Math.round(summary.averageDevelopmentIndex * 100)}%`} tone="text-sky-700" />
                </Card>
                <FeedPanel events={selectedLocation ? events.filter(e => e.location.includes(selectedLocation.name) || e.severity === 'high') : events} />
              </div>
            </div>
          </>
        )}

        {/* Connect View */}
        {currentView === 'connect' && (
          <div className="p-6">
            <div className="rounded-lg border border-slate-200 bg-white p-1 shadow-sm h-[calc(100vh-120px)] overflow-hidden">
               <ChatBox />
            </div>
          </div>
        )}

        {/* Charts View (Analytics Studio) */}
        {currentView === 'charts' && (
          <div className="p-6">
            <AnalyticsStudio />
          </div>
        )}

        {/* Intelligence View */}
        {currentView === 'intelligence' && (
          <div className="grid grid-cols-12 gap-6 p-6 h-[calc(100vh-80px)] overflow-hidden">
            {/* Left: Tactical Map */}
            <div className="col-span-12 xl:col-span-8 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Tactical Map Analysis</h2>
                  <p className="text-xs text-slate-500">Live intelligence gathering based on viewport bounding box</p>
                </div>
                <div className="flex items-center gap-4">
                  <select 
                    value={selectedPriority} 
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="growth">Business Expansion</option>
                    <option value="security">Security Deployment</option>
                    <option value="infrastructure">Infrastructure Dev</option>
                    <option value="emergency">Emergency Response</option>
                    <option value="custom">🛠️ Custom Objective (Manual)</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live Engine Active</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 relative">
                <MapComponent
                  key="intelligence-view-map"
                  markers={mapMarkers}
                  heatmapData={heatmapPoints}
                  onLayerChange={handleLayerChange}
                  onViewportChange={setViewport}
                  onMarkerClick={setSelectedLocation}
                />
              </div>
            </div>

            {/* Right: Intelligence Panel */}
            <div className="col-span-12 xl:col-span-4 h-full overflow-y-auto custom-scrollbar pb-6">
              <div className="bg-slate-900 rounded-xl shadow-2xl p-4 min-h-[800px]">
                <DecisionIntelligencePanel
                  bbox={viewport}
                  priority={selectedPriority}
                />
                
                {/* Tactical Stats Below Panel */}
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-xs font-bold text-white/40 uppercase mb-3 px-1">Resource Allocation</h4>
                    <MetricRow label="Local Units" value="12 Active" tone="text-indigo-400" borderClass="border-white/10" labelTone="text-white/40" />
                    <MetricRow label="Avg Response" value="4.2 mins" tone="text-white" borderClass="border-white/10" labelTone="text-white/40" />
                    <MetricRow label="Coverage" value="94%" tone="text-emerald-400" borderClass="border-white/10" labelTone="text-white/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

