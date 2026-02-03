# Data Freshness & Real-Time Updates

This document describes how we detect stale data, handle CoinGecko rate limits, and options for event-based (websocket) real-time feeds.

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

### 1. Freshness Tracking (`fetchedAt`)

Both `/crypto/api/coins` and `/crypto/api/coin-history` now return a `fetchedAt` timestamp (epoch ms) indicating when the upstream CoinGecko API was last contacted.

The dashboard tracks these values and uses the `FreshnessIndicator` component to show:

* 🟢 **Live** – data is within acceptable freshness thresholds
* 🔴 **Stale** – data exceeds threshold or list/chart prices drift > 1%

Thresholds (configurable in `utils/dataFreshness.ts`):

| Data Type | Threshold |
|-----------|-----------|
| Coin list | 60 s |
| Chart | 5 min |
| Price drift | 1% |

### 2. Exponential Back-off & Retry

API routes now use `fetchWithRetry()` which:

1. Catches network errors and 429 responses
2. Waits `1s * 2^attempt` before retrying (up to 3 attempts)
3. Falls back to stale cache on persistent failure

### 3. Automated Tests

Run:
```bash
npx vitest run app/crypto/utils/dataFreshness.test.ts
# or with Jest
npx jest app/crypto/utils/dataFreshness.test.ts
```

Tests cover:
- `evaluateFreshness()` – age calculation
- `detectPriceDrift()` – price divergence
- `detectTimestampDrift()` – time gap between list and chart

---

## Websocket / Streaming Alternatives

CoinGecko's free API does **not** provide websockets. Below are options for true real-time feeds:

| Provider | Protocol | Free Tier | Notes |
|----------|----------|-----------|-------|
| **CoinGecko Pro** | REST (1 s granularity) | ✗ (paid) | Up to 500 req/min |
| **CryptoCompare** | WebSocket | ✓ (limited) | Free streaming for top coins |
| **Binance** | WebSocket | ✓ | Real-time for Binance-listed pairs |
| **Coinbase** | WebSocket | ✓ | Real-time for Coinbase pairs |
| **CoinCap.io** | WebSocket | ✓ | Free streaming, most major coins |
| **Finnhub** | WebSocket | ✓ | Crypto + stocks; limited free |

### Recommended: CoinCap WebSocket

```ts
// Example client
const ws = new WebSocket('wss://ws.coincap.io/prices?assets=bitcoin,ethereum');
ws.onmessage = (msg) => {
  const prices = JSON.parse(msg.data); // { bitcoin: "50123.45", ... }
  // Update UI here
};
```

Advantages:
- No rate limits on inbound streaming
- Sub-second latency
- Free tier covers most top-100 coins

### Migration Checklist

1. Add a WebSocket provider adapter (`app/crypto/utils/realtimeProvider.ts`)
2. Maintain REST fallback for initial load
3. Reconcile websocket prices with REST metadata (market cap, 24h change)
4. Display "Streaming" badge next to FreshnessIndicator when connected

---

## Configuration Reference

| Env Var | Default | Description |
|---------|---------|-------------|
| `COINGECKO_API_KEY` | (none) | Optional Pro API key |
| `REALTIME_PROVIDER` | `rest` | `rest` or `coincap` |

---

## Testing Data Freshness in Production

1. Open DevTools → Network and look for `/crypto/api/coins` responses.
2. Check the `fetchedAt` field matches the `timestamp` field (they should be close on fresh data).
3. Hover the freshness dot in the header for detailed age info.
4. Simulate stale data by throttling network or blocking the API; watch the indicator turn red.

---

## References

- CoinGecko API Docs: https://www.coingecko.com/en/api/documentation
- CoinCap WebSocket: https://docs.coincap.io/#websocket
- CryptoCompare Streaming: https://min-api.cryptocompare.com/documentation/websockets
