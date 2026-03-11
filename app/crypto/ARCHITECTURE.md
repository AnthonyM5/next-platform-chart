# Crypto Dashboard — Architecture & Data Flow

## Overview

The dashboard combines two data sources to give users an always-current view:

| Source | Data | Frequency |
|--------|------|-----------|
| **CoinGecko REST** (via Next.js API route) | Historical prices, market caps, volumes | Polled every 30 s |
| **CoinCap WebSocket** (`wss://ws.coincap.io`) | Current ticker price | Streaming (sub-second) |

---

## Live Price Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CoinCap WebSocket  wss://ws.coincap.io/prices?assets=bitcoin,ethereum… │
│  Sends:  { "bitcoin": "61234.56", "ethereum": "3001.00", … }            │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ MessageEvent (JSON string)
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  useRealtimePrice(coinIds)  [app/crypto/hooks/useRealtimePrice.ts]        │
│                                                                           │
│  • Manages WebSocket lifecycle (open / reconnect / close)                │
│  • Maps CoinGecko IDs ↔ CoinCap IDs (e.g. "ripple" ↔ "xrp")            │
│  • Reconnects automatically when coinIds set changes (e.g. after REST    │
│    list refreshes with new coins)                                         │
│  • Exponential back-off up to 10 reconnect attempts                      │
│                                                                           │
│  Returns: { prices: Record<coinId, number>, connected: boolean }         │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ React state
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  CryptoDashboard  [app/crypto/components/CryptoDashboard.tsx]             │
│                                                                           │
│  ① setRtPrices(rtPrices) ──────────────────────────────────────────────► │
│  ② setWsConnected(wsConnected) ────────────────────────────────────────► │
│                                                                           │
│  ③ liveCoins = useMemo(() =>                                              │
│       coins.map(c => rtPrices[c.id]                                      │
│         ? { ...c, current_price: rtPrices[c.id] }                       │
│         : c                                                               │
│     ), [coins, rtPrices])                                                │
│                                                                           │
│  ④ Passes livePrice={rtPrices[selectedCoin]} to CryptoChart              │
└──────┬────────────────────────────────────────────────────────────────────┘
       │                        │                        │
       ▼                        ▼                        ▼
┌────────────────┐   ┌─────────────────────┐  ┌──────────────────────────┐
│  Zustand Store │   │  CryptoTable        │  │  CryptoChart             │
│  (cryptoStore) │   │  receives liveCoins │  │  receives livePrice prop │
│                │   │  (merged prices)    │  │                          │
│  rtPrices: {   │   │                     │  │  Imperative update:      │
│    bitcoin: …  │   │  Each row uses      │  │  chart.data              │
│    ethereum: … │   │  <LivePrice>        │  │    .datasets[0]          │
│  }             │   │  component          │  │    .data[lastIndex]      │
│  wsConnected:  │   └──────────┬──────────┘  │    = livePrice           │
│    boolean     │              │             │  chart.update('none')    │
└────────┬───────┘              │             │  (throttled to ≤1 Hz)   │
         │                      ▼             └──────────────────────────┘
         │             ┌──────────────────┐
         └────────────►│  LivePrice       │
    Zustand selector   │  [LivePrice.tsx] │
    (per coin)         │                  │
                       │  Reads:          │
                       │  store.rtPrices  │
                       │    [coinId]      │
                       │                  │
                       │  Only this one   │
                       │  component       │
                       │  re-renders      │
                       │  when its coin   │
                       │  price changes   │
                       └──────────────────┘
```

---

## Why Zustand for `rtPrices`?

`LivePrice` components are rendered inside every row of `CryptoTable` (up to 100
rows) **and** in the chart header.  They live many levels below `CryptoDashboard`
in the component tree.

**Options considered:**

| Approach | Pro | Con |
|----------|-----|-----|
| Prop-drilling | Simple | 4-level chain; every intermediate component must forward prices |
| React Context | No external library | Context change re-renders **all** consumers even if their coin didn't change |
| **Zustand (chosen)** | Per-key selector `state => state.rtPrices[coinId]` re-renders only the component whose coin changed | Slight indirection; prices must be synced from hook state to store |

Zustand's selector equality check means a Bitcoin price update only causes the
Bitcoin `LivePrice` row to re-render, not the whole table.

---

## Why Imperative Chart Updates?

WebSocket prices can arrive many times per second.  If we passed `rtPrices` as
a prop to `CryptoChart` and let React diff/re-render on every tick, the 800-line
chart component would re-run all its `useMemo` indicator calculations on each
price tick — jarring visually and expensive computationally.

Instead, `CryptoChart` holds a `ref` to the Chart.js instance.  When `livePrice`
changes the effect:

1. Checks the 1-second throttle (`lastLiveUpdateRef`)
2. Mutates `chart.data.datasets[0].data[lastIndex]` in place
3. Calls `chart.update('none')` — Chart.js internal repaint, no animations, no
   React re-render

This gives a smooth, continuously-updated price line without any visual stutter.

---

## Historical Chart Data Flow

```
CoinGecko REST  ──►  /crypto/api/coin-history  ──►  CryptoDashboard
(market_chart)       (5-min cache, retry logic)      fetchChartData()
                                                            │
                                                            ▼
                                                    chartData state
                                                            │
                                                            ▼
                                                     CryptoChart
                                               (coinData prop, indicators
                                                calculated via useMemo)
