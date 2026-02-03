import { NextRequest, NextResponse } from 'next/server';
import type { OHLCData, OHLCCandle, CoinGeckoOHLC, CoinbaseOHLC, ApiResponse } from '../../types';

// Cache for OHLC data
const ohlcCache = new Map<string, { data: OHLCData; timestamp: number; fetchedAt: number }>();
const CACHE_DURATION = 60000; // 1 minute for OHLC (more frequently updated)
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// CoinGecko coin ID to Coinbase product ID mapping (common coins)
const COINGECKO_TO_COINBASE: Record<string, string> = {
  bitcoin: 'BTC-USD',
  ethereum: 'ETH-USD',
  litecoin: 'LTC-USD',
  'bitcoin-cash': 'BCH-USD',
  ripple: 'XRP-USD',
  cardano: 'ADA-USD',
  solana: 'SOL-USD',
  polkadot: 'DOT-USD',
  dogecoin: 'DOGE-USD',
  avalanche: 'AVAX-USD',
  chainlink: 'LINK-USD',
  polygon: 'MATIC-USD',
  uniswap: 'UNI-USD',
  stellar: 'XLM-USD',
  cosmos: 'ATOM-USD',
  'shiba-inu': 'SHIB-USD',
  tron: 'TRX-USD',
  'wrapped-bitcoin': 'WBTC-USD',
  'lido-staked-ether': 'STETH-USD',
  'usd-coin': 'USDC-USD',
  tether: 'USDT-USD',
};

// Coinbase granularity mapping (in seconds)
const COINBASE_GRANULARITY: Record<string, number> = {
  '1': 300,     // 5 minutes for 1 day
  '7': 3600,    // 1 hour for 7 days
  '30': 21600,  // 6 hours for 30 days
  '365': 86400, // 1 day for 365 days
};

// CoinGecko OHLC granularity info
const COINGECKO_GRANULARITY: Record<string, string> = {
  '1': '30m',   // 1-2 days: 30 minutes
  '7': '4h',    // 3-30 days: 4 hours
  '30': '4h',   // 3-30 days: 4 hours
  '365': '4d',  // 31+ days: 4 days
};

async function fetchWithRetry(url: string, headers: Record<string, string> = {}, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json', ...headers },
      });
      if (response.status === 429 && attempt < retries - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.log(`Rate limited, backing off ${backoff}ms (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err as Error;
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError ?? new Error('Fetch failed after retries');
}

/**
 * Fetch OHLC from Coinbase Exchange API (free, no auth required for public data)
 */
async function fetchCoinbaseOHLC(
  productId: string,
  granularity: number,
  days: number
): Promise<OHLCCandle[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 24 * 60 * 60;
  
  // Coinbase limits to 300 candles per request
  const maxCandles = 300;
  const secondsPerCandle = granularity;
  const requestedSeconds = days * 24 * 60 * 60;
  const candlesNeeded = Math.ceil(requestedSeconds / secondsPerCandle);
  
  const allCandles: OHLCCandle[] = [];
  let currentEnd = end;
  
  // Fetch in chunks if needed
  const chunksNeeded = Math.ceil(candlesNeeded / maxCandles);
  for (let i = 0; i < Math.min(chunksNeeded, 3); i++) { // Max 3 requests
    const chunkStart = currentEnd - maxCandles * secondsPerCandle;
    
    const url = `https://api.exchange.coinbase.com/products/${productId}/candles?granularity=${granularity}&start=${chunkStart}&end=${currentEnd}`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      throw new Error(`Coinbase API error: ${response.status}`);
    }
    
    const data: CoinbaseOHLC[] = await response.json();
    
    // Coinbase returns [time, low, high, open, close, volume]
    const candles = data.map(([time, low, high, open, close, volume]) => ({
      timestamp: time * 1000, // Convert to ms
      open,
      high,
      low,
      close,
      volume,
    }));
    
    allCandles.push(...candles);
    currentEnd = chunkStart;
    
    if (chunkStart <= start) break;
  }
  
  // Sort by timestamp ascending and filter to requested range
  return allCandles
    .filter(c => c.timestamp >= start * 1000)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Fetch OHLC from CoinGecko API (free tier)
 */
async function fetchCoinGeckoOHLC(
  coinId: string,
  vsCurrency: string,
  days: string
): Promise<OHLCCandle[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=${vsCurrency}&days=${days}`;
  
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }
  
  const data: CoinGeckoOHLC[] = await response.json();
  
  // CoinGecko returns [timestamp, open, high, low, close]
  return data.map(([timestamp, open, high, low, close]) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }));
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<OHLCData> | { error: string; message?: string }>> {
  let cacheKey = '';
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const days = searchParams.get('days') || '7';
    const vsCurrency = searchParams.get('vs_currency') || 'usd';
    const preferredProvider = searchParams.get('provider') || 'auto'; // 'auto', 'coinbase', 'coingecko'

    if (!id) {
      return NextResponse.json(
        { error: 'Coin ID is required' },
        { status: 400 }
      );
    }

    // Check cache
    cacheKey = `${id}_${days}_${vsCurrency}_${preferredProvider}`;
    const now = Date.now();
    const cached = ohlcCache.get(cacheKey);

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        data: cached.data,
        cached: true,
        timestamp: cached.timestamp,
        fetchedAt: cached.fetchedAt,
      });
    }

    let candles: OHLCCandle[] = [];
    let provider: 'coingecko' | 'coinbase' = 'coingecko';
    let granularity = COINGECKO_GRANULARITY[days] || '4h';

    // Try Coinbase first if available and preferred (better granularity, no rate limits)
    const coinbaseProductId = COINGECKO_TO_COINBASE[id];
    const useCoinbase = 
      coinbaseProductId && 
      vsCurrency === 'usd' && 
      (preferredProvider === 'coinbase' || preferredProvider === 'auto');

    if (useCoinbase) {
      try {
        const coinbaseGranularity = COINBASE_GRANULARITY[days] || 3600;
        candles = await fetchCoinbaseOHLC(coinbaseProductId, coinbaseGranularity, parseInt(days));
        provider = 'coinbase';
        
        // Translate granularity to human readable
        const granMap: Record<number, string> = {
          60: '1m', 300: '5m', 900: '15m', 3600: '1h', 21600: '6h', 86400: '1d'
        };
        granularity = granMap[coinbaseGranularity] || `${coinbaseGranularity}s`;
      } catch (err) {
        console.log('Coinbase fetch failed, falling back to CoinGecko:', err);
        // Fall through to CoinGecko
      }
    }

    // Use CoinGecko if Coinbase wasn't used or failed
    if (candles.length === 0) {
      candles = await fetchCoinGeckoOHLC(id, vsCurrency, days);
      provider = 'coingecko';
      granularity = COINGECKO_GRANULARITY[days] || '4h';
    }

    const ohlcData: OHLCData = {
      candles,
      provider,
      granularity,
    };

    const fetchedAt = now;

    // Store in cache
    ohlcCache.set(cacheKey, {
      data: ohlcData,
      timestamp: now,
      fetchedAt,
    });

    return NextResponse.json({
      data: ohlcData,
      cached: false,
      timestamp: now,
      fetchedAt,
    });
  } catch (error) {
    console.error('Error fetching OHLC data:', error);
    const cachedData = ohlcCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        data: cachedData.data,
        cached: true,
        stale: true,
        timestamp: cachedData.timestamp,
        fetchedAt: cachedData.fetchedAt,
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch OHLC data', message: (error as Error).message },
      { status: 500 }
    );
  }
}
