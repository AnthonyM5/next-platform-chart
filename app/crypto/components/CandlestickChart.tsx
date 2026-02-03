'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useCryptoStore } from '../store/cryptoStore';
import {
  calculateSMA,
  calculateMACD,
  calculateBollingerBands,
  getSMAConfig,
  getMACDConfig,
  getBollingerConfig,
} from '../utils/indicators';
import type { OHLCData, OHLCCandle, TimePeriod, MACDData, BollingerBandsData } from '../types';

interface CandlestickChartProps {
  ohlcData: OHLCData | null;
  loading?: boolean;
}

interface CandleMetrics {
  x: number;
  candleWidth: number;
  wickX: number;
  bodyTop: number;
  bodyHeight: number;
  wickTop: number;
  wickBottom: number;
  isBullish: boolean;
}

// Calculate Y position in the SVG
function scaleY(value: number, minPrice: number, maxPrice: number, chartHeight: number, padding: number): number {
  const range = maxPrice - minPrice || 1;
  return padding + (chartHeight - 2 * padding) * (1 - (value - minPrice) / range);
}

// Calculate RSI from close prices
function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  if (prices.length < period + 1) return [];
  
  const rsiValues: (number | null)[] = [];
  const changes: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  for (let i = 0; i < period; i++) {
    rsiValues.push(null);
  }
  
  if (avgLoss === 0) {
    rsiValues.push(100);
  } else {
    const rs = avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));
  }
  
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

// Get RSI period based on time period
function getRSIPeriod(timePeriod: TimePeriod): number {
  const config: Record<TimePeriod, number> = { '1': 9, '7': 14, '30': 14, '365': 21 };
  return config[timePeriod] || 14;
}

