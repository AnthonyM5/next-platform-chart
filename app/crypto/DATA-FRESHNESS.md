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
| **Coinbase Exchange** | REST + WebSocket | ✓ | Real-time for Coinbase pairs, see below |
| **CoinCap.io** | WebSocket | ✓ | Free streaming, most major coins |
| **Finnhub** | WebSocket | ✓ | Crypto + stocks; limited free |

---

## Coinbase Exchange API (Recommended for OHLC)

The **Coinbase Exchange API** is free for public market data and provides:

| Feature | Detail |
|---------|--------|
| OHLC Candles | 1m, 5m, 15m, 1h, 6h, 1d granularity |
| Rate Limit | ~10 req/s (public endpoints) |
| Auth Required | ❌ No (for public data) |
| Pairs Available | ~200 USD pairs (BTC, ETH, SOL, etc.) |
| Precision | Full decimal precision |

### Granularity Comparison

| Time Range | CoinGecko (Free) | Coinbase Exchange |
|------------|------------------|-------------------|
| 1 day | 30 min candles | **5 min candles** |
| 7 days | 4 hour candles | **1 hour candles** |
| 30 days | 4 hour candles | **6 hour candles** |
| 1 year | 4 day candles | **1 day candles** |

### Implemented Integration

The `/crypto/api/ohlc` route automatically uses Coinbase when:
1. The coin has a USD pair on Coinbase (BTC, ETH, SOL, etc.)
2. The currency is USD
3. Fallback to CoinGecko for unsupported coins

```ts
// The OHLC endpoint auto-selects the best provider
const response = await fetch('/crypto/api/ohlc?id=bitcoin&days=7&provider=auto');
// Returns: { data: { candles: [...], provider: 'coinbase', granularity: '1h' } }
```

### Coinbase Supported Coins

Common coins with Coinbase USD pairs (auto-detected):
- BTC, ETH, LTC, BCH, XRP, ADA, SOL, DOT, DOGE, AVAX
- LINK, MATIC, UNI, XLM, ATOM, SHIB, TRX, WBTC

### WebSocket for Real-Time

For sub-second updates, use Coinbase WebSocket:

```ts
const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    product_ids: ['BTC-USD', 'ETH-USD'],
    channels: ['ticker']
  }));
};
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  if (data.type === 'ticker') {
    console.log(data.product_id, data.price); // Real-time price
  }
};
```

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
