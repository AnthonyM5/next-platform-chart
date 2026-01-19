# 📊 Cryptocurrency Dashboard

A modern, production-ready cryptocurrency tracking dashboard built with **Next.js 16**, **TypeScript**, and **Chart.js**. Features real-time price tracking, interactive charts, and professional-grade technical indicators.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chart.js&logoColor=white)

## ✨ Features

### Core Functionality
- **Real-time Data** — Live cryptocurrency prices from CoinGecko API with auto-refresh
- **Interactive Charts** — Price history with customizable time periods (24h, 7d, 30d, 1y)
- **Technical Indicators** — RSI, SMA, MACD, and Bollinger Bands
- **Dark/Light Mode** — Seamless theme switching with system preference detection
- **Favorites Watchlist** — Persistent favorites saved to localStorage
- **Fully Responsive** — Optimized for desktop, tablet, and mobile

### Technical Indicators
- **RSI (Relative Strength Index)** — Momentum oscillator with dynamic periods
- **SMA (Simple Moving Average)** — Short and long-term trend analysis
- **MACD (Moving Average Convergence Divergence)** — Trend-following momentum
- **Bollinger Bands** — Volatility and price level visualization

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
http://localhost:3000/crypto
```

## 📁 Project Structure

```
app/crypto/
├── api/
│   ├── coins/route.ts           # Cryptocurrency list endpoint
│   ├── coin-history/route.ts    # Historical price data
│   └── search/route.ts          # Search endpoint
├── components/
│   ├── CryptoDashboard.tsx      # Main dashboard container
│   ├── CryptoTable.tsx          # Table/Grid view
│   ├── CryptoChart.tsx          # Price chart with indicators
│   ├── StudiesDropdown.tsx      # Technical indicator selector
│   ├── ThemeToggle.tsx          # Dark/Light mode
│   ├── TimePeriodSelector.tsx   # Time period buttons
│   ├── ViewModeToggle.tsx       # Table/Grid toggle
│   ├── LoadingSkeleton.tsx      # Loading states
│   └── ErrorBoundary.tsx        # Error handling
├── store/
│   └── cryptoStore.ts           # Zustand state management
├── utils/
│   └── indicators.ts            # Technical indicator calculations
├── types/
│   └── index.ts                 # TypeScript type definitions
├── crypto-dashboard.css         # Complete styling
├── layout.tsx                   # Layout wrapper
└── page.tsx                     # Page entry point
```

## 📈 Technical Indicators Deep Dive

### RSI (Relative Strength Index)

The RSI measures momentum by comparing recent gains to recent losses on a 0-100 scale.

**Formula:**
```
RSI = 100 - (100 / (1 + RS))
RS = Average Gain / Average Loss
```

**Implementation:** Uses Wilder's smoothing method (exponential moving average) for accuracy.

**Dynamic Periods by Timeframe:**
| Timeframe | RSI Period | Rationale |
|-----------|------------|-----------|
| 24h (hourly data) | 9 | Shorter period for intraday momentum shifts |
| 7d | 14 | Standard Wilder period |
| 30d | 14 | Balanced for medium-term analysis |
| 1y (daily data) | 21 | Longer period filters noise for yearly trends |

**Signal Levels:**
- **> 70**: Overbought — potential reversal or strong uptrend
- **< 30**: Oversold — potential reversal or strong downtrend
- **50**: Neutral centerline

**Reference:** [Investopedia - RSI](https://www.investopedia.com/terms/r/rsi.asp)

---

### SMA (Simple Moving Average)

The SMA calculates the arithmetic mean of prices over a specified period, creating a smoothed trend line.

**Formula:**
```
SMA = (P1 + P2 + ... + Pn) / n
```

**Implementation:** Dual SMA strategy with short and long periods to identify crossovers.

**Dynamic Periods by Timeframe:**
| Timeframe | Short SMA | Long SMA | Rationale |
|-----------|-----------|----------|-----------|
| 24h | 8 | 21 | Fast response for hourly data |
| 7d | 10 | 30 | Standard short-term periods |
| 30d | 20 | 50 | Classic trading periods |
| 1y | 50 | 200 | Golden/Death cross signals |

**Trading Signals:**
- **Golden Cross**: Short SMA crosses above Long SMA → Bullish
- **Death Cross**: Short SMA crosses below Long SMA → Bearish

**Reference:** [Investopedia - SMA](https://www.investopedia.com/terms/s/sma.asp)

---

### MACD (Moving Average Convergence Divergence)

MACD reveals changes in strength, direction, momentum, and duration of a trend.

**Components:**
```
MACD Line = EMA(fast) - EMA(slow)
Signal Line = EMA(MACD Line, signal period)
Histogram = MACD Line - Signal Line
```

**Implementation:** Uses EMA (Exponential Moving Average) for responsiveness.

**Dynamic Periods by Timeframe:**
| Timeframe | Fast | Slow | Signal | Rationale |
|-----------|------|------|--------|-----------|
| 24h | 8 | 17 | 9 | Tighter for hourly volatility |
| 7d | 12 | 26 | 9 | Standard MACD settings |
| 30d | 12 | 26 | 9 | Traditional parameters |
| 1y | 19 | 39 | 9 | Extended for daily data smoothing |

**Trading Signals:**
- **MACD crosses above Signal**: Bullish momentum
- **MACD crosses below Signal**: Bearish momentum
- **Histogram increasing**: Strengthening trend
- **Divergence**: Price/MACD disagreement suggests reversal

**Reference:** [Investopedia - MACD](https://www.investopedia.com/terms/m/macd.asp)

---

### Bollinger Bands

Bollinger Bands measure volatility and identify overbought/oversold conditions relative to recent price action.

**Formula:**
```
Middle Band = SMA(period)
Upper Band = Middle Band + (stdDev × multiplier)
Lower Band = Middle Band - (stdDev × multiplier)
```

**Implementation:** Standard 2σ deviation captures ~95% of price action.

**Dynamic Periods by Timeframe:**
| Timeframe | Period | Std Dev | Rationale |
|-----------|--------|---------|-----------|
| 24h | 14 | 2 | Responsive for intraday |
| 7d | 20 | 2 | Standard Bollinger settings |
| 30d | 20 | 2 | Classic parameters |
| 1y | 30 | 2 | Smoothed for yearly view |

**Trading Signals:**
- **Price at Upper Band**: Potentially overbought
- **Price at Lower Band**: Potentially oversold
- **Band Squeeze**: Low volatility, breakout expected
- **Band Expansion**: High volatility, trend in progress

**Reference:** [Investopedia - Bollinger Bands](https://www.investopedia.com/terms/b/bollingerbands.asp)

---

## 🛠 Chart.js Implementation

### Architecture

The chart implementation uses `react-chartjs-2` as a React wrapper for Chart.js with the following registered components:

```typescript
ChartJS.register(
  CategoryScale,    // X-axis labels
  LinearScale,      // Y-axis numbers
  PointElement,     // Data points
  LineElement,      // Line connections
  BarElement,       // MACD histogram
  Title,
  Tooltip,
  Legend,
  Filler           // Area fills (Bollinger Bands)
);
```

### Multi-Dataset Management

The price chart dynamically builds datasets based on enabled studies:

```typescript
// Base price dataset
const priceDatasets = [{ label: 'Price', data: prices, ... }];

