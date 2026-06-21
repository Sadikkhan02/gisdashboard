"use client";

import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { Shield, TrendingUp, Users, Activity, Target, Zap, AlertCircle } from 'lucide-react';

const DecisionIntelligencePanel = ({ bbox, priority = 'growth' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customWeights, setCustomWeights] = useState({
    safety: 0.25,
    density: 0.25,
    growth: 0.25,
    connectivity: 0.25
  });

  useEffect(() => {
    if (bbox) {
      fetchAnalysis();
    }
  }, [bbox, priority, customWeights]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const minLat = bbox.south;
      const minLng = bbox.west;
      const maxLat = bbox.north;
      const maxLng = bbox.east;
      
      if (minLat === undefined || minLng === undefined) return;

      let url = `/api/decision?minLat=${minLat}&minLng=${minLng}&maxLat=${maxLat}&maxLng=${maxLng}&priority=${priority}`;
      
      if (priority === 'custom') {
        url += `&w_safety=${customWeights.safety}&w_density=${customWeights.density}&w_growth=${customWeights.growth}&w_connectivity=${customWeights.connectivity}`;
      }

      const res = await fetch(url);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!bbox) return null;

  // Show animated skeleton loaders while loading initial data
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-slate-900/90 rounded-xl border border-white/10 shadow-2xl animate-pulse min-h-[600px] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/10 rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-4 w-28 bg-white/10 rounded"></div>
              <div className="h-3 w-16 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>

        <div className="flex justify-center py-6">
          <div className="w-36 h-36 rounded-full border-8 border-white/5 flex items-center justify-center">
            <div className="space-y-2 flex flex-col items-center">
              <div className="h-6 w-12 bg-white/10 rounded"></div>
              <div className="h-3 w-16 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>

        <div className="h-40 w-full bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-2 border-dashed border-white/10 animate-spin"></div>
        </div>

        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded"></div>
          <div className="h-3 w-full bg-white/10 rounded"></div>
          <div className="h-3 w-3/4 bg-white/10 rounded"></div>
        </div>

        <div className="space-y-2">
          <div className="h-3 w-28 bg-white/10 rounded mb-3"></div>
          <div className="h-8 w-full bg-white/5 rounded border border-white/5"></div>
          <div className="h-8 w-full bg-white/5 rounded border border-white/5"></div>
        </div>
      </div>
    );
  }

  const radarData = data ? [
    { subject: 'Safety', A: data.metrics.safety * 100, fullMark: 100 },
    { subject: 'Growth', A: data.metrics.growth * 100, fullMark: 100 },
    { subject: 'Density', A: data.metrics.density * 100, fullMark: 100 },
    { subject: 'Transit', A: data.metrics.connectivity * 100, fullMark: 100 },
  ] : [];

  return (
    <div className="flex flex-col gap-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">D3 Intelligence</h3>
            <p className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">Priority: {priority}</p>
          </div>
        </div>
        {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-400 border-t-transparent" />}
      </div>

      {/* Custom Weights Sliders */}
      {priority === 'custom' && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-xl border border-white/10 mb-2">
          {Object.entries(customWeights).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[9px] font-bold text-white/50 uppercase tracking-tighter">{key}</label>
                <span className="text-[9px] font-mono text-indigo-400">{(value * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={value} 
                onChange={(e) => setCustomWeights(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          ))}
          <p className="col-span-2 text-[8px] text-white/30 text-center italic">Adjust sliders to define your custom business objective.</p>
        </div>
      )}

      {error ? (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : data && (
        <>
          {/* Suitability Gauge Circle */}
          <div className="relative flex justify-center py-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-white/5"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * data.suitabilityScore) / 100}
                  strokeLinecap="round"
                  className={`${data.suitabilityScore > 70 ? 'text-emerald-400' : data.suitabilityScore > 40 ? 'text-amber-400' : 'text-rose-400'} transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black text-white">{data.suitabilityScore}%</span>
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">{data.rating}</span>
              </div>
            </div>
            {/* Pulsating background glow */}
            <div className={`absolute inset-0 m-auto w-32 h-32 blur-3xl opacity-20 rounded-full ${data.suitabilityScore > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>

          {/* Radar Chart */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#ffffff33" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff88', fontSize: 10 }} />
                <Radar
                  name="Metrics"
                  dataKey="A"
                  stroke="#818cf8"
                  fill="#818cf8"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Recommendation Card */}
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">Strategic Recommendation</p>
                <p className="text-xs text-indigo-100 leading-relaxed opacity-90">{data.recommendation}</p>
              </div>
            </div>
          </div>

          {/* Key Insights List */}
          <div className="space-y-2 mb-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">Tactical Observations</p>
            {data.keyInsights.map((insight, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                <Activity className="w-3 h-3 text-indigo-400" />
                <span className="text-[11px] text-white/80">{insight}</span>
              </div>
            ))}
          </div>

          {/* Footer Metadata */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-white/40">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-indigo-400">Source:</span>
              <span>{data.dataSource || 'PostgreSQL/PostGIS'}</span>
            </div>
            <div>
              <span>Computed: {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'N/A'}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DecisionIntelligencePanel;
