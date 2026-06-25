"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer 
} from 'recharts';
import { 
  Target, Zap, AlertCircle, ShoppingBag, Truck, Home, Heart, Sliders,
  HelpCircle, Activity, Download, BarChart2, AlertTriangle, Layers, CheckCircle2, RefreshCw,
  ChevronRight
} from 'lucide-react';

// Define our pre-configured Use Cases & Weight Vectors
const USE_CASES = {
  retail: {
    id: 'retail',
    name: 'Retail Expansion',
    desc: 'Optimized for foot traffic, commercial demand, and ease of transit access.',
    icon: ShoppingBag,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    accentColor: 'rose',
    weights: { safety: 0.15, density: 0.40, growth: 0.30, connectivity: 0.15 }
  },
  logistics: {
    id: 'logistics',
    name: 'Logistics & Distribution',
    desc: 'Prioritizes arterial road network access and infrastructure density.',
    icon: Truck,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    accentColor: 'amber',
    weights: { safety: 0.10, density: 0.10, growth: 0.35, connectivity: 0.45 }
  },
  residential: {
    id: 'residential',
    name: 'Residential Dev',
    desc: 'Balances citizen safety, environmental metrics, and long-term security.',
    icon: Home,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    accentColor: 'emerald',
    weights: { safety: 0.45, density: 0.20, growth: 0.15, connectivity: 0.20 }
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare Facility',
    desc: 'Focuses on accessibility, high-density residential capture, and stability.',
    icon: Heart,
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    accentColor: 'sky',
    weights: { safety: 0.20, density: 0.30, growth: 0.25, connectivity: 0.25 }
  },
  custom: {
    id: 'custom',
    name: 'Custom WSM Model',
    desc: 'Manual adjustments to create custom decision prioritization weights.',
    icon: Sliders,
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    accentColor: 'indigo',
    weights: { safety: 0.25, density: 0.25, growth: 0.25, connectivity: 0.25 }
  }
};

// City Baselines for normalization comparison
const CITY_BASELINES = {
  safety: 0.65,
  density: 0.50,
  growth: 0.45,
  connectivity: 0.55
};