```

Chart historical data is fetched once when a user selects a coin, then again
whenever `timePeriod` or `chartPattern` changes.  Live prices update the chart's
last data point in real-time between these REST fetches.

---

## Component Tree

```
CryptoDashboard
├── ErrorBoundary
├── Header
│   ├── FreshnessIndicator      ← reads wsConnected from Zustand
│   ├── Auto-refresh toggle
│   ├── Export button
│   ├── ViewModeToggle           ← reads/writes viewMode in Zustand
│   └── ThemeToggle              ← reads/writes theme in Zustand
├── Chart Section (when coin selected)
│   ├── Selected coin info
│   │   └── LivePrice            ← reads rtPrices[coinId] from Zustand ★
│   ├── ChartPatternToggle       ← reads/writes chartPattern in Zustand
│   ├── StudiesDropdown          ← reads/writes enabledStudies in Zustand
│   ├── TimePeriodSelector       ← reads/writes timePeriod in Zustand
│   ├── CryptoChart              ← receives coinData + livePrice prop ★
│   └── CandlestickChart         ← receives ohlcData prop
└── Table Section
    └── CryptoTable              ← receives liveCoins (merged prices) ★
        └── (per row) LivePrice  ← reads rtPrices[coinId] from Zustand ★
```

★ = connected to live WebSocket data

---

## State Management Summary

| State | Location | Persisted | Description |
|-------|----------|-----------|-------------|
| `theme` | Zustand | localStorage | dark / light |
| `favorites` | Zustand | localStorage | Starred coin IDs |
| `selectedCoins` | Zustand | localStorage | Coins shown in comparison |
| `timePeriod` | Zustand | localStorage | 1d / 7d / 30d / 1y |
| `currency` | Zustand | localStorage | usd / eur / gbp / jpy |
| `viewMode` | Zustand | localStorage | table / grid |
| `chartPattern` | Zustand | localStorage | line / candlestick |
| `enabledStudies` | Zustand | localStorage | RSI, SMA, MACD, BB toggles |
| `notifications` | Zustand | no | Toast messages |
| `priceAlerts` | Zustand | localStorage | Alert thresholds |
| `rtPrices` | Zustand | no | Live WebSocket prices (per coin) |
| `wsConnected` | Zustand | no | WebSocket connection status |
| `coins` | React state | no | REST coin list |
| `chartData` | React state | no | Historical chart prices |
| `ohlcData` | React state | no | Candlestick OHLC data |
| `selectedCoin` | React state | no | Currently charted coin ID |

---

## API Routes

| Route | Source | Cache |
|-------|--------|-------|
| `GET /crypto/api/coins` | CoinGecko `/coins/markets` | 30 s |
| `GET /crypto/api/coin-history` | CoinGecko `/coins/{id}/market_chart` | 5 min |
| `GET /crypto/api/ohlc` | CoinGecko / Coinbase (auto) | 5 min |
| `GET /crypto/api/search` | CoinGecko `/search` | 1 h |

All routes include exponential-backoff retry logic and serve stale cache on
rate-limit (HTTP 429) errors.

---

## Testing Strategy

| Layer | File | What is tested |
|-------|------|----------------|
| WebSocket hook | `hooks/useRealtimePrice.test.ts` | Connection lifecycle, ID mapping, reconnect on coinIds change, error handling |
| Live price display | `components/LivePrice.test.tsx` | Fallback vs live price, flash animation classes, direction indicator |
| Dashboard orchestration | `components/CryptoDashboard.test.tsx` | REST fetch, liveCoins merge, Zustand sync |
| Chart live update | `components/CryptoChart.test.tsx` | `livePrice` prop, imperative update, throttle |
| Technical indicators | `utils/indicators.test.ts` | SMA, EMA, MACD, Bollinger Bands calculations |
| Data freshness | `utils/dataFreshness.test.ts` | Stale-age detection, price drift |
