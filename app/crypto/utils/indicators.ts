/**
 * Technical Indicator Calculation Functions
 * 
 * Based on industry-standard formulas from Investopedia:
 * - SMA: https://www.investopedia.com/terms/s/sma.asp
 * - MACD: https://www.investopedia.com/terms/m/macd.asp
 * - Bollinger Bands: https://www.investopedia.com/terms/b/bollingerbands.asp
 */

import type { 
  TimePeriod, 
  MACDData, 
  BollingerBandsData,
  SMAConfigMap,
  MACDConfigMap,
  BollingerConfigMap,
  IndicatorInfo
} from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * SMA Configuration per timeframe
 * Short SMA for quick trends, Long SMA for major trends
 */
export const SMA_CONFIG: SMAConfigMap = {
  '1': {
    shortPeriod: 10,
    longPeriod: 20,
    description: 'SMA(10/20) - Shorter periods for intraday analysis',
  },
  '7': {
    shortPeriod: 20,
    longPeriod: 50,
    description: 'SMA(20/50) - Standard periods for weekly swing trading',
  },
  '30': {
    shortPeriod: 20,
    longPeriod: 50,
    description: 'SMA(20/50) - Medium-term trend identification',
  },
  '365': {
    shortPeriod: 50,
    longPeriod: 200,
    description: 'SMA(50/200) - Golden/Death Cross analysis for long-term trends',
  },
};

/**
 * MACD Configuration per timeframe
 * Standard: 12/26/9 (fast EMA / slow EMA / signal)
 */
export const MACD_CONFIG: MACDConfigMap = {
  '1': {
    fastPeriod: 8,
    slowPeriod: 17,
    signalPeriod: 9,
    description: 'MACD(8/17/9) - Faster response for intraday',
  },
  '7': {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    description: 'MACD(12/26/9) - Standard settings',
  },
  '30': {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    description: 'MACD(12/26/9) - Standard settings',
  },
  '365': {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    description: 'MACD(12/26/9) - Standard settings',
  },
};

/**
 * Bollinger Bands Configuration per timeframe
 * Standard: 20-period SMA with 2 standard deviations
 */
export const BOLLINGER_CONFIG: BollingerConfigMap = {
  '1': {
    period: 10,
    stdDev: 2,
    description: 'BB(10,2) - Shorter period for intraday volatility',
  },
  '7': {
    period: 20,
    stdDev: 2,
    description: 'BB(20,2) - Standard settings',
  },
  '30': {
    period: 20,
    stdDev: 2,
    description: 'BB(20,2) - Standard settings',
  },
  '365': {
    period: 20,
    stdDev: 2,
    description: 'BB(20,2) - Standard settings',
  },
};

// Educational info for tooltips
export const SMA_INFO: IndicatorInfo = {
  title: 'Simple Moving Average (SMA)',
  description: 'Average price over a specified period. Short SMA crossing above Long SMA = Golden Cross (bullish). Opposite = Death Cross (bearish).',
  source: 'https://www.investopedia.com/terms/s/sma.asp',
};

export const MACD_INFO: IndicatorInfo = {
  title: 'Moving Average Convergence Divergence (MACD)',
  description: 'Momentum indicator showing relationship between two EMAs. MACD crossing above Signal = bullish. Histogram shows momentum strength.',
  source: 'https://www.investopedia.com/terms/m/macd.asp',
};

