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

/**
 * RSI (Relative Strength Index) Configuration
 * 
 * Based on J. Welles Wilder Jr.'s original work and modern trading practices:
 * - Standard period: 14 (balanced response, suitable for swing trading)
 * - Shorter periods (5-9): More sensitive, captures quick momentum shifts, more noise
 * - Longer periods (21-30): Smoother signals, better for identifying major trends
 * 
 * Overbought/Oversold Levels:
 * - Above 70: Overbought - potential selling opportunity or strong bullish momentum
 * - Below 30: Oversold - potential buying opportunity or strong bearish momentum
 * - 50 is neutral (bullish momentum above, bearish below)
 * 
 * Source: Investopedia - https://www.investopedia.com/terms/r/rsi.asp
 */
const RSI_CONFIG = {
  '1': {
    period: 9,
    description: 'RSI(9) - Shorter period for intraday analysis. More responsive to price changes, ideal for capturing quick momentum shifts in 24-hour data.',
    rationale: 'With hourly data points over 24 hours, a 9-period RSI provides sensitivity to short-term momentum while reducing noise compared to even shorter periods.'
  },
  '7': {
    period: 14,
    description: 'RSI(14) - Standard period recommended by J. Welles Wilder. Balanced response suitable for weekly swing trading analysis.',
    rationale: 'The default 14-period setting provides a good balance between sensitivity and reliability for week-long price movements.'
  },
  '30': {
    period: 14,
    description: 'RSI(14) - Standard period for monthly analysis. Captures medium-term momentum trends effectively.',
    rationale: 'For 30-day analysis, the standard 14-period RSI remains effective as it balances responsiveness with signal reliability.'
  },
  '365': {
    period: 21,
    description: 'RSI(21) - Extended period for long-term trend analysis. Smoother signals that filter out short-term noise.',
    rationale: 'Longer periods reduce false signals and better identify major trend reversals in yearly data, as recommended for long-term investors.'
  },
  default: {
    period: 14,
    description: 'RSI(14) - Standard Relative Strength Index period.',
    rationale: 'The industry-standard 14-period RSI as originally designed by J. Welles Wilder Jr.'
  }
};

// RSI educational info for tooltips
const RSI_INFO = {
  title: 'Relative Strength Index (RSI)',
  description: 'A momentum oscillator measuring the speed and magnitude of price changes to identify overbought or oversold conditions.',
  levels: {
    overbought: 'RSI > 70: Asset may be overbought. In uptrends, this can indicate strong momentum rather than an immediate reversal.',
    oversold: 'RSI < 30: Asset may be oversold. In downtrends, prices can remain oversold for extended periods.',
    neutral: 'RSI = 50: Neutral point. Above 50 suggests bullish momentum, below 50 suggests bearish momentum.'
  },
  source: 'https://www.investopedia.com/terms/r/rsi.asp'
};

// Get RSI period based on time selection
function getRSIPeriod(timePeriod) {
  return RSI_CONFIG[timePeriod]?.period || RSI_CONFIG.default.period;
}

// Get RSI description for current time period
function getRSIDescription(timePeriod) {
  return RSI_CONFIG[timePeriod]?.description || RSI_CONFIG.default.description;
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
  const { rsiData, periodChange, prices, labels, rsiPeriod } = useMemo(() => {
    if (!coinData || !coinData.prices || coinData.prices.length === 0) {
      return { rsiData: [], periodChange: null, prices: [], labels: [], rsiPeriod: 14 };
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
      rsiPeriod,
      rsiDescription: getRSIDescription(timePeriod),
    };
  }, [coinData, timePeriod]);

  // Get RSI info link
  const rsiInfoUrl = RSI_INFO.source;

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
            return `RSI(${rsiPeriod}): ${context.parsed.y?.toFixed(2) || 'N/A'}`;
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
  const { rsiDescription } = useMemo(() => ({
    rsiDescription: getRSIDescription(timePeriod)
  }), [timePeriod]);

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
          <a 
            href={rsiInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`rsi-badge ${rsiStatus}`}
            title={rsiDescription}
          >
            <span className="rsi-label">RSI({rsiPeriod}):</span>
            <span className="rsi-value">{currentRSI.toFixed(1)}</span>
            <span className="rsi-status">({rsiStatus})</span>
            <span className="info-icon">ⓘ</span>
          </a>
        )}
      </div>

      {/* Price Chart */}
      <div className="price-chart-container">
        <Line data={priceChartData} options={priceOptions} />
      </div>

      {/* RSI Chart */}
      <div className="rsi-chart-container">
        <div className="rsi-chart-header">
          <a 
            href={rsiInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="indicator-label-link"
            title={rsiDescription}
          >
            <span className="indicator-label">RSI ({rsiPeriod})</span>
            <span className="info-icon">ⓘ</span>
          </a>
          <div className="rsi-levels">
            <span className="level overbought" title={RSI_INFO.levels.overbought}>70 - Overbought</span>
            <span className="level oversold" title={RSI_INFO.levels.oversold}>30 - Oversold</span>
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