// Conditionally add Bollinger Bands (behind price)
if (enabledStudies.bollingerBands) {
  priceDatasets.unshift(bbUpper, bbMiddle, bbLower);
}

// Conditionally add SMA overlays (on top)
if (enabledStudies.sma) {
  priceDatasets.push(smaShort, smaLong);
}
```

### Fill Between Lines (Bollinger Bands)

Chart.js `fill` property creates the shaded band area:

```typescript
{
  label: 'BB Upper',
  fill: '+1',  // Fill to next dataset (BB Middle)
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
}
```

### Separate Indicator Panels

RSI and MACD render in separate chart instances below the main price chart:

- **RSI Panel**: Fixed 0-100 scale with overbought/oversold zones
- **MACD Panel**: Dual-chart with histogram (Bar) and lines (Line)

### Tooltip Customization

```typescript
callbacks: {
  label: function(context) {
    const label = context.dataset.label;
    if (label === 'Price' || label.includes('SMA')) {
      return `${label}: $${value.toLocaleString()}`;
    }
    return `${label}: ${value.toFixed(2)}`;
  }
}
```

### Performance Optimizations

- `pointRadius: 0` — Disable point rendering for performance
- `tension: 0.4` — Smooth curves without excessive computation
- `useMemo` — Memoize indicator calculations
- Conditional rendering — Only calculate enabled indicators

---

## 🗄 State Management

Zustand store with localStorage persistence:

```typescript
interface CryptoState {
  theme: 'light' | 'dark';
  timePeriod: '1' | '7' | '30' | '365';
  favorites: string[];
  enabledStudies: {
    rsi: boolean;
    sma: boolean;
    bollingerBands: boolean;
    macd: boolean;
  };
  // ... actions
}
```

**Persisted to localStorage:**
- Theme preference
- Favorite coins
- View mode (table/grid)
- Enabled technical studies

---

## 🌐 API Routes

### GET `/crypto/api/coins`
Fetches cryptocurrency list with market data.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `vs_currency` | `usd` | Price currency |
| `per_page` | `100` | Results per page |

### GET `/crypto/api/coin-history`
Fetches historical price data for charts.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `id` | required | Coin ID (e.g., `bitcoin`) |
| `days` | `7` | Days of history |
| `vs_currency` | `usd` | Price currency |

### Caching Strategy
- **Coin list**: 30 seconds
- **Historical data**: 5 minutes
- **Search results**: 1 hour

---

## 📱 Responsive Design

### Breakpoints
| Screen | Width | Adjustments |
|--------|-------|-------------|
| Desktop | > 1024px | Full layout |
| Tablet | 768-1024px | Condensed controls |
| Mobile | < 768px | Stacked layout, bottom sheet menus |
| Small | < 480px | Compact indicators, touch-optimized |

### Mobile Optimizations
- Studies dropdown becomes bottom sheet modal
- Chart heights reduced for viewport fit
- Touch-friendly button sizes
- Horizontal scroll for time periods

---

## 🎨 Theming

CSS custom properties for consistent theming:

```css
:root {
  --bg-primary: #f8fafc;
  --text-primary: #0f172a;
  --accent-primary: #3b82f6;
  --positive: #10b981;
  --negative: #ef4444;
  /* Indicator colors */
  --sma-short-color: #f59e0b;
  --sma-long-color: #8b5cf6;
  --bollinger-middle-color: #22c55e;
  --macd-line-color: #06b6d4;
  --macd-signal-color: #ec4899;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --text-primary: #f1f5f9;
  /* ... dark variants */
}
```

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.x | React framework |
| `react` | 19.x | UI library |
| `typescript` | 5.x | Type safety |
| `chart.js` | ^4.4 | Chart rendering |
| `react-chartjs-2` | ^5.2 | React Chart.js wrapper |
| `zustand` | ^4.4 | State management |
| `date-fns` | ^3.0 | Date formatting |

---

## 🚀 Deployment

### Netlify (Recommended)
```bash
npm run build
# Deploy via Netlify CLI or Git integration
```

### Vercel
```bash
npx vercel
```

### Environment Variables (Optional)
```env
NEXT_PUBLIC_COINGECKO_API_KEY=your_api_key
```

---

## 📚 Resources

- [CoinGecko API Documentation](https://www.coingecko.com/en/api/documentation)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Next.js Documentation](https://nextjs.org/docs)

---

## 📄 License

MIT License - See [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ using Next.js, TypeScript, and Chart.js**
