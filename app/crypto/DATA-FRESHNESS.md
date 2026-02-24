# Data Freshness & Real-Time Updates

This document describes how live price streaming, staleness detection, and CoinGecko rate-limit handling work together in the dashboard.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│                                                     │
│  useRealtimePrice (WebSocket)  ──▶  liveCoins       │
│        │                               │            │
│        │  wss://ws.coincap.io          ▼            │
│        │                          CryptoTable       │
│        │                       (always up-to-date)  │
│        │                                            │
│  CryptoDashboard (REST, 30 s)  ──▶  coins           │
│   /crypto/api/coins                (market cap,     │
│   /crypto/api/coin-history          volume, etc.)   │
└─────────────────────────────────────────────────────┘
```

Prices shown in the table and chart header come from the **WebSocket feed**.  
All other market data (market cap, volume, rank, 24 h %) is refreshed every **30 seconds** via REST.

---

## Problem Statement

The CoinGecko **free tier** REST API is rate-limited (~10-50 req/min depending on endpoint) and returns **snapshots** rather than streaming updates. This causes:

| Issue | Symptom |
|-------|---------|
| **Stale list prices** | Overview table shows older prices than the chart |
| **Chart vs. list drift** | Chart latest point differs from table price |
| **Intermittent 429 errors** | UI shows cached/stale data without warning |

---

## Solution Overview

### 1. Real-Time WebSocket Price Feed (`useRealtimePrice`)

Live prices are streamed via the **CoinCap WebSocket API** — free, no API key required.

```ts
// app/crypto/hooks/useRealtimePrice.ts
const { prices, connected } = useRealtimePrice(coinIds);
// prices: Record<coinGeckoId, latestPrice>
// connected: boolean — true while WebSocket is open
```

**How it works:**

1. Connects to `wss://ws.coincap.io/prices?assets=bitcoin,ethereum,...`
2. Maps CoinGecko IDs ↔ CoinCap IDs automatically (see table below)
3. Each incoming frame updates only the changed prices — no full re-render of the coin list
4. If the connection drops, exponential back-off reconnect fires (up to 10 attempts, capped at ~2 min between tries)
5. Falls back silently to REST-polled prices if WebSocket is unavailable

**CoinGecko → CoinCap ID mapping:**

| CoinGecko ID | CoinCap ID |
|---|---|
| `ripple` | `xrp` |
| `binancecoin` | `binance-coin` |
| `bitcoin-cash` | `bitcoin-cash-abc-2` |
| `lido-staked-ether` | `staked-ether` |
| *(all others)* | *(same ID)* |

**FreshnessIndicator behaviour:**
- WebSocket connected → **⚡ Live** (green pulsing dot)
- WebSocket disconnected → falls back to REST age-based freshness check

### 2. Freshness Tracking (`fetchedAt`)

Both `/crypto/api/coins` and `/crypto/api/coin-history` return a `fetchedAt` timestamp (epoch ms) indicating when the upstream CoinGecko API was last contacted.

The dashboard tracks these values and uses the `FreshnessIndicator` component to show:

* 🟢 **Live** – WebSocket connected, or REST data within acceptable freshness thresholds
* 🔴 **Stale** – REST data exceeds threshold or list/chart prices drift > 1%

Thresholds (configurable in `utils/dataFreshness.ts`):

| Data Type | Threshold |
|-----------|-----------|
| Coin list | 60 s |
| Chart | 5 min |
| Price drift | 1% |

### 3. Exponential Back-off & Retry (REST)

API routes use `fetchWithRetry()` which:

1. Catches network errors and 429 responses
2. Waits `1s * 2^attempt` before retrying (up to 3 attempts)
3. Falls back to stale cache on persistent failure

---

## Automated Tests

### Running tests

```bash
npm test                  # single run
npm run test:watch        # watch mode
```

### Test files

| File | What it tests |
|------|---------------|
| `app/crypto/utils/dataFreshness.test.ts` | `evaluateFreshness`, `detectPriceDrift`, `detectTimestampDrift` |
| `app/crypto/hooks/useRealtimePrice.test.ts` | WebSocket lifecycle, price delivery, ID mapping, reconnect, cleanup |

### `useRealtimePrice` test coverage

- Hook returns empty prices and `connected: false` before any coinIds are provided
- WebSocket URL is built with CoinCap IDs (CoinGecko IDs translated correctly)
- `connected` transitions to `true` on WebSocket `open` event
- Prices are stored under CoinGecko IDs (CoinCap IDs translated back)
- `connected` transitions to `false` on `error` and `close` events
- No reconnect attempt fires after hook unmount
- Malformed JSON frames are silently ignored

---

## Websocket / Streaming Alternatives

| Provider | Protocol | Free Tier | Notes |
|----------|----------|-----------|-------|
| **CoinCap** ✅ | WebSocket | ✓ | **Currently used.** Free streaming, most major coins |
| **CoinGecko Pro** | REST (1 s granularity) | ✗ (paid) | Up to 500 req/min |
| **CryptoCompare** | WebSocket | ✓ (limited) | Free streaming for top coins |
| **Binance** | WebSocket | ✓ | Real-time for Binance-listed pairs |
| **Coinbase Exchange** | REST + WebSocket | ✓ | Real-time for Coinbase pairs |
| **Finnhub** | WebSocket | ✓ | Crypto + stocks; limited free |

---

## Coinbase Exchange API (OHLC)

The **Coinbase Exchange API** is free for public market data and is used automatically for OHLC candlestick data when available.

| Feature | Detail |
|---------|--------|
| OHLC Candles | 1m, 5m, 15m, 1h, 6h, 1d granularity |
| Rate Limit | ~10 req/s (public endpoints) |
| Auth Required | ❌ No (for public data) |
| Pairs Available | ~200 USD pairs (BTC, ETH, SOL, etc.) |

The `/crypto/api/ohlc` route automatically uses Coinbase when the coin has a USD pair, falling back to CoinGecko for unsupported coins.

---

## Configuration Reference

| Env Var | Default | Description |
|---------|---------|-------------|
| `NEXT_PUBLIC_COINGECKO_API_KEY` | (none) | Optional CoinGecko Pro API key |
| `CACHE_DURATION_COINS` | `30000` | Coin list cache duration (ms) |
| `CACHE_DURATION_HISTORY` | `300000` | Historical data cache duration (ms) |
| `AUTO_REFRESH_INTERVAL` | `30000` | REST polling interval (ms) |

---

## Testing Data Freshness in Production

1. Open DevTools → Network and look for `/crypto/api/coins` responses.
2. Check the `fetchedAt` field matches the `timestamp` field (they should be close on fresh data).
3. The **⚡ Live** indicator in the header confirms the WebSocket is streaming prices.
4. Disconnect your internet briefly — the indicator will drop to **Stale** and reconnect automatically when restored.

---

## References

- CoinCap WebSocket Docs: https://docs.coincap.io/#websocket
- CoinGecko API Docs: https://www.coingecko.com/en/api/documentation
- CryptoCompare Streaming: https://min-api.cryptocompare.com/documentation/websockets