export default function CandlestickChart({ ohlcData, loading }: CandlestickChartProps) {
  const { theme, timePeriod, enabledStudies } = useCryptoStore();
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [hoveredCandle, setHoveredCandle] = useState<OHLCCandle | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        // Smaller height on mobile
        const isMobile = width < 640;
        const height = isMobile ? 300 : 400;
        setDimensions({ width: Math.max(width, 280), height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const { candles, priceRange, candleMetrics, labels, closePrices, smaShort, smaLong, bollingerBands, macdData, rsiData, smaConfig } = useMemo(() => {
    if (!ohlcData || !ohlcData.candles || ohlcData.candles.length === 0) {
      return { 
        candles: [], 
        priceRange: { min: 0, max: 0 }, 
        candleMetrics: [], 
        labels: [],
        closePrices: [],
        smaShort: [],
        smaLong: [],
        bollingerBands: { upper: [], middle: [], lower: [] } as BollingerBandsData,
        macdData: { macdLine: [], signalLine: [], histogram: [] } as MACDData,
        rsiData: [],
        smaConfig: getSMAConfig(timePeriod),
      };
    }

    const c = ohlcData.candles;
    const closes = c.map(candle => candle.close);
    
    // Calculate indicators from close prices
    const smaConf = getSMAConfig(timePeriod);
    const shortSMA = calculateSMA(closes, smaConf.shortPeriod);
    const longSMA = calculateSMA(closes, smaConf.longPeriod);
    const bbConf = getBollingerConfig(timePeriod);
    const bb = calculateBollingerBands(closes, bbConf.period, bbConf.stdDev);
    const macdConf = getMACDConfig(timePeriod);
    const macd = calculateMACD(closes, macdConf.fastPeriod, macdConf.slowPeriod, macdConf.signalPeriod);
    const rsiPeriod = getRSIPeriod(timePeriod);
    const rsi = calculateRSI(closes, rsiPeriod);

    const allPrices = c.flatMap(candle => [candle.high, candle.low]);
    // Include Bollinger Bands in price range if enabled
    if (enabledStudies.bollingerBands) {
      bb.upper.forEach(v => { if (v !== null) allPrices.push(v); });
      bb.lower.forEach(v => { if (v !== null) allPrices.push(v); });
    }
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const pricePadding = (maxPrice - minPrice) * 0.05;
    const adjustedMin = minPrice - pricePadding;
    const adjustedMax = maxPrice + pricePadding;

    const chartWidth = dimensions.width;
    const chartHeight = dimensions.height;
    const paddingLeft = 70;
    const paddingRight = 20;
    const paddingY = 30;
    const availableWidth = chartWidth - paddingLeft - paddingRight;
    const candleWidth = Math.max(2, Math.min(20, (availableWidth / c.length) * 0.7));
    const gap = (availableWidth - candleWidth * c.length) / (c.length + 1);

    const metrics: CandleMetrics[] = c.map((candle, i) => {
      const x = paddingLeft + gap + i * (candleWidth + gap);
      const wickX = x + candleWidth / 2;
      const isBullish = candle.close >= candle.open;
      
      const bodyTop = scaleY(
        isBullish ? candle.close : candle.open,
        adjustedMin,
        adjustedMax,
        chartHeight,
        paddingY
      );
      const bodyBottom = scaleY(
        isBullish ? candle.open : candle.close,
        adjustedMin,
        adjustedMax,
        chartHeight,
        paddingY
      );
      const wickTop = scaleY(candle.high, adjustedMin, adjustedMax, chartHeight, paddingY);
      const wickBottom = scaleY(candle.low, adjustedMin, adjustedMax, chartHeight, paddingY);

      return {
        x,
        candleWidth,
        wickX,
        bodyTop,
        bodyHeight: Math.max(1, bodyBottom - bodyTop),
        wickTop,
        wickBottom,
        isBullish,
      };
    });

    // Generate time labels
    const labelCount = Math.min(8, c.length);
    const labelInterval = Math.floor(c.length / labelCount);
    const timeLabels = c
      .filter((_, i) => i % labelInterval === 0)
      .map((candle, i) => {
        const date = new Date(candle.timestamp);
        let label: string;
        if (timePeriod === '1') {
          label = format(date, 'HH:mm');
        } else if (timePeriod === '365') {
          label = format(date, 'MMM yyyy');
        } else {
          label = format(date, 'MMM d');
        }
        const idx = i * labelInterval;
        return {
          label,
          x: metrics[idx]?.x + candleWidth / 2 || 0,
        };
      });

    return {
      candles: c,
      priceRange: { min: adjustedMin, max: adjustedMax },
      candleMetrics: metrics,
      labels: timeLabels,
      closePrices: closes,
      smaShort: shortSMA,
      smaLong: longSMA,
      bollingerBands: bb,
      macdData: macd,
      rsiData: rsi,
      smaConfig: smaConf,
    };
  }, [ohlcData, dimensions, timePeriod, enabledStudies.bollingerBands]);

  // Generate Y-axis price labels
  const priceLabels = useMemo(() => {
    if (priceRange.min === 0 && priceRange.max === 0) return [];
    const count = 5;
    const step = (priceRange.max - priceRange.min) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const price = priceRange.max - i * step;
      const y = scaleY(price, priceRange.min, priceRange.max, dimensions.height, 30);
      return { price, y };
    });
  }, [priceRange, dimensions.height]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || candles.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Find closest candle
    const paddingLeft = 70;
    const relativeX = x - paddingLeft;
    const availableWidth = dimensions.width - paddingLeft - 20;
    const candleIndex = Math.floor((relativeX / availableWidth) * candles.length);
    
    if (candleIndex >= 0 && candleIndex < candles.length) {
      setHoveredCandle(candles[candleIndex]);
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
  };

  // Colors
  const bullColor = isDark ? '#22c55e' : '#16a34a';
  const bearColor = isDark ? '#ef4444' : '#dc2626';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const bgColor = isDark ? '#111827' : '#ffffff';

  if (loading) {
    return (
      <div className="candlestick-loading" ref={containerRef}>
        <div className="animate-pulse" style={{ height: 400, background: isDark ? '#1f2937' : '#f3f4f6', borderRadius: 8 }} />
      </div>
    );
  }

  if (!ohlcData || candles.length === 0) {
    return (
      <div className="candlestick-empty" ref={containerRef}>
        <p style={{ textAlign: 'center', padding: 40, color: textColor }}>No OHLC data available</p>
      </div>
    );
  }

  return (
    <div className="candlestick-chart-container" ref={containerRef}>
      {/* Provider & granularity badge */}
      <div className="chart-info-badge" style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: isDark ? '#374151' : '#e5e7eb',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 11,
        color: textColor,
        zIndex: 10,
      }}>
        {ohlcData.provider === 'coinbase' ? '🟢 Coinbase' : '🦎 CoinGecko'} • {ohlcData.granularity}
      </div>

      <svg
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'crosshair' }}
      >
        {/* Background */}
        <rect width={dimensions.width} height={dimensions.height} fill={bgColor} rx={8} />

        {/* Grid lines */}
        {priceLabels.map(({ y }, i) => (
          <line
            key={`grid-${i}`}
            x1={60}
            x2={dimensions.width - 10}
            y1={y}
            y2={y}
            stroke={gridColor}
            strokeDasharray="4 4"
            strokeWidth={0.5}
          />
        ))}

        {/* Y-axis price labels */}
        {priceLabels.map(({ price, y }, i) => (
          <text
            key={`price-${i}`}
            x={55}
            y={y + 4}
            textAnchor="end"
            fill={textColor}
            fontSize={11}
          >
            {formatPrice(price)}
          </text>
        ))}

        {/* X-axis time labels */}
        {labels.map(({ label, x }, i) => (
          <text
            key={`time-${i}`}
            x={x}
            y={dimensions.height - 8}
            textAnchor="middle"
            fill={textColor}
            fontSize={10}
          >
            {label}
          </text>
        ))}

        {/* Candles */}
        {candleMetrics.map((m, i) => (
          <g key={`candle-${i}`}>
            {/* Wick */}
            <line
              x1={m.wickX}
              x2={m.wickX}
              y1={m.wickTop}
              y2={m.wickBottom}
              stroke={m.isBullish ? bullColor : bearColor}
              strokeWidth={1}
            />
            {/* Body */}
            <rect
              x={m.x}
              y={m.bodyTop}
              width={m.candleWidth}
              height={m.bodyHeight}
              fill={m.isBullish ? bullColor : bearColor}
              rx={1}
            />
          </g>
        ))}

        {/* Bollinger Bands - filled area */}
        {enabledStudies.bollingerBands && bollingerBands.upper.length > 0 && (
          <path
            d={(() => {
              const upperPath = candleMetrics.map((m, i) => {
                const value = bollingerBands.upper[i];
                if (value === null) return '';
                const y = scaleY(value, priceRange.min, priceRange.max, dimensions.height, 30);
                return i === 0 || bollingerBands.upper[i - 1] === null ? `M${m.wickX},${y}` : `L${m.wickX},${y}`;
              }).join(' ');
              const lowerPath = [...candleMetrics].reverse().map((m, i) => {
                const origIdx = candleMetrics.length - 1 - i;
                const value = bollingerBands.lower[origIdx];
                if (value === null) return '';
                const y = scaleY(value, priceRange.min, priceRange.max, dimensions.height, 30);
                return `L${m.wickX},${y}`;
              }).join(' ');
              return `${upperPath} ${lowerPath} Z`;
            })()}
            fill={isDark ? 'rgba(52, 211, 153, 0.1)' : 'rgba(34, 197, 94, 0.1)'}
            stroke="none"
          />
        )}

        {/* Bollinger Bands - middle line */}
        {enabledStudies.bollingerBands && bollingerBands.middle.length > 0 && (
          <path
            d={candleMetrics.map((m, i) => {
              const value = bollingerBands.middle[i];
              if (value === null) return '';
              const y = scaleY(value, priceRange.min, priceRange.max, dimensions.height, 30);
              return i === 0 || bollingerBands.middle[i - 1] === null ? `M${m.wickX},${y}` : `L${m.wickX},${y}`;
            }).join(' ')}
            fill="none"
            stroke={isDark ? '#34d399' : '#22c55e'}
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}

        {/* SMA Short */}
        {enabledStudies.sma && smaShort.length > 0 && (
          <path
            d={candleMetrics.map((m, i) => {
              const value = smaShort[i];
              if (value === null) return '';
              const y = scaleY(value, priceRange.min, priceRange.max, dimensions.height, 30);
              return i === 0 || smaShort[i - 1] === null ? `M${m.wickX},${y}` : `L${m.wickX},${y}`;
            }).join(' ')}
            fill="none"
            stroke={isDark ? '#fbbf24' : '#f59e0b'}
            strokeWidth={1.5}
          />
        )}

        {/* SMA Long */}
        {enabledStudies.sma && smaLong.length > 0 && (
          <path
            d={candleMetrics.map((m, i) => {
              const value = smaLong[i];
              if (value === null) return '';
              const y = scaleY(value, priceRange.min, priceRange.max, dimensions.height, 30);
              return i === 0 || smaLong[i - 1] === null ? `M${m.wickX},${y}` : `L${m.wickX},${y}`;
            }).join(' ')}
            fill="none"
            stroke={isDark ? '#a78bfa' : '#8b5cf6'}
            strokeWidth={1.5}
          />
        )}

        {/* Crosshair */}
        {hoveredCandle && (
          <>
            <line
              x1={mousePos.x}
              x2={mousePos.x}
              y1={30}
              y2={dimensions.height - 30}
              stroke={textColor}
              strokeDasharray="4 2"
              strokeWidth={0.5}
              opacity={0.5}
            />
            <line
              x1={60}
              x2={dimensions.width - 10}
              y1={mousePos.y}
              y2={mousePos.y}
              stroke={textColor}
              strokeDasharray="4 2"
              strokeWidth={0.5}
              opacity={0.5}
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredCandle && (
        <div
          className="candle-tooltip"
          style={{
            position: 'absolute',
            left: Math.min(mousePos.x + 15, dimensions.width - 160),
            top: Math.max(mousePos.y - 80, 10),
            background: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${gridColor}`,
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            color: isDark ? '#f9fafb' : '#111827',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {format(new Date(hoveredCandle.timestamp), 'MMM d, yyyy HH:mm')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 12px' }}>
            <span style={{ color: textColor }}>Open:</span>
            <span>{formatPrice(hoveredCandle.open)}</span>
            <span style={{ color: textColor }}>High:</span>
            <span style={{ color: bullColor }}>{formatPrice(hoveredCandle.high)}</span>
            <span style={{ color: textColor }}>Low:</span>
            <span style={{ color: bearColor }}>{formatPrice(hoveredCandle.low)}</span>
            <span style={{ color: textColor }}>Close:</span>
            <span style={{ color: hoveredCandle.close >= hoveredCandle.open ? bullColor : bearColor }}>
              {formatPrice(hoveredCandle.close)}
            </span>
            {hoveredCandle.volume !== undefined && (
              <>
                <span style={{ color: textColor }}>Volume:</span>
                <span>{hoveredCandle.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* RSI Panel */}
      {enabledStudies.rsi && rsiData.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: textColor, marginBottom: 4 }}>RSI ({getRSIPeriod(timePeriod)})</div>
          <svg width={dimensions.width} height={80} style={{ background: bgColor, borderRadius: 8 }}>
            {/* RSI zone backgrounds */}
            <rect x={70} y={0} width={dimensions.width - 90} height={16} fill={isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)'} />
            <rect x={70} y={64} width={dimensions.width - 90} height={16} fill={isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)'} />
            
            {/* RSI levels */}
            {[70, 50, 30].map((level) => {
              const y = 8 + ((100 - level) / 100) * 64;
              return (
                <g key={`rsi-level-${level}`}>
                  <line x1={70} x2={dimensions.width - 20} y1={y} y2={y} stroke={gridColor} strokeDasharray="4 4" strokeWidth={0.5} />
                  <text x={65} y={y + 3} textAnchor="end" fill={textColor} fontSize={9}>{level}</text>
                </g>
              );
            })}
            
            {/* RSI line */}
            <path
              d={candleMetrics.map((m, i) => {
                const value = rsiData[i];
                if (value === null || value === undefined) return '';
                const y = 8 + ((100 - value) / 100) * 64;
                return i === 0 || rsiData[i - 1] === null ? `M${m.wickX},${y}` : `L${m.wickX},${y}`;
              }).join(' ')}
              fill="none"
              stroke={isDark ? '#a78bfa' : '#8b5cf6'}
              strokeWidth={1.5}
            />
          </svg>
        </div>
      )}

      {/* MACD Panel */}
      {enabledStudies.macd && macdData.macdLine.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: textColor, marginBottom: 4 }}>MACD</div>
          <svg width={dimensions.width} height={80} style={{ background: bgColor, borderRadius: 8 }}>
            {/* Zero line */}
            <line x1={70} x2={dimensions.width - 20} y1={40} y2={40} stroke={gridColor} strokeWidth={0.5} />
            <text x={65} y={43} textAnchor="end" fill={textColor} fontSize={9}>0</text>
            
            {/* MACD histogram */}
            {(() => {
              const validHistogram = macdData.histogram.filter((v): v is number => v !== null);
              if (validHistogram.length === 0) return null;
              const maxAbs = Math.max(...validHistogram.map(Math.abs), 0.01);
              return candleMetrics.map((m, i) => {
                const value = macdData.histogram[i];
                if (value === null) return null;
                const barHeight = Math.abs(value) / maxAbs * 32;
                const y = value >= 0 ? 40 - barHeight : 40;
                return (
                  <rect
                    key={`hist-${i}`}
                    x={m.wickX - 1.5}
                    y={y}
                    width={3}
                    height={barHeight}
                    fill={value >= 0 ? (isDark ? '#34d399' : '#10b981') : (isDark ? '#f87171' : '#ef4444')}
                    opacity={0.7}
                  />
                );
              });
            })()}
            
            {/* MACD line */}
            {(() => {
              const validValues = macdData.macdLine.filter((v): v is number => v !== null);
              if (validValues.length === 0) return null;
              const maxAbs = Math.max(...validValues.map(Math.abs), ...macdData.signalLine.filter((v): v is number => v !== null).map(Math.abs), 0.01);
              return (
                <path
                  d={candleMetrics.map((m, i) => {
                    const value = macdData.macdLine[i];
                    if (value === null) return '';
                    const y = 40 - (value / maxAbs) * 32;
                    return i === 0 || macdData.macdLine[i - 1] === null ? `M${m.wickX},${y}` : `L${m.wickX},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={isDark ? '#22d3ee' : '#06b6d4'}
                  strokeWidth={1.5}
                />
              );
            })()}
            
            {/* Signal line */}
            {(() => {
              const validValues = macdData.signalLine.filter((v): v is number => v !== null);
              if (validValues.length === 0) return null;
              const maxAbs = Math.max(...macdData.macdLine.filter((v): v is number => v !== null).map(Math.abs), ...validValues.map(Math.abs), 0.01);
              return (
                <path
                  d={candleMetrics.map((m, i) => {
                    const value = macdData.signalLine[i];
                    if (value === null) return '';
                    const y = 40 - (value / maxAbs) * 32;
                    return i === 0 || macdData.signalLine[i - 1] === null ? `M${m.wickX},${y}` : `L${m.wickX},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={isDark ? '#f472b6' : '#ec4899'}
                  strokeWidth={1.5}
                />
              );
            })()}
          </svg>
        </div>
      )}

      {/* Study legend */}
      {(enabledStudies.sma || enabledStudies.bollingerBands) && (
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginTop: 8, 
          fontSize: 11, 
          color: textColor,
          flexWrap: 'wrap'
        }}>
          {enabledStudies.sma && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 2, background: isDark ? '#fbbf24' : '#f59e0b' }} />
                SMA({smaConfig.shortPeriod})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 2, background: isDark ? '#a78bfa' : '#8b5cf6' }} />
                SMA({smaConfig.longPeriod})
              </span>
            </>
          )}
          {enabledStudies.bollingerBands && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 2, background: isDark ? '#34d399' : '#22c55e' }} />
              Bollinger Bands
            </span>
          )}
        </div>
      )}

      <style jsx>{`
        .candlestick-chart-container {
          position: relative;
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
