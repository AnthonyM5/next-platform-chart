# Technical Indicators Implementation Plan

## Overview
Add professional-grade technical analysis indicators to the crypto dashboard with a studies dropdown toggle system.

## Research Sources
- [SMA - Investopedia](https://www.investopedia.com/terms/s/sma.asp)
- [Moving Average Buy Strategies](https://www.investopedia.com/articles/active-trading/052014/how-use-moving-average-buy-stocks.asp)
- [MACD - Investopedia](https://www.investopedia.com/terms/m/macd.asp)
- [Bollinger Bands - Investopedia](https://www.investopedia.com/terms/b/bollingerbands.asp)

---

## Indicators to Implement

### 1. Simple Moving Average (SMA)
**Purpose:** Smooths price data to identify trend direction

**Standard Periods:**
| Timeframe | Short SMA | Long SMA | Use Case |
|-----------|-----------|----------|----------|
| 24h       | 10        | 20       | Intraday trends |
| 7d        | 20        | 50       | Short-term trends |
| 30d       | 20        | 50       | Medium-term trends |
| 1y        | 50        | 200      | Long-term trends (Golden/Death Cross) |

**Key Signals:**
- **Golden Cross:** Short SMA crosses above Long SMA → Bullish
- **Death Cross:** Short SMA crosses below Long SMA → Bearish
- Price above SMA → Uptrend support
- Price below SMA → Downtrend resistance

**Calculation:**
```javascript
function calculateSMA(data, period) {
  const sma = [];
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
```

---

### 2. MACD (Moving Average Convergence Divergence)
**Purpose:** Shows relationship between two EMAs, momentum indicator

**Standard Settings:** 12/26/9 (fast EMA / slow EMA / signal line)

**Components:**
1. **MACD Line:** 12-period EMA - 26-period EMA
2. **Signal Line:** 9-period EMA of MACD Line
3. **Histogram:** MACD Line - Signal Line

**Key Signals:**
- MACD crosses above Signal → Bullish
- MACD crosses below Signal → Bearish
- Histogram positive/negative shows momentum strength
- Divergence from price indicates potential reversal

**Calculation:**
```javascript
function calculateEMA(data, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
    ema.push(null);
  }
  ema[period - 1] = sum / period;
  
  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  return ema;
}

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine = fastEMA.map((fast, i) => 
    fast !== null && slowEMA[i] !== null ? fast - slowEMA[i] : null
  );
  
  const validMACD = macdLine.filter(v => v !== null);
  const signalLine = calculateEMA(validMACD, signalPeriod);
  
  const histogram = macdLine.map((macd, i) => 
    macd !== null && signalLine[i] !== null ? macd - signalLine[i] : null
  );
  
  return { macdLine, signalLine, histogram };
}
```

**Timeframe Adjustments:**
| Timeframe | Fast | Slow | Signal | Notes |
|-----------|------|------|--------|-------|
| 24h       | 8    | 17   | 9      | Faster response for intraday |
| 7d        | 12   | 26   | 9      | Standard settings |
| 30d       | 12   | 26   | 9      | Standard settings |
| 1y        | 12   | 26   | 9      | Standard settings |

---

### 3. Bollinger Bands
**Purpose:** Measures volatility and identifies overbought/oversold conditions

**Standard Settings:** 20-period SMA, 2 standard deviations

**Components:**
1. **Middle Band:** 20-period SMA
2. **Upper Band:** Middle + (2 × standard deviation)
3. **Lower Band:** Middle - (2 × standard deviation)

**Key Signals:**
- **Squeeze:** Bands narrow → Low volatility, breakout pending
- **Expansion:** Bands widen → High volatility
- Price touching upper band → Potentially overbought
- Price touching lower band → Potentially oversold
- **W-Bottom:** Double bottom with second low above lower band → Bullish
- **M-Top:** Double top with second high below upper band → Bearish

**Calculation:**
```javascript
function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const sma = calculateSMA(data, period);
  const upper = [];
  const lower = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  
  return { upper, middle: sma, lower };
}
```

**Timeframe Adjustments:**
| Timeframe | Period | Std Dev | Notes |
|-----------|--------|---------|-------|
| 24h       | 10     | 2       | Shorter for intraday |
| 7d        | 20     | 2       | Standard |
| 30d       | 20     | 2       | Standard |
| 1y        | 20     | 2       | Standard |

---

## Implementation Architecture

### Phase 1: State Management
Add to `cryptoStore.js`:
```javascript
enabledStudies: {
  rsi: true,        // Already implemented, default on
  sma: false,
  macd: false,
  bollingerBands: false
},
toggleStudy: (study) => set((state) => ({
  enabledStudies: {
    ...state.enabledStudies,
    [study]: !state.enabledStudies[study]
  }
})),
```

### Phase 2: Studies Dropdown Component
Create `StudiesDropdown.jsx`:
- Dropdown button with gear/chart icon
- Checkbox list for each indicator
- Persist selections to localStorage via store

### Phase 3: Chart Integration
Update `CryptoChart.jsx`:
- Add calculation functions
- Conditionally render overlays based on `enabledStudies`
- SMA & Bollinger: Overlay on price chart
- MACD: Separate panel below RSI

### Phase 4: Styling
- Color scheme for each indicator
- Responsive panel heights
- Legend with toggle capability

### Phase 5: Documentation
- Add `*_CONFIG` and `*_INFO` objects like RSI
- Info tooltips with Investopedia links
- Signal explanations on hover

---

## Chart Layout Plan

```
┌─────────────────────────────────────┐
│  Price Chart                        │
│  + SMA overlays (when enabled)      │
│  + Bollinger Bands (when enabled)   │
├─────────────────────────────────────┤
│  RSI Panel (when enabled)           │
├─────────────────────────────────────┤
│  MACD Panel (when enabled)          │
│  - MACD Line                        │
│  - Signal Line                      │
│  - Histogram                        │
└─────────────────────────────────────┘
```

---

## Color Scheme

| Indicator | Color | Hex |
|-----------|-------|-----|
| Price | Blue | #3b82f6 |
| SMA Short | Orange | #f59e0b |
| SMA Long | Purple | #8b5cf6 |
| Bollinger Upper | Green (30%) | rgba(34, 197, 94, 0.3) |
| Bollinger Middle | Green | #22c55e |
| Bollinger Lower | Green (30%) | rgba(34, 197, 94, 0.3) |
| MACD Line | Cyan | #06b6d4 |
| Signal Line | Pink | #ec4899 |
| Histogram + | Green | #22c55e |
| Histogram - | Red | #ef4444 |
| RSI | Yellow | #eab308 |

---

## Validation Strategy

1. **Unit Tests:** Test calculation functions with known inputs
2. **Visual Comparison:** Compare outputs with TradingView/CoinGecko
3. **Edge Cases:**
   - Insufficient data points (show partial or hide)
   - Null/undefined values in data
   - Very short timeframes
4. **Performance:** Memoize calculations to prevent re-renders

---

## Implementation Order

1. ✅ RSI (already implemented)
2. ⏳ Studies dropdown UI
3. ⏳ SMA overlay
4. ⏳ Bollinger Bands overlay  
5. ⏳ MACD panel

---

## Data Requirements

| Indicator | Min Data Points |
|-----------|-----------------|
| RSI (9) | 10+ |
| RSI (14) | 15+ |
| RSI (21) | 22+ |
| SMA (10) | 10+ |
| SMA (20) | 20+ |
| SMA (50) | 50+ |
| SMA (200) | 200+ |
| MACD | 35+ (26 for slow EMA + 9 for signal) |
| Bollinger | 20+ |

---

*Last Updated: January 18, 2026*
