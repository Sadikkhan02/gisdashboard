import KPICard from './KPICard';

export default function KPISection({ data }) {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
      <KPICard title="Total Locations" value={data.totalLocations} change={data.totalLocationsChange} changeType="up" />
      <KPICard title="Total Population" value={data.totalPopulation} change={data.totalPopulationChange} changeType="up" />
      <KPICard title="Total Crime" value={data.totalCrime} change={data.totalCrimeChange} changeType="down" />
      <KPICard title="Avg Development" value={data.avgDevelopment} change={data.avgDevelopmentChange} changeType="up" />
    </div>
  );
}
