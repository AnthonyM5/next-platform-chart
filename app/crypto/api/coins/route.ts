import { NextRequest, NextResponse } from 'next/server';
import type { Coin, ApiResponse } from '../../types';

// Cache configuration
const CACHE_DURATION = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface CacheEntry {
  data: Coin[] | null;
  timestamp: number | null;
  fetchedAt: number | null; // when upstream API was last contacted
  key?: string;
}

let cache: CacheEntry = {
  data: null,
  timestamp: null,
  fetchedAt: null,
};

/**
 * Exponential-backoff fetch helper
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 30 },
      });
      // 429 = rate-limited; wait and retry
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
      console.log(`Fetch error, backing off ${backoff}ms (attempt ${attempt + 1})`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError ?? new Error('Fetch failed after retries');
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Coin[]> | { error: string; message: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');
    const vsCurrency = searchParams.get('vs_currency') || 'usd';
    const perPage = searchParams.get('per_page') || '50';
    const page = searchParams.get('page') || '1';

    // Check cache
    const now = Date.now();
    const cacheKey = `${ids || 'all'}_${vsCurrency}_${perPage}_${page}`;
    
    if (cache.data && cache.timestamp && (now - cache.timestamp) < CACHE_DURATION && cache.key === cacheKey) {
      return NextResponse.json({
        data: cache.data,
        cached: true,
        timestamp: cache.timestamp,
        fetchedAt: cache.fetchedAt!,
      });
    }

    // Build API URL
    let apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h,7d,30d`;
    
    if (ids) {
      apiUrl += `&ids=${ids}`;
    }

    const response = await fetchWithRetry(apiUrl);

    if (!response.ok) {
      // If rate limited (429) and we have cached data, return it
      if (response.status === 429 && cache.data) {
        console.log('Rate limited, returning stale cache');
        return NextResponse.json({
          data: cache.data,
          cached: true,
          stale: true,
          timestamp: cache.timestamp!,
          fetchedAt: cache.fetchedAt!,
        });
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: Coin[] = await response.json();
    const fetchedAt = now;

    // Update cache
    cache = {
      data,
      timestamp: now,
      fetchedAt,
      key: cacheKey,
    };

    return NextResponse.json({
      data,
      cached: false,
      timestamp: now,
      fetchedAt,
    });
  } catch (error) {
    console.error('Error fetching cryptocurrency data:', error);
    // Return cached data if available on any error
    if (cache.data) {
      return NextResponse.json({
        data: cache.data,
        cached: true,
        stale: true,
        timestamp: cache.timestamp!,
        fetchedAt: cache.fetchedAt!,
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data', message: (error as Error).message },
      { status: 500 }
    );
  }
}