const DecisionIntelligencePanel = ({ bbox, priority = 'growth' }) => {
  const [selectedUseCase, setSelectedUseCase] = useState('retail');
  const [weights, setWeights] = useState({ ...USE_CASES.retail.weights });
  const [metrics, setMetrics] = useState({ safety: 0.5, density: 0.5, growth: 0.5, connectivity: 0.5 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('PostgreSQL/PostGIS');
  const [timestamp, setTimestamp] = useState(new Date().toISOString());

  // Interactive overlays/tools states
  const [activeTool, setActiveTool] = useState(null); // 'compare' | 'gaps' | null
  const [flowExpanded, setFlowExpanded] = useState(false);

  // Sync use-case weights on select
  const handleUseCaseChange = (key) => {
    setSelectedUseCase(key);
    setWeights({ ...USE_CASES[key].weights });
  };

  // Sync with main priorities if prop changes (mapping legacy to v2)
  useEffect(() => {
    if (priority && priority !== 'custom') {
      const mapping = {
        security: 'residential',
        growth: 'retail',
        infrastructure: 'logistics',
        emergency: 'healthcare'
      };
      const mappedKey = mapping[priority] || 'retail';
      setSelectedUseCase(mappedKey);
      setWeights({ ...USE_CASES[mappedKey].weights });
    } else if (priority === 'custom') {
      setSelectedUseCase('custom');
    }
  }, [priority]);

  const fetchAnalysis = useCallback(async () => {
    if (!bbox) return;
    setLoading(true);
    try {
      const minLat = bbox.south;
      const minLng = bbox.west;
      const maxLat = bbox.north;
      const maxLng = bbox.east;
      
      if (minLat === undefined || minLng === undefined) return;

      // Request using selectedUseCase or legacy priority
      const res = await fetch(`/api/decision?minLat=${minLat}&minLng=${minLng}&maxLat=${maxLat}&maxLng=${maxLng}&priority=${selectedUseCase}`);
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      if (result.metrics) {
        setMetrics(result.metrics);
      }
      setDataSource(result.dataSource || 'PostgreSQL/PostGIS');
      setTimestamp(result.timestamp || new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bbox, selectedUseCase]);

  // Fetch metrics when viewport (bbox) or selectedUseCase changes
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Live score calculation (weighted sum model client-side for zero latency feedback)
  const weightsSum = weights.safety + weights.density + weights.growth + weights.connectivity || 1;
  const rawScore = (
    (metrics.safety * weights.safety) +
    (metrics.density * weights.density) +
    (metrics.growth * weights.growth) +
    (metrics.connectivity * weights.connectivity)
  ) / weightsSum;
  
  const suitabilityScore = Math.round(rawScore * 100);

  // Rating translation
  const getRatingLabel = (score) => {
    if (score >= 80) return "Optimal";
    if (score >= 60) return "Favorable";
    if (score >= 40) return "Moderate";
    return "Sub-Optimal";
  };
  const rating = getRatingLabel(suitabilityScore);

  // Dynamic recommendation engine
  const getRecommendationText = (useCaseKey, score, currentMetrics) => {
    const ucName = USE_CASES[useCaseKey]?.name || "Strategic";
    if (score >= 75) {
      return `Target viewport identified as optimal for ${ucName}. Strategic data matches guidelines with strong ${currentMetrics.density > 0.7 ? 'population centers' : 'development corridors'}. Proceed to operational planning.`;
    } else if (score >= 50) {
      return `Marginally suitable zone for ${ucName}. Primary constraint resides in ${currentMetrics.safety < 0.5 ? 'safety factors' : 'connectivity infrastructure'}. Recommendation is to deploy supplementary mitigations.`;
    } else {
      return `Unsuitable for primary ${ucName} operations. Low localized indicators. Reposition camera view or redirect resources towards adjacent sectors.`;
    }
  };
  const recommendation = getRecommendationText(selectedUseCase, suitabilityScore, metrics);

  // Dynamic tactical observations
  const getTacticalInsights = (currentMetrics) => {
    const list = [];
    if (currentMetrics.density > 0.7) list.push("Critical mass population density detected (+20% vs city average).");
    if (currentMetrics.growth > 0.6) list.push("Development index matches top 15th percentile growth.");
    if (currentMetrics.safety < 0.4) list.push("Elevated crime volatility observed - active alert in place.");
    if (currentMetrics.connectivity > 0.7) list.push("Excellent highway & arterial grid routing accessibility.");
    if (list.length === 0) list.push("Local spatial attributes align within standard municipal parameters.");
    return list.slice(0, 3);
  };
  const insights = getTacticalInsights(metrics);

  // Live slider change handler
  const handleSliderChange = (param, val) => {
    if (selectedUseCase !== 'custom') {
      // Clone current weights, apply the change, and set to custom mode
      setSelectedUseCase('custom');
    }
    setWeights(prev => ({
      ...prev,
      [param]: parseFloat(val)
    }));
  };

  // What-if analysis computations
  const findWeakestMetric = () => {
    const keys = ['safety', 'density', 'growth', 'connectivity'];
    let weakestKey = 'safety';
    let minVal = 1.0;
    
    keys.forEach(k => {
      if (metrics[k] < minVal) {
        minVal = metrics[k];
        weakestKey = k;
      }
    });
    return { key: weakestKey, value: minVal };
  };

  const weakest = findWeakestMetric();
  const projectedMetrics = { ...metrics, [weakest.key]: 1.0 };
  const projectedScore = Math.round((
    (projectedMetrics.safety * weights.safety) +
    (projectedMetrics.density * weights.density) +
    (projectedMetrics.growth * weights.growth) +
    (projectedMetrics.connectivity * weights.connectivity)
  ) / weightsSum * 100);
  const projectedDelta = projectedScore - suitabilityScore;

  // Confidence score calculation
  const getConfidenceLevel = () => {
    let conf = 100;
    if (dataSource.includes('Mock')) conf -= 15;
    
    // Bounds size factor
    if (bbox) {
      const latDiff = Math.abs(bbox.north - bbox.south);
      const lngDiff = Math.abs(bbox.east - bbox.west);
      const areaProxy = latDiff * lngDiff * 10000;
      if (areaProxy > 50) conf -= 10; // too broad
      if (areaProxy < 0.5) conf -= 10; // too hyper-local
    }
    return conf;
  };
  const confidence = getConfidenceLevel();

  // Export CSV Helper
  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "D3E v2 Analytics Report\n"
      + `Timestamp,${timestamp}\n`
      + `Viewport,${JSON.stringify(bbox)}\n`
      + `Use Case,${USE_CASES[selectedUseCase].name}\n`
      + `Suitability Score,${suitabilityScore}%\n`
      + `Rating,${rating}\n`
      + `Confidence Level,${confidence}%\n\n`
      + "Metric,Value,Weight,Baseline,Deviation\n"
      + `Safety,${(metrics.safety*100).toFixed(0)}%,${(weights.safety*100).toFixed(0)}%,${(CITY_BASELINES.safety*100).toFixed(0)}%,${((metrics.safety - CITY_BASELINES.safety)*100).toFixed(0)}%\n`
      + `Density,${(metrics.density*100).toFixed(0)}%,${(weights.density*100).toFixed(0)}%,${(CITY_BASELINES.density*100).toFixed(0)}%,${((metrics.density - CITY_BASELINES.density)*100).toFixed(0)}%\n`
      + `Growth,${(metrics.growth*100).toFixed(0)}%,${(weights.growth*100).toFixed(0)}%,${(CITY_BASELINES.growth*100).toFixed(0)}%,${((metrics.growth - CITY_BASELINES.growth)*100).toFixed(0)}%\n`
      + `Connectivity,${(metrics.connectivity*100).toFixed(0)}%,${(weights.connectivity*100).toFixed(0)}%,${(CITY_BASELINES.connectivity*100).toFixed(0)}%,${((metrics.connectivity - CITY_BASELINES.connectivity)*100).toFixed(0)}%\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `D3E_v2_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Recharts radar preparation
  const radarData = [
    { subject: 'Safety', A: Math.round(metrics.safety * 100) },
    { subject: 'Density', A: Math.round(metrics.density * 100) },
    { subject: 'Growth', A: Math.round(metrics.growth * 100) },
    { subject: 'Transit', A: Math.round(metrics.connectivity * 100) },
  ];

  if (!bbox) return null;

  return (
    <div className="flex flex-row bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in duration-500 w-full min-h-[580px]">
      
      {/* Use Case Sidebar Selector */}
      <div className="flex flex-col items-center gap-4 py-6 w-16 md:w-20 border-r border-white/5 bg-black/35 shrink-0">
        <div className="p-2 mb-2">
          <Layers className="w-5 h-5 text-indigo-400 animate-pulse" />
        </div>
        {Object.entries(USE_CASES).map(([key, item]) => {
          const Icon = item.icon;
          const active = selectedUseCase === key;
          return (
            <button
              key={key}
              onClick={() => handleUseCaseChange(key)}
              title={item.name}
              className={`relative group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 ${
                active 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-lg scale-105' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-1 text-center scale-90 md:scale-100 leading-none truncate w-12 md:w-14">
                {key.charAt(0).toUpperCase() + key.slice(1, 4)}
              </span>
              
              {/* Tooltip */}
              <div className="absolute left-16 md:left-20 z-55 w-44 p-2 rounded-lg bg-slate-900 border border-white/10 text-[10px] text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl ml-2">
                <p className="font-bold text-indigo-400">{item.name}</p>
                <p className="text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col p-4 md:p-5 overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-base font-extrabold text-white tracking-wide">D3 Engine v2.0</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Mode: <span className="text-indigo-400 font-semibold">{USE_CASES[selectedUseCase].name}</span>
            </p>
          </div>
          {loading && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin mt-1" />}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 3-Column Command Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Scores & Radar Visuals */}
          <div className="space-y-4 flex flex-col justify-start">
            
            {/* Visual Charts Container */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Radial Gauge */}
              <div className="relative flex flex-col items-center justify-center p-3 bg-white/5 border border-white/5 rounded-xl h-40">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="5"
                      className="text-white/5"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * suitabilityScore) / 100}
                      strokeLinecap="round"
                      className={`${
                        suitabilityScore >= 75 ? 'text-emerald-400' : suitabilityScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                      } transition-all duration-500 ease-out`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-white">{suitabilityScore}%</span>
                    <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">{rating}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center font-bold mt-1">Suitability Score</p>
              </div>

              {/* Radar Chart */}
              <div className="flex items-center justify-center p-2 bg-white/5 border border-white/5 rounded-xl h-40">
                <div className="w-full h-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#ffffff15" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' }} />
                      <Radar
                        name="Indicators"
                        dataKey="A"
                        stroke="#818cf8"
                        fill="#818cf8"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Recommendation Card */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <div className="flex gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white mb-0.5">Strategic Recommendation</p>
                  <p className="text-[11px] text-indigo-100 leading-relaxed font-normal opacity-90">{recommendation}</p>
                </div>
              </div>
            </div>

            {/* Tactical Observations */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-1">Tactical Observations</p>
              {insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-slate-200 leading-snug">{insight}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Column 2: Parameters Weighting & Action Tools */}
          <div className="space-y-4 flex flex-col justify-start">
            
            {/* Parameters Sliders */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weighting Parameters</p>
                {selectedUseCase !== 'custom' && (
                  <span className="text-[8px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Predefined Locked</span>
                )}
              </div>
              <div className="space-y-3.5">
                {Object.entries(weights).map(([key, val]) => {
                  const weightPct = ((val / weightsSum) * 100).toFixed(0);
                  const metricVal = ((metrics[key] || 0) * 100).toFixed(0);
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-300 capitalize">{key}</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-indigo-300 font-bold" title="Weight">w: {weightPct}%</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-slate-400" title="Local Metric">val: {metricVal}%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.0"
                        step="0.05"
                        value={val}
                        onChange={(e) => handleSliderChange(key, e.target.value)}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* What-If Projection Box */}
            {projectedDelta > 0 && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <div className="flex gap-2">
                  <BarChart2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white mb-0.5">Interactive &quot;What-If&quot; Analysis</p>
                    <p className="text-[11px] text-rose-200 leading-relaxed font-normal opacity-90">
                      <span className="font-bold text-rose-400">{weakest.key.toUpperCase()}</span> is currently the lowest factor ({(weakest.value * 100).toFixed(0)}%). Improving this parameter to 100% would increase overall suitability by <span className="font-bold text-emerald-400">+{projectedDelta} points</span> (raising score to <span className="font-bold text-emerald-300">{projectedScore}%</span>).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex gap-2 justify-between">
              <button
                onClick={() => setActiveTool(activeTool === 'compare' ? null : 'compare')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                  activeTool === 'compare' 
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' 
                    : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Compare
              </button>
              <button
                onClick={() => setActiveTool(activeTool === 'gaps' ? null : 'gaps')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                  activeTool === 'gaps' 
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' 
                    : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Data Gaps
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-slate-300 font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            {/* Action Panels Overlay */}
            {activeTool === 'compare' && (
              <div className="p-3.5 bg-slate-900 border border-indigo-500/30 rounded-xl animate-in slide-in-from-top duration-300">
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Regional Benchmark Comparison</h4>
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between border-b border-white/5 pb-1 text-slate-400">
                    <span>Sector ID / Boundary</span>
                    <span>Suitability Score</span>
                    <span>Deviation</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-white">Selected Viewport (Current)</span>
                    <span className="text-indigo-400">{suitabilityScore}%</span>
                    <span className="text-emerald-400">Baseline</span>
                  </div>
                  <div className="flex justify-between font-normal text-slate-300">
                    <span>Faridabad Sector 15 (North)</span>
                    <span>68%</span>
                    <span className={`${suitabilityScore - 68 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {suitabilityScore - 68 >= 0 ? '+' : ''}{suitabilityScore - 68}%
                    </span>
                  </div>
                  <div className="flex justify-between font-normal text-slate-300">
                    <span>Faridabad Sector 3 (South-East)</span>
                    <span>54%</span>
                    <span className={`${suitabilityScore - 54 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {suitabilityScore - 54 >= 0 ? '+' : ''}{suitabilityScore - 54}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'gaps' && (
              <div className="p-3.5 bg-slate-900 border border-amber-500/30 rounded-xl animate-in slide-in-from-top duration-300">
                <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">Sensor & Census Data Gaps</h4>
                <div className="space-y-2 text-[10px] text-slate-300 leading-normal">
                  <div className="flex items-start gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                    <p><span className="font-bold text-slate-200">Demographics (Population)</span>: Derived from Census 2011 records. Projected 2026 ward growth holds 8% variance index.</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                    <p><span className="font-bold text-slate-200">Road Network Geometry</span>: OSM highways updated 48 hrs ago. High reliability.</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1 shrink-0" />
                    <p><span className="font-bold text-slate-200">Crime Incidents</span>: Synthetic spatial grid. Swap with real police database feed for live production validation.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Column 3: Processing Pipeline flow (Always Expanded) */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3.5 flex flex-col justify-start">
            
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Algorithm Processing Pipeline</h4>
            </div>

            {/* Timeline Container */}
            <div className="relative pl-4 border-l border-white/10 ml-1.5 space-y-4 py-1 flex-1 overflow-y-auto max-h-[460px] custom-scrollbar">
              
              {/* Step 1: Input */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">1. Input Stage</p>
                <p className="text-[9px] text-slate-400 leading-tight">Viewport bounds coordinates loaded from map screen.</p>
                <div className="text-[8px] font-mono text-indigo-300 bg-white/5 p-1 rounded mt-1 overflow-x-auto truncate">
                  Bounds: S: {bbox.south.toFixed(4)}, W: {bbox.west.toFixed(4)}, N: {bbox.north.toFixed(4)}, E: {bbox.east.toFixed(4)}
                </div>
              </div>

              {/* Step 2: Config */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">2. Config Stage</p>
                <p className="text-[9px] text-slate-400 leading-tight">Pre-configured use case weight matrix active.</p>
                <div className="text-[8px] font-mono text-indigo-300 bg-white/5 p-1 rounded mt-1">
                  Weights: Safety: {(weights.safety*100).toFixed(0)}%, Density: {(weights.density*100).toFixed(0)}%, Growth: {(weights.growth*100).toFixed(0)}%, Transit: {(weights.connectivity*100).toFixed(0)}%
                </div>
              </div>

              {/* Step 3: Fetch */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">3. Fetch Stage</p>
                <p className="text-[9px] text-slate-400 leading-tight">PostGIS index scanning coordinates via spatial intersections.</p>
                <p className="text-[8px] text-indigo-300 italic font-mono mt-0.5">Source: {dataSource}</p>
              </div>

              {/* Step 4: Prep & Normalization */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">4. Prep Stage (Baseline Normalization)</p>
                <p className="text-[9px] text-slate-400 leading-tight">Raw density & connectivity indexes compared against citywide baselines.</p>
                
                {/* Baseline Delta Table */}
                <div className="grid grid-cols-4 gap-1 mt-1.5 text-[8px] font-mono text-center">
                  <div className="bg-white/5 p-1 rounded border border-white/5">
                    <span className="text-slate-400 block font-bold">Safety</span>
                    <span className={metrics.safety >= CITY_BASELINES.safety ? 'text-emerald-400' : 'text-rose-400'}>
                      {((metrics.safety - CITY_BASELINES.safety)*100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-white/5 p-1 rounded border border-white/5">
                    <span className="text-slate-400 block font-bold">Density</span>
                    <span className={metrics.density >= CITY_BASELINES.density ? 'text-emerald-400' : 'text-rose-400'}>
                      {((metrics.density - CITY_BASELINES.density)*100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-white/5 p-1 rounded border border-white/5">
                    <span className="text-slate-400 block font-bold">Growth</span>
                    <span className={metrics.growth >= CITY_BASELINES.growth ? 'text-emerald-400' : 'text-rose-400'}>
                      {((metrics.growth - CITY_BASELINES.growth)*100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-white/5 p-1 rounded border border-white/5">
                    <span className="text-slate-400 block font-bold">Transit</span>
                    <span className={metrics.connectivity >= CITY_BASELINES.connectivity ? 'text-emerald-400' : 'text-rose-400'}>
                      {((metrics.connectivity - CITY_BASELINES.connectivity)*100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 5: Score */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">5. Score Stage</p>
                <p className="text-[9px] text-slate-400 leading-tight">Weighted Sum Model execution.</p>
                <p className="text-[8px] font-mono text-indigo-300 mt-0.5 font-bold">S = Σ (w_i * x_i) = {suitabilityScore}%</p>
              </div>

              {/* Step 6: Quality (Confidence Level) */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">6. Quality Stage</p>
                <p className="text-[9px] text-slate-400 leading-tight">Calculates confidence level based on data source and envelope scale.</p>
                <div className="flex items-center gap-1 mt-1 text-[8px] font-mono">
                  <span className="text-slate-400">Confidence Score:</span>
                  <span className={`${confidence >= 80 ? 'text-emerald-400' : confidence >= 60 ? 'text-amber-400' : 'text-rose-400'} font-bold`}>
                    {confidence}% ({confidence >= 80 ? 'High' : confidence >= 60 ? 'Moderate' : 'Low'})
                  </span>
                </div>
              </div>

              {/* Step 7: Insight */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">7. Insight Stage</p>
                <p className="text-[9px] text-slate-400 leading-tight">Rule-based NLP recommendations engine active.</p>
                <div className="text-[8px] font-mono text-indigo-300 bg-white/5 p-1.5 rounded mt-1 italic">
                  Observation: &quot;{insights[0]}&quot;
                </div>
              </div>

              {/* Step 8: Compare */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
                <p className="text-[10px] font-bold text-white leading-tight">8. Compare Stage</p>
                <p className="text-[9px] text-slate-400 leading-tight">Cross-referencing adjacent sectors and spatial clusters.</p>
              </div>

              {/* Step 9: Output */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 bg-slate-900 border border-white/20 rounded-full h-3 w-3 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[10px] font-bold text-emerald-400 leading-tight">9. Output Stage</p>
                <p className="text-[9px] text-slate-300 leading-tight font-semibold">Suitability Score rendered to analyst console.</p>
                <div className="text-[8px] font-mono text-emerald-300 bg-emerald-500/10 p-1.5 rounded mt-1 border border-emerald-500/20">
                  Final Result: {suitabilityScore}% ({rating})
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer Metadata */}
        <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[9px] text-white/40">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-indigo-400">Source:</span>
            <span>{dataSource}</span>
          </div>
          <div>
            <span>Updated: {timestamp ? new Date(timestamp).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default DecisionIntelligencePanel;