export const BOLLINGER_INFO: IndicatorInfo = {
  title: 'Bollinger Bands',
  description: 'Volatility indicator with upper/lower bands 2 standard deviations from SMA. Price near upper band = potentially overbought. Squeeze = low volatility, potential breakout.',
  source: 'https://www.investopedia.com/terms/b/bollingerbands.asp',
};

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Simple Moving Average (SMA)
 * @param data - Array of price values
 * @param period - Number of periods for averaging
 * @returns Array of SMA values (null for insufficient data points)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param data - Array of price values
 * @param period - Number of periods
 * @returns Array of EMA values (null for insufficient data points)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    sum += data[i];
    ema.push(null);
  }
  
  if (data.length < period) {
    return ema;
  }
  
  // Set first EMA as SMA
  ema[period - 1] = sum / period;
  
  // Calculate subsequent EMA values
  for (let i = period; i < data.length; i++) {
    const prevEma = ema[i - 1];
    if (prevEma !== null) {
      ema.push((data[i] - prevEma) * multiplier + prevEma);
    } else {
      ema.push(null);
    }
  }
  
  return ema;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param data - Array of price values
 * @param fastPeriod - Fast EMA period (default: 12)
 * @param slowPeriod - Slow EMA period (default: 26)
 * @param signalPeriod - Signal line period (default: 9)
 * @returns Object containing macdLine, signalLine, and histogram arrays
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // MACD Line = Fast EMA - Slow EMA
  const macdLine: (number | null)[] = fastEMA.map((fast, i) => {
    const slow = slowEMA[i];
    if (fast !== null && slow !== null) {
      return fast - slow;
    }
    return null;
  });
  
  // Extract valid MACD values for signal calculation
  const validMACDValues: number[] = [];
  const validMACDIndices: number[] = [];
  
  macdLine.forEach((val, i) => {
    if (val !== null) {
      validMACDValues.push(val);
      validMACDIndices.push(i);
    }
  });
  
  // Signal Line = EMA of MACD Line
  const signalEMA = calculateEMA(validMACDValues, signalPeriod);
  
  // Map signal values back to original indices
  const signalLine: (number | null)[] = new Array(data.length).fill(null);
  signalEMA.forEach((val, i) => {
    if (val !== null && validMACDIndices[i] !== undefined) {
      signalLine[validMACDIndices[i]] = val;
    }
  });
  
  // Histogram = MACD Line - Signal Line
  const histogram: (number | null)[] = macdLine.map((macd, i) => {
    const signal = signalLine[i];
    if (macd !== null && signal !== null) {
      return macd - signal;
    }
    return null;
  });
  
  return { macdLine, signalLine, histogram };
}

/**
 * Calculate Bollinger Bands
 * @param data - Array of price values
 * @param period - SMA period (default: 20)
 * @param stdDevMultiplier - Standard deviation multiplier (default: 2)
 * @returns Object containing upper, middle, and lower band arrays
 */
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsData {
  const middle = calculateSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      // Calculate standard deviation
      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      upper.push(mean + stdDevMultiplier * stdDev);
      lower.push(mean - stdDevMultiplier * stdDev);
    }
  }
  
  return { upper, middle, lower };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get SMA configuration for a specific time period
 */
export function getSMAConfig(timePeriod: TimePeriod) {
  return SMA_CONFIG[timePeriod] || SMA_CONFIG['7'];
}

/**
 * Get MACD configuration for a specific time period
 */
export function getMACDConfig(timePeriod: TimePeriod) {
  return MACD_CONFIG[timePeriod] || MACD_CONFIG['7'];
}

/**
 * Get Bollinger Bands configuration for a specific time period
 */
export function getBollingerConfig(timePeriod: TimePeriod) {
  return BOLLINGER_CONFIG[timePeriod] || BOLLINGER_CONFIG['7'];
}

/**
 * Check if there's enough data for a given indicator
 */
export function hasEnoughData(dataLength: number, requiredPeriod: number): boolean {
  return dataLength >= requiredPeriod;
}

/**
 * Get minimum data points required for each indicator per timeframe
 */
export function getMinDataPoints(timePeriod: TimePeriod): {
  sma: number;
  macd: number;
  bollinger: number;
} {
  const smaConfig = getSMAConfig(timePeriod);
  const macdConfig = getMACDConfig(timePeriod);
  const bollingerConfig = getBollingerConfig(timePeriod);
  
  return {
    sma: smaConfig.longPeriod,
    macd: macdConfig.slowPeriod + macdConfig.signalPeriod,
    bollinger: bollingerConfig.period,
  };
}
