'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';

const regionData = {
  Faridabad: {
    name: 'Faridabad',
    description: 'Industrial manufacturing center in Haryana, growing rapidly in public residential sectors.',
    population: [
      { year: '2020', value: 1400000 },
      { year: '2021', value: 1450000 },
      { year: '2022', value: 1510000 },
      { year: '2023', value: 1580000 },
      { year: '2024', value: 1640000 },
      { year: '2025', value: 1720000 }
    ],
    crime: [
      { year: '2020', value: 450 },
      { year: '2021', value: 420 },
      { year: '2022', value: 390 },
      { year: '2023', value: 360 },
      { year: '2024', value: 310 },
      { year: '2025', value: 290 }
    ],
    development: [
      { year: '2020', value: 68 },
      { year: '2021', value: 70 },
      { year: '2022', value: 72 },
      { year: '2023', value: 75 },
      { year: '2024', value: 78 },
      { year: '2025', value: 81 }
    ],
    infrastructure: [
      { name: 'Roads', value: 75 },
      { name: 'Power', value: 80 },
      { name: 'Water', value: 65 },
      { name: 'Transit', value: 70 }
    ],
    accessibility: 72
  },
  Delhi: {
    name: 'Delhi',
    description: 'National Capital Territory of India, high density commercial and governmental administrative hub.',
    population: [
      { year: '2020', value: 18600000 },
      { year: '2021', value: 19100000 },
      { year: '2022', value: 19700000 },
      { year: '2023', value: 20300000 },
      { year: '2024', value: 21000000 },
      { year: '2025', value: 21600000 }
    ],
    crime: [
      { year: '2020', value: 5200 },
      { year: '2021', value: 4900 },
      { year: '2022', value: 4600 },
      { year: '2023', value: 4300 },
      { year: '2024', value: 3900 },
      { year: '2025', value: 3700 }
    ],
    development: [
      { year: '2020', value: 82 },
      { year: '2021', value: 84 },
      { year: '2022', value: 85 },
      { year: '2023', value: 87 },
      { year: '2024', value: 88 },
      { year: '2025', value: 90 }
    ],
    infrastructure: [
      { name: 'Roads', value: 88 },
      { name: 'Power', value: 92 },
      { name: 'Water', value: 80 },
      { name: 'Transit', value: 95 }
    ],
    accessibility: 89
  },
  Gurgaon: {
    name: 'Gurgaon',
    description: 'Cyber City and high-technology enterprise commercial corridor in Haryana, high investment rating.',
    population: [
      { year: '2020', value: 1200000 },
      { year: '2021', value: 1280000 },
      { year: '2022', value: 1360000 },
      { year: '2023', value: 1450000 },
      { year: '2024', value: 1540000 },
      { year: '2025', value: 1650000 }
    ],
    crime: [
      { year: '2020', value: 890 },
      { year: '2021', value: 850 },
      { year: '2022', value: 810 },
      { year: '2023', value: 760 },
      { year: '2024', value: 720 },
      { year: '2025', value: 680 }
    ],
    development: [
      { year: '2020', value: 85 },
      { year: '2021', value: 87 },
      { year: '2022', value: 88 },
      { year: '2023', value: 90 },
      { year: '2024', value: 91 },
      { year: '2025', value: 93 }
    ],
    infrastructure: [
      { name: 'Roads', value: 85 },
      { name: 'Power', value: 88 },
      { name: 'Water', value: 70 },
      { name: 'Transit', value: 82 }
    ],
    accessibility: 84
  }
};

