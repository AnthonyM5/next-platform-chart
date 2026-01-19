'use client';

import { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData as ChartJSData,
} from 'chart.js';
import { format } from 'date-fns';
import { useCryptoStore } from '../store/cryptoStore';
import {
  calculateSMA,
  calculateMACD,
  calculateBollingerBands,
  getSMAConfig,
  getMACDConfig,
  getBollingerConfig,
  SMA_INFO,
  MACD_INFO,
  BOLLINGER_INFO,
} from '../utils/indicators';
import type { ChartData, CryptoChartProps, RSIConfigMap, IndicatorInfo, TimePeriod, MACDData, BollingerBandsData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  if (prices.length < period + 1) return [];
  
  const rsiValues: (number | null)[] = [];
  const changes: number[] = [];
  
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
function calculatePeriodChange(prices: number[]): number | null {
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
const RSI_CONFIG: RSIConfigMap = {
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
const RSI_INFO: IndicatorInfo = {
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
function getRSIPeriod(timePeriod: TimePeriod): number {
  return RSI_CONFIG[timePeriod]?.period || RSI_CONFIG.default.period;
}

// Get RSI description for current time period
function getRSIDescription(timePeriod: TimePeriod): string {
  return RSI_CONFIG[timePeriod]?.description || RSI_CONFIG.default.description;
}

// Get time period label
function getTimePeriodLabel(timePeriod: TimePeriod): string {
  switch (timePeriod) {
    case '1': return '24h';
    case '7': return '7d';
    case '30': return '30d';
    case '365': return '1y';
    default: return `${timePeriod}d`;
  }
}

type RSIStatus = 'overbought' | 'oversold' | 'neutral';

// Color constants for indicators
const COLORS = {
  smaShort: { light: '#f59e0b', dark: '#fbbf24' },
  smaLong: { light: '#8b5cf6', dark: '#a78bfa' },
  bollingerBand: { light: 'rgba(34, 197, 94, 0.15)', dark: 'rgba(52, 211, 153, 0.15)' },
  bollingerMiddle: { light: '#22c55e', dark: '#34d399' },
  macdLine: { light: '#06b6d4', dark: '#22d3ee' },
  macdSignal: { light: '#ec4899', dark: '#f472b6' },
  macdHistogramPos: { light: '#10b981', dark: '#34d399' },
  macdHistogramNeg: { light: '#ef4444', dark: '#f87171' },
};

export default function CryptoChart({ coinData, loading }: CryptoChartProps) {
  const { theme, timePeriod, enabledStudies } = useCryptoStore();
  const isDark = theme === 'dark';

  // Calculate all indicators
  const {
    rsiData,
    periodChange,
    prices,
    labels,
    rsiPeriod,
    rsiDescription,
    smaShort,
    smaLong,
    smaConfig,
    bollingerBands,
    bollingerConfig,
    macdData,
    macdConfig,
  } = useMemo(() => {
    if (!coinData || !coinData.prices || coinData.prices.length === 0) {
      return {
        rsiData: [],
        periodChange: null,
        prices: [],
        labels: [],
        rsiPeriod: 14,
        rsiDescription: '',
        smaShort: [],
        smaLong: [],
        smaConfig: getSMAConfig(timePeriod),
        bollingerBands: { upper: [], middle: [], lower: [] } as BollingerBandsData,
        bollingerConfig: getBollingerConfig(timePeriod),
        macdData: { macdLine: [], signalLine: [], histogram: [] } as MACDData,
        macdConfig: getMACDConfig(timePeriod),
      };
    }

    const priceValues = coinData.prices.map(([_, price]) => price);
    const calculatedRsiPeriod = getRSIPeriod(timePeriod);
    const rsi = calculateRSI(priceValues, calculatedRsiPeriod);
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

    // SMA calculations
    const smaConf = getSMAConfig(timePeriod);
    const shortSMA = calculateSMA(priceValues, smaConf.shortPeriod);
    const longSMA = calculateSMA(priceValues, smaConf.longPeriod);

    // Bollinger Bands calculations
    const bbConf = getBollingerConfig(timePeriod);
    const bb = calculateBollingerBands(priceValues, bbConf.period, bbConf.stdDev);

    // MACD calculations
    const macdConf = getMACDConfig(timePeriod);
    const macd = calculateMACD(priceValues, macdConf.fastPeriod, macdConf.slowPeriod, macdConf.signalPeriod);

    return {
      rsiData: rsi,
      periodChange: change,
      prices: priceValues,
      labels: formattedLabels,
      rsiPeriod: calculatedRsiPeriod,
      rsiDescription: getRSIDescription(timePeriod),
      smaShort: shortSMA,
      smaLong: longSMA,
      smaConfig: smaConf,
      bollingerBands: bb,
      bollingerConfig: bbConf,
      macdData: macd,
      macdConfig: macdConf,
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

  // Build price chart datasets with proper typing
  type ChartDataset = {
    label: string;
    data: (number | null)[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean | string;
    tension: number;
    pointRadius: number;
    pointHoverRadius?: number;
    pointHoverBackgroundColor?: string;
    borderWidth: number;
    order?: number;
    borderDash?: number[];
  };

  // Price chart data
  const priceDatasets: ChartDataset[] = [
    {
      label: 'Price',
      data: prices,
      borderColor: periodChange !== null && periodChange >= 0 
        ? (isDark ? '#34d399' : '#10b981')
        : (isDark ? '#f87171' : '#ef4444'),
      backgroundColor: periodChange !== null && periodChange >= 0
        ? (isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(16, 185, 129, 0.1)')
        : (isDark ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: periodChange !== null && periodChange >= 0 
        ? (isDark ? '#34d399' : '#10b981')
        : (isDark ? '#f87171' : '#ef4444'),
      borderWidth: 2,
      order: 1,
    },
  ];

  // Add Bollinger Bands (before price so it appears behind)
  if (enabledStudies.bollingerBands && bollingerBands.upper.length > 0) {
    priceDatasets.unshift(
      {
        label: 'BB Upper',
        data: bollingerBands.upper,
        borderColor: isDark ? COLORS.bollingerMiddle.dark : COLORS.bollingerMiddle.light,
        backgroundColor: isDark ? COLORS.bollingerBand.dark : COLORS.bollingerBand.light,
        fill: '+1',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHoverBackgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [5, 5],
      },
      {
        label: 'BB Middle',
        data: bollingerBands.middle,
        borderColor: isDark ? COLORS.bollingerMiddle.dark : COLORS.bollingerMiddle.light,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHoverBackgroundColor: 'transparent',
        borderWidth: 1.5,
      },
      {
        label: 'BB Lower',
        data: bollingerBands.lower,
        borderColor: isDark ? COLORS.bollingerMiddle.dark : COLORS.bollingerMiddle.light,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHoverBackgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [5, 5],
      }
    );
  }

  // Add SMA lines (on top of price)
  if (enabledStudies.sma) {
    if (smaShort.length > 0) {
      priceDatasets.push({
        label: `SMA ${smaConfig.shortPeriod}`,
        data: smaShort,
        borderColor: isDark ? COLORS.smaShort.dark : COLORS.smaShort.light,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHoverBackgroundColor: 'transparent',
        borderWidth: 2,
      });
    }
    if (smaLong.length > 0) {
      priceDatasets.push({
        label: `SMA ${smaConfig.longPeriod}`,
        data: smaLong,
        borderColor: isDark ? COLORS.smaLong.dark : COLORS.smaLong.light,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHoverBackgroundColor: 'transparent',
        borderWidth: 2,
      });
    }
  }

  // Create price chart data object
  const priceChartData = {
    labels,
    datasets: priceDatasets,
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

  // MACD chart data
  const macdChartData = {
    labels,
    datasets: [
      {
        label: 'MACD',
        data: macdData.macdLine,
        borderColor: isDark ? COLORS.macdLine.dark : COLORS.macdLine.light,
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Signal',
        data: macdData.signalLine,
        borderColor: isDark ? COLORS.macdSignal.dark : COLORS.macdSignal.light,
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  // MACD Histogram data
  const histogramColors = macdData.histogram.map(val => 
    val !== null && val >= 0 
      ? (isDark ? COLORS.macdHistogramPos.dark : COLORS.macdHistogramPos.light)
      : (isDark ? COLORS.macdHistogramNeg.dark : COLORS.macdHistogramNeg.light)
  );

  const macdHistogramData = {
    labels,
    datasets: [
      {
        label: 'Histogram',
        data: macdData.histogram,
        backgroundColor: histogramColors,
        borderWidth: 0,
        barPercentage: 0.8,
      },
    ],
  };

  const priceOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: enabledStudies.sma || enabledStudies.bollingerBands,
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 11 },
          color: isDark ? '#9ca3af' : '#6b7280',
          filter: (item) => !item.text?.includes('BB Upper') && !item.text?.includes('BB Lower'),
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#000',
        bodyColor: isDark ? '#fff' : '#000',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            if (value === null) return '';
            const label = context.dataset.label || '';
            if (label === 'Price' || label.includes('BB') || label.includes('SMA')) {
              return `${label}: $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            return `${label}: ${value.toFixed(2)}`;
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
            const numValue = Number(value);
            if (numValue >= 1000) {
              return '$' + (numValue / 1000).toFixed(1) + 'K';
            }
            return '$' + numValue.toLocaleString('en-US');
          },
          font: {
            size: 11,
          },
        },
      },
    },
  };

  const rsiOptions: ChartOptions<'line'> = {
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

  const macdOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 10 },
          color: isDark ? '#9ca3af' : '#6b7280',
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#000',
        bodyColor: isDark ? '#fff' : '#000',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y?.toFixed(4) || 'N/A'}`,
        },
      },
    },
    scales: {
      x: { display: false },
      y: {
        display: true,
        position: 'right',
        grid: { color: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)' },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          font: { size: 11 },
          callback: (value) => Number(value).toFixed(2),
        },
      },
    },
  };

  const macdHistogramOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#000',
        bodyColor: isDark ? '#fff' : '#000',
        callbacks: {
          label: (context) => `Histogram: ${context.parsed.y?.toFixed(4) || 'N/A'}`,
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false, grid: { display: false } },
    },
  };

  // Get current RSI value
  const currentRSI = rsiData.filter((v): v is number => v !== null).pop();
  const rsiStatus: RSIStatus = currentRSI !== undefined && currentRSI > 70 
    ? 'overbought' 
    : currentRSI !== undefined && currentRSI < 30 
      ? 'oversold' 
      : 'neutral';

  return (
    <div className="crypto-chart">
      {/* Period Change Badge */}
      <div className="chart-stats">
        <div className={`period-change-badge ${periodChange !== null && periodChange >= 0 ? 'positive' : 'negative'}`}>
          <span className="change-label">{getTimePeriodLabel(timePeriod)} Change:</span>
          <span className="change-value">
            {periodChange !== null && periodChange >= 0 ? '▲' : '▼'} {Math.abs(periodChange ?? 0).toFixed(2)}%
          </span>
        </div>
        {enabledStudies.rsi && currentRSI !== undefined && (
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

      {/* Chart Legend for overlay studies */}
      {(enabledStudies.sma || enabledStudies.bollingerBands) && (
        <div className="chart-legend">
          {enabledStudies.sma && (
            <>
              <a href={SMA_INFO.source} target="_blank" rel="noopener noreferrer" className="legend-item" title={smaConfig.description}>
                <span className="legend-color" style={{ background: isDark ? COLORS.smaShort.dark : COLORS.smaShort.light }}></span>
                <span>SMA {smaConfig.shortPeriod}</span>
              </a>
              <a href={SMA_INFO.source} target="_blank" rel="noopener noreferrer" className="legend-item" title={smaConfig.description}>
                <span className="legend-color" style={{ background: isDark ? COLORS.smaLong.dark : COLORS.smaLong.light }}></span>
                <span>SMA {smaConfig.longPeriod}</span>
              </a>
            </>
          )}
          {enabledStudies.bollingerBands && (
            <a href={BOLLINGER_INFO.source} target="_blank" rel="noopener noreferrer" className="legend-item" title={bollingerConfig.description}>
              <span className="legend-color" style={{ background: isDark ? COLORS.bollingerMiddle.dark : COLORS.bollingerMiddle.light }}></span>
              <span>BB ({bollingerConfig.period}, {bollingerConfig.stdDev})</span>
            </a>
          )}
        </div>
      )}

      {/* RSI Chart */}
      {enabledStudies.rsi && (
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
              <span className="level overbought" title={RSI_INFO.levels?.overbought}>70 - Overbought</span>
              <span className="level oversold" title={RSI_INFO.levels?.oversold}>30 - Oversold</span>
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
      )}

      {/* MACD Chart */}
      {enabledStudies.macd && (
        <div className="macd-chart-container">
          <div className="macd-chart-header">
            <a 
              href={MACD_INFO.source}
              target="_blank"
              rel="noopener noreferrer"
              className="indicator-label-link"
              title={macdConfig.description}
            >
              <span className="indicator-label">MACD ({macdConfig.fastPeriod}/{macdConfig.slowPeriod}/{macdConfig.signalPeriod})</span>
              <span className="info-icon">ⓘ</span>
            </a>
          </div>
          <div className="macd-chart-wrapper">
            <div className="macd-histogram">
              <Bar data={macdHistogramData} options={macdHistogramOptions} />
            </div>
            <div className="macd-lines">
              <Line data={macdChartData} options={macdOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
