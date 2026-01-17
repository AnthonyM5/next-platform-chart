'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { format } from 'date-fns';
import { useCryptoStore } from '../store/cryptoStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return [];
  
  const rsiValues = [];
  const changes = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  // Calculate initial averages
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // Fill initial values with null
  for (let i = 0; i < period; i++) {
    rsiValues.push(null);
  }
  
  // Calculate first RSI
  if (avgLoss === 0) {
    rsiValues.push(100);
  } else {
    const rs = avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));
  }
  
  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsiValues.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsiValues;
}

// Calculate percentage change over the period
function calculatePeriodChange(prices) {
  if (!prices || prices.length < 2) return null;
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

// Get RSI period based on time selection
function getRSIPeriod(timePeriod) {
  switch (timePeriod) {
    case '1': return 14; // 14 periods for 1 day (hourly data)
    case '7': return 14; // 14 periods for 7 days
    case '30': return 14; // 14 periods for 30 days
    case '365': return 14; // 14 periods for 1 year
    default: return 14;
  }
}

// Get time period label
function getTimePeriodLabel(timePeriod) {
  switch (timePeriod) {
    case '1': return '24h';
    case '7': return '7d';
    case '30': return '30d';
    case '365': return '1y';
    default: return `${timePeriod}d`;
  }
}

export default function CryptoChart({ coinData, loading }) {
  const { theme, timePeriod } = useCryptoStore();
  const isDark = theme === 'dark';

  // Calculate RSI and period change
  const { rsiData, periodChange, prices, labels } = useMemo(() => {
    if (!coinData || !coinData.prices || coinData.prices.length === 0) {
      return { rsiData: [], periodChange: null, prices: [], labels: [] };
    }

    const priceValues = coinData.prices.map(([_, price]) => price);
    const rsiPeriod = getRSIPeriod(timePeriod);
    const rsi = calculateRSI(priceValues, rsiPeriod);
    const change = calculatePeriodChange(priceValues);
    
    const formattedLabels = coinData.prices.map(([timestamp]) => {
      const date = new Date(timestamp);
      if (timePeriod === '1') {
        return format(date, 'HH:mm');
      } else if (timePeriod === '365') {
        return format(date, 'MMM yyyy');
      }
      return format(date, 'MMM d');
    });

    return {
      rsiData: rsi,
      periodChange: change,
      prices: priceValues,
      labels: formattedLabels,
    };
  }, [coinData, timePeriod]);

  if (loading) {
    return (
      <div className="chart-skeleton">
        <div className="animate-pulse">
          <div className="chart-loading-placeholder"></div>
        </div>
      </div>
    );
  }

  if (!coinData || !coinData.prices || coinData.prices.length === 0) {
    return (
      <div className="chart-empty">
        <p>No chart data available</p>
      </div>
    );
  }

  // Price chart data
  const priceChartData = {
    labels,
    datasets: [
      {
        label: 'Price',
        data: prices,
        borderColor: periodChange >= 0 
          ? (isDark ? '#34d399' : '#10b981')
          : (isDark ? '#f87171' : '#ef4444'),
        backgroundColor: periodChange >= 0
          ? (isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(16, 185, 129, 0.1)')
          : (isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: periodChange >= 0 
          ? (isDark ? '#34d399' : '#10b981')
          : (isDark ? '#f87171' : '#ef4444'),
        borderWidth: 2,
      },
    ],
  };

  // RSI chart data
  const rsiChartData = {
    labels,
    datasets: [
      {
        label: 'RSI',
        data: rsiData,
        borderColor: isDark ? '#a78bfa' : '#8b5cf6',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const priceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#000',
        bodyColor: isDark ? '#fff' : '#000',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          maxTicksLimit: 6,
          autoSkip: true,
          font: {
            size: 11,
          },
        },
      },
      y: {
        display: true,
        position: 'right',
        grid: {
          color: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          callback: function(value) {
            if (value >= 1000) {
              return '$' + (value / 1000).toFixed(1) + 'K';
            }
            return '$' + value.toLocaleString('en-US');
          },
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const rsiOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#000',
        bodyColor: isDark ? '#fff' : '#000',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `RSI: ${context.parsed.y?.toFixed(2) || 'N/A'}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: true,
        position: 'right',
        min: 0,
        max: 100,
        grid: {
          color: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          stepSize: 30,
          callback: function(value) {
            if (value === 70) return '70';
            if (value === 30) return '30';
            return '';
          },
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // Get current RSI value
  const currentRSI = rsiData.filter(v => v !== null).pop();
  const rsiStatus = currentRSI > 70 ? 'overbought' : currentRSI < 30 ? 'oversold' : 'neutral';

  return (
    <div className="crypto-chart">
      {/* Period Change Badge */}
      <div className="chart-stats">
        <div className={`period-change-badge ${periodChange >= 0 ? 'positive' : 'negative'}`}>
          <span className="change-label">{getTimePeriodLabel(timePeriod)} Change:</span>
          <span className="change-value">
            {periodChange >= 0 ? '▲' : '▼'} {Math.abs(periodChange).toFixed(2)}%
          </span>
        </div>
        {currentRSI && (
          <div className={`rsi-badge ${rsiStatus}`}>
            <span className="rsi-label">RSI(14):</span>
            <span className="rsi-value">{currentRSI.toFixed(1)}</span>
            <span className="rsi-status">({rsiStatus})</span>
          </div>
        )}
      </div>

      {/* Price Chart */}
      <div className="price-chart-container">
        <Line data={priceChartData} options={priceOptions} />
      </div>

      {/* RSI Chart */}
      <div className="rsi-chart-container">
        <div className="rsi-chart-header">
          <span className="indicator-label">RSI (14)</span>
          <div className="rsi-levels">
            <span className="level overbought">70 - Overbought</span>
            <span className="level oversold">30 - Oversold</span>
          </div>
        </div>
        <div className="rsi-chart-wrapper">
          {/* Overbought/Oversold zones */}
          <div className="rsi-zones">
            <div className="overbought-zone"></div>
            <div className="oversold-zone"></div>
          </div>
          <Line data={rsiChartData} options={rsiOptions} />
        </div>
      </div>
    </div>
  );
}