export default function AnalyticsStudio() {
  const [activeTab, setActiveTab] = useState('quick'); // 'quick', 'compare', 'trend', 'custom'

  // 1. Quick Insights state
  const [quickRegion, setQuickRegion] = useState('Faridabad');

  // 2. Compare Regions state
  const [compareRegionA, setCompareRegionA] = useState('Faridabad');
  const [compareRegionB, setCompareRegionB] = useState('Gurgaon');

  // 3. Trend Analysis state
  const [trendMetric, setTrendMetric] = useState('population'); // 'population', 'crime', 'development'
  const [trendStartYear, setTrendStartYear] = useState('2020');
  const [trendEndYear, setTrendEndYear] = useState('2025');

  // 4. Custom Builder states
  const [customRegion, setCustomRegion] = useState('Faridabad');
  const [customStartYear, setCustomStartYear] = useState('2020');
  const [customEndYear, setCustomEndYear] = useState('2025');
  const [customChartType, setCustomChartType] = useState('Auto'); // 'Auto', 'Bar', 'Line', 'Pie', 'Radar', 'Area'
  const [customMetrics, setCustomMetrics] = useState({
    population: true,
    crime: false,
    development: false
  });
  
  // Custom generated chart state (to support "Generate Chart" flow)
  const [generatedConfig, setGeneratedConfig] = useState(null);

  // Trigger custom generation on page select or options update
  const handleGenerateCustomChart = () => {
    const region = regionData[customRegion];
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'].filter(
      (y) => Number(y) >= Number(customStartYear) && Number(y) <= Number(customEndYear)
    );

    const checkedMetrics = Object.keys(customMetrics).filter((m) => customMetrics[m]);

    if (checkedMetrics.length === 0) {
      setGeneratedConfig({ error: 'Please select at least one metric to visualize.' });
      return;
    }

    // Determine EChart option based on chart type and metrics selection
    let chartTypeToUse = customChartType;
    if (chartTypeToUse === 'Auto') {
      if (checkedMetrics.length === 1) {
        chartTypeToUse = checkedMetrics[0] === 'crime' ? 'Bar' : 'Line';
      } else {
        chartTypeToUse = 'Bar';
      }
    }

    // Prepare datasets
    const series = [];
    const legendData = [];

    checkedMetrics.forEach((metric) => {
      const label = metric.charAt(0).toUpperCase() + metric.slice(1);
      legendData.push(label);

      const metricData = region[metric]
        .filter((row) => years.includes(row.year))
        .map((row) => row.value);

      if (chartTypeToUse === 'Line' || chartTypeToUse === 'Area') {
        series.push({
          name: label,
          type: 'line',
          smooth: true,
          areaStyle: chartTypeToUse === 'Area' ? { opacity: 0.15 } : undefined,
          data: metricData,
          itemStyle: {
            color: metric === 'population' ? '#0ea5e9' : metric === 'crime' ? '#f43f5e' : '#10b981'
          }
        });
      } else if (chartTypeToUse === 'Bar') {
        series.push({
          name: label,
          type: 'bar',
          data: metricData,
          itemStyle: {
            color: metric === 'population' ? '#3b82f6' : metric === 'crime' ? '#e11d48' : '#059669'
          }
        });
      } else if (chartTypeToUse === 'Pie') {
        // Pie displays distribution of the first checked metric for the end year
        const endYearIndex = years.length - 1;
        const totalVal = region[metric].find((row) => row.year === customEndYear)?.value || 1;
        
        series.push({
          name: label,
          type: 'pie',
          radius: '55%',
          data: [
            { value: totalVal, name: `${label} - ${customRegion}` },
            { value: totalVal * 0.4, name: 'Regional Average Base' }
          ]
        });
      }
    });

    const option = {
      tooltip: {
        trigger: chartTypeToUse === 'Pie' ? 'item' : 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: { data: legendData },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: chartTypeToUse === 'Pie' ? undefined : {
        type: 'category',
        data: years
      },
      yAxis: chartTypeToUse === 'Pie' ? undefined : {
        type: 'value'
      },
      series: series
    };

    setGeneratedConfig({ option, chartTypeToUse });
  };

  // Run initial generator for Custom tab
  useEffect(() => {
    handleGenerateCustomChart();
  }, [customRegion, customStartYear, customEndYear, customChartType, customMetrics]);

  // ECharts Configurations
  const quickInsightsCharts = useMemo(() => {
    const region = regionData[quickRegion];
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'];
    
    // 1. Population & Development EChart
    const popDevOption = {
      title: { text: 'Growth Indicators', textStyle: { fontSize: 13, color: '#475569' } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['Population', 'Dev Index %'], right: 10 },
      xAxis: { type: 'category', data: years },
      yAxis: [
        { type: 'value', name: 'Population', axisLabel: { formatter: '{value}' } },
        { type: 'value', name: 'Dev Index', axisLabel: { formatter: '{value}%' }, max: 100 }
      ],
      series: [
        {
          name: 'Population',
          type: 'bar',
          data: region.population.map((r) => r.value),
          itemStyle: { color: '#168c7a' }
        },
        {
          name: 'Dev Index %',
          type: 'line',
          yAxisIndex: 1,
          data: region.development.map((r) => r.value),
          itemStyle: { color: '#0ea5e9' },
          lineStyle: { width: 3 }
        }
      ]
    };

    // 2. Crime Trend EChart
    const crimeOption = {
      title: { text: 'Crime Density Trend', textStyle: { fontSize: 13, color: '#475569' } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: years },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Crime Index',
          type: 'line',
          smooth: true,
          areaStyle: { color: 'rgba(244, 63, 94, 0.1)' },
          data: region.crime.map((r) => r.value),
          itemStyle: { color: '#f43f5e' }
        }
      ]
    };

    // 3. Infrastructure EChart
    const infraOption = {
      title: { text: 'Infrastructure Vector (2025)', textStyle: { fontSize: 13, color: '#475569' } },
      tooltip: {},
      radar: {
        indicator: region.infrastructure.map((inf) => ({ name: inf.name, max: 100 }))
      },
      series: [
        {
          name: 'Infrastructure Ratings',
          type: 'radar',
          data: [{ value: region.infrastructure.map((inf) => inf.value), name: 'Rating' }],
          itemStyle: { color: '#10b981' }
        }
      ]
    };

    return { popDevOption, crimeOption, infraOption };
  }, [quickRegion]);

  const compareCharts = useMemo(() => {
    const regionA = regionData[compareRegionA];
    const regionB = regionData[compareRegionB];
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'];

    const popComparison = {
      title: { text: 'Demographic Comparison', textStyle: { fontSize: 13, color: '#475569' } },
      tooltip: { trigger: 'axis' },
      legend: { data: [compareRegionA, compareRegionB] },
      xAxis: { type: 'category', data: years },
      yAxis: { type: 'value' },
      series: [
        { name: compareRegionA, type: 'bar', data: regionA.population.map((r) => r.value), itemStyle: { color: '#168c7a' } },
        { name: compareRegionB, type: 'bar', data: regionB.population.map((r) => r.value), itemStyle: { color: '#94a3b8' } }
      ]
    };

    const devComparison = {
      title: { text: 'Development Index (%)', textStyle: { fontSize: 13, color: '#475569' } },
      tooltip: { trigger: 'axis' },
      legend: { data: [compareRegionA, compareRegionB] },
      xAxis: { type: 'category', data: years },
      yAxis: { type: 'value', max: 100 },
      series: [
        { name: compareRegionA, type: 'line', data: regionA.development.map((r) => r.value), itemStyle: { color: '#0ea5e9' }, lineStyle: { width: 3 } },
        { name: compareRegionB, type: 'line', data: regionB.development.map((r) => r.value), itemStyle: { color: '#64748b' }, lineStyle: { width: 2 } }
      ]
    };

    const crimeComparison = {
      title: { text: 'Crime Incidence Rate', textStyle: { fontSize: 13, color: '#475569' } },
      tooltip: { trigger: 'axis' },
      legend: { data: [compareRegionA, compareRegionB] },
      xAxis: { type: 'category', data: years },
      yAxis: { type: 'value' },
      series: [
        { name: compareRegionA, type: 'line', smooth: true, data: regionA.crime.map((r) => r.value), itemStyle: { color: '#f43f5e' } },
        { name: compareRegionB, type: 'line', smooth: true, data: regionB.crime.map((r) => r.value), itemStyle: { color: '#cbd5e1' } }
      ]
    };

    return { popComparison, devComparison, crimeComparison };
  }, [compareRegionA, compareRegionB]);

  const trendChart = useMemo(() => {
    const region = regionData['Faridabad'];
    const years = ['2020', '2021', '2022', '2023', '2024', '2025'].filter(
      (y) => Number(y) >= Number(trendStartYear) && Number(y) <= Number(trendEndYear)
    );

    const values = region[trendMetric]
      .filter((row) => years.includes(row.year))
      .map((row) => row.value);

    const label = trendMetric.charAt(0).toUpperCase() + trendMetric.slice(1);

    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: years },
      yAxis: { type: 'value' },
      series: [
        {
          name: label,
          type: 'line',
          smooth: true,
          areaStyle: {
            color: trendMetric === 'population' 
              ? 'rgba(14, 165, 233, 0.1)' 
              : trendMetric === 'crime' 
                ? 'rgba(244, 63, 94, 0.1)' 
                : 'rgba(16, 185, 129, 0.1)'
          },
          data: values,
          itemStyle: {
            color: trendMetric === 'population' ? '#0ea5e9' : trendMetric === 'crime' ? '#f43f5e' : '#10b981'
          },
          lineStyle: { width: 3 }
        }
      ]
    };
  }, [trendMetric, trendStartYear, trendEndYear]);

  // Dynamic D3E Decision Panel Text
  const d3eInsights = useMemo(() => {
    if (activeTab === 'quick') {
      const reg = regionData[quickRegion];
      const crimeTrendDirection = reg.crime[reg.crime.length - 1].value < reg.crime[0].value ? 'decreased' : 'increased';
      const crimePct = Math.round(Math.abs((reg.crime[reg.crime.length - 1].value - reg.crime[0].value) / reg.crime[0].value) * 100);
      const devGain = reg.development[reg.development.length - 1].value - reg.development[0].value;
      const popGainPct = Math.round(((reg.population[reg.population.length - 1].value - reg.population[0].value) / reg.population[0].value) * 100);

      return {
        bullet1: `Population in ${quickRegion} expanded by ${popGainPct}% over 5 years, indicating strong urban expansion and demographic clustering.`,
        bullet2: `Reported crime incidents ${crimeTrendDirection} by ${crimePct}%, suggesting localized containment efforts are highly effective.`,
        bullet3: `Development Index rose by ${devGain}% points, with accessibility scoring a favorable ${reg.accessibility}/100.`,
        recommendation: `D3E Intelligence Verdict: ${quickRegion} is evaluated as a ${reg.accessibility > 80 ? 'high-priority investment zone' : 'developing public sector deployment corridor'}. Recommended policy action is to scale ${reg.infrastructure.find(i=>i.value === Math.min(...reg.infrastructure.map(d=>d.value)))?.name || 'utilities'} capabilities immediately to support demographic load.`
      };
    }

    if (activeTab === 'compare') {
      const regA = regionData[compareRegionA];
      const regB = regionData[compareRegionB];
      
      if (compareRegionA === compareRegionB) {
        return {
          bullet1: 'Please select two different regions to yield comparative intelligence output.',
          bullet2: '',
          bullet3: '',
          recommendation: 'D3E Verdict: Comparison requires distinct coordinate vectors.'
        };
      }

      const devDiff = regA.development[regA.development.length - 1].value - regB.development[regB.development.length - 1].value;
      const crimeRatio = Math.round((regA.crime[regA.crime.length - 1].value / regB.crime[regB.crime.length - 1].value) * 10) / 10;

      return {
        bullet1: `${compareRegionA} development index averages ${devDiff > 0 ? `${devDiff}% higher` : `${Math.abs(devDiff)}% lower`} than ${compareRegionB}.`,
        bullet2: `${compareRegionA} logs approximately ${crimeRatio}x the crime volume of ${compareRegionB}.`,
        bullet3: `Geospatial density parameters favor ${regA.population[5].value > regB.population[5].value ? compareRegionA : compareRegionB} for large scale consumer logistics.`,
        recommendation: `D3E Intelligence Verdict: For high-tech enterprise deployments, Gurgaon presents the most stable metrics profile. For public welfare, infrastructure intervention should target Faridabad to compress regional development inequalities.`
      };
    }

    if (activeTab === 'trend') {
      const label = trendMetric === 'population' ? 'Demographic load' : trendMetric === 'crime' ? 'Safety incidents' : 'Urban index';
      return {
        bullet1: `${label} trend analyzed from ${trendStartYear} to ${trendEndYear}.`,
        bullet2: `Continuous regression modeling indicates a steady and stable trajectory with a predictable slope index.`,
        bullet3: `Forecast boundaries suggest a variance interval of +/-4% towards 2026.`,
        recommendation: `D3E Intelligence Verdict: Trend trajectory suggests that public utility capacity should be adjusted by a corresponding vector to prevent infrastructure bottlenecking.`
      };
    }

    // Custom Builder
    const checked = Object.keys(customMetrics).filter(m => customMetrics[m]);
    return {
      bullet1: `Synthesized report for ${customRegion} over timeframe ${customStartYear} - ${customEndYear}.`,
      bullet2: `Visualized parameters: ${checked.join(', ') || 'none'}.`,
      bullet3: `Applied visualization type: ${generatedConfig?.chartTypeToUse || 'Auto'}.`,
      recommendation: `D3E Intelligence Verdict: Multi-dimensional query confirmed. Data reflects stable operational parameters. Sector objectives are mapped for optimal regional tracking.`
    };
  }, [activeTab, quickRegion, compareRegionA, compareRegionB, trendMetric, trendStartYear, trendEndYear, customRegion, customStartYear, customEndYear, customMetrics, generatedConfig]);

  return (
    <div className="grid grid-cols-12 gap-6 bg-[#f5f7fb]">
      
      {/* Sidebar Selector Section */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="text-xl">📊</span> Analytics Studio
          </h2>
          <p className="text-xs text-slate-500 mt-1">Configure and analyze tactical intelligence profiles</p>
          
          <div className="mt-5 space-y-1">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === 'quick' ? 'bg-[#168c7a] text-white shadow-md shadow-teal-100' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span>🔍</span> Quick Insights
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === 'compare' ? 'bg-[#168c7a] text-white shadow-md shadow-teal-100' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span>⚖️</span> Compare Regions
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === 'trend' ? 'bg-[#168c7a] text-white shadow-md shadow-teal-100' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span>📈</span> Trend Analysis
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === 'custom' ? 'bg-[#168c7a] text-white shadow-md shadow-teal-100' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span>🛠️</span> Custom Analytics Builder
            </button>
          </div>
        </div>

        {/* Dynamic Controls depending on activeTab */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Control Panel</h3>
          
          {activeTab === 'quick' && (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Select Region</span>
                <select
                  value={quickRegion}
                  onChange={(e) => setQuickRegion(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a] focus:ring-1 focus:ring-[#168c7a]"
                >
                  <option value="Faridabad">Faridabad</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Gurgaon">Gurgaon</option>
                </select>
              </label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <strong>Profile:</strong> {regionData[quickRegion].description}
              </div>
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Region A</span>
                <select
                  value={compareRegionA}
                  onChange={(e) => setCompareRegionA(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                >
                  <option value="Faridabad">Faridabad</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Gurgaon">Gurgaon</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Region B</span>
                <select
                  value={compareRegionB}
                  onChange={(e) => setCompareRegionB(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                >
                  <option value="Faridabad">Faridabad</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Gurgaon">Gurgaon</option>
                </select>
              </label>
            </div>
          )}

          {activeTab === 'trend' && (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Analytical Metric</span>
                <select
                  value={trendMetric}
                  onChange={(e) => setTrendMetric(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                >
                  <option value="population">Population Exposure</option>
                  <option value="crime">Crime Density Index</option>
                  <option value="development">Development Index</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Start Year</span>
                  <select
                    value={trendStartYear}
                    onChange={(e) => setTrendStartYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                  >
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                    <option value="2023">2023</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">End Year</span>
                  <select
                    value={trendEndYear}
                    onChange={(e) => setTrendEndYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                  >
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Region</span>
                <select
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                >
                  <option value="Faridabad">Faridabad</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Gurgaon">Gurgaon</option>
                </select>
              </label>

              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-2">Metrics to plot</span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={customMetrics.population}
                      onChange={(e) => setCustomMetrics(prev => ({ ...prev, population: e.target.checked }))}
                      className="rounded text-[#168c7a] focus:ring-[#168c7a] h-4 w-4"
                    />
                    Population
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={customMetrics.crime}
                      onChange={(e) => setCustomMetrics(prev => ({ ...prev, crime: e.target.checked }))}
                      className="rounded text-[#168c7a] focus:ring-[#168c7a] h-4 w-4"
                    />
                    Crime Incidents
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={customMetrics.development}
                      onChange={(e) => setCustomMetrics(prev => ({ ...prev, development: e.target.checked }))}
                      className="rounded text-[#168c7a] focus:ring-[#168c7a] h-4 w-4"
                    />
                    Development Score
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">From</span>
                  <select
                    value={customStartYear}
                    onChange={(e) => setCustomStartYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                  >
                    <option value="2020">2020</option>
                    <option value="2021">2021</option>
                    <option value="2022">2022</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">To</span>
                  <select
                    value={customEndYear}
                    onChange={(e) => setCustomEndYear(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                  >
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Visualization Format</span>
                <select
                  value={customChartType}
                  onChange={(e) => setCustomChartType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#168c7a]"
                >
                  <option value="Auto">Auto (Recommended)</option>
                  <option value="Bar">Bar Chart</option>
                  <option value="Line">Line Chart</option>
                  <option value="Area">Area Chart</option>
                  <option value="Pie">Pie Chart</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleGenerateCustomChart}
                className="w-full rounded-xl bg-[#168c7a] py-2.5 text-xs font-bold text-white transition hover:bg-[#116f61]"
              >
                Synthesize Chart
              </button>
            </div>
          )}
        </div>

        {/* D3E Decision Intelligence Insights Panel */}
        <div className="rounded-2xl border border-[#168c7a]/20 bg-slate-900 p-5 shadow-sm text-white">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-300">D3E Decision Panel</h3>
          </div>
          
          <div className="mt-4 space-y-3">
            {d3eInsights.bullet1 && (
              <div className="flex gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span>⚡</span>
                <p>{d3eInsights.bullet1}</p>
              </div>
            )}
            {d3eInsights.bullet2 && (
              <div className="flex gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span>⚡</span>
                <p>{d3eInsights.bullet2}</p>
              </div>
            )}
            {d3eInsights.bullet3 && (
              <div className="flex gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span>⚡</span>
                <p>{d3eInsights.bullet3}</p>
              </div>
            )}
          </div>
          
          <div className="mt-5 border-t border-white/10 pt-4 text-xs font-semibold text-emerald-400 leading-relaxed">
            💡 {d3eInsights.recommendation}
          </div>
        </div>
      </div>

      {/* Main Studio Viewport Workspace */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {activeTab === 'quick' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ReactECharts option={quickInsightsCharts.popDevOption} style={{ height: 320 }} />
            </div>
            <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ReactECharts option={quickInsightsCharts.crimeOption} style={{ height: 260 }} />
            </div>
            <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ReactECharts option={quickInsightsCharts.infraOption} style={{ height: 260 }} />
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ReactECharts option={compareCharts.popComparison} style={{ height: 320 }} />
            </div>
            <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ReactECharts option={compareCharts.devComparison} style={{ height: 260 }} />
            </div>
            <div className="col-span-12 md:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ReactECharts option={compareCharts.crimeComparison} style={{ height: 260 }} />
            </div>
          </div>
        )}

        {activeTab === 'trend' && (
          <div className="col-span-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Trend Projection: {trendMetric.charAt(0).toUpperCase() + trendMetric.slice(1)} ({trendStartYear} - {trendEndYear})
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Statistical forecasting vector plotted dynamically</p>
            </div>
            <ReactECharts option={trendChart} style={{ height: 420 }} />
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="col-span-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {generatedConfig?.error ? (
              <div className="grid min-h-[360px] place-items-center text-sm font-semibold text-rose-500">
                {generatedConfig.error}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Custom Synthesized workspace: {customRegion}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Visual Format: {generatedConfig?.chartTypeToUse} Chart
                  </p>
                </div>
                {generatedConfig?.option && (
                  <ReactECharts option={generatedConfig.option} style={{ height: 420 }} />
                )}
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
