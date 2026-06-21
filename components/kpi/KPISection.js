import KPICard from './KPICard';

export default function KPISection({ data, isLoading }) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="min-h-[132px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse flex flex-col justify-between">
            <div className="h-4 w-28 rounded bg-slate-200"></div>
            <div className="h-8 w-20 rounded bg-slate-300 mt-3"></div>
            <div className="h-4 w-36 rounded bg-slate-200 mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
      <KPICard title="Total Locations" value={data.totalLocations} change={data.totalLocationsChange} changeType="up" />
      <KPICard title="Total Population" value={data.totalPopulation} change={data.totalPopulationChange} changeType="up" />
      <KPICard title="Total Crime" value={data.totalCrime} change={data.totalCrimeChange} changeType="down" />
      <KPICard title="Avg Development" value={data.avgDevelopment} change={data.avgDevelopmentChange} changeType="up" />
    </div>
  );
}

