import { NextRequest, NextResponse } from 'next/server';
import type { ChartData, ApiResponse } from '../../types';

// Cache for historical data
const historyCache = new Map<string, { data: ChartData; timestamp: number; fetchedAt: number }>();
const CACHE_DURATION = 300000; // 5 minutes for historical data
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Exponential-backoff fetch helper
 */
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 },
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
      console.log(`Fetch error, backing off ${backoff}ms (attempt ${attempt + 1})`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError ?? new Error('Fetch failed after retries');
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ChartData> | { error: string; message?: string }>> {
  let cacheKey = '';
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const days = searchParams.get('days') || '7';
    const vsCurrency = searchParams.get('vs_currency') || 'usd';

    if (!id) {
      return NextResponse.json(
        { error: 'Coin ID is required' },
        { status: 400 }
      );
    }

    // Check cache
    cacheKey = `${id}_${days}_${vsCurrency}`;
    const now = Date.now();
    const cached = historyCache.get(cacheKey);

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        data: cached.data,
        cached: true,
        timestamp: cached.timestamp,
        fetchedAt: cached.fetchedAt,
      });
    }

    // Fetch from CoinGecko with retry & backoff
    const apiUrl = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vsCurrency}&days=${days}`;

    const response = await fetchWithRetry(apiUrl);

    if (!response.ok) {
      // If rate limited (429) and we have cached data, return it
      if (response.status === 429 && cached) {
        console.log('Rate limited, returning stale cache for', id);
        return NextResponse.json({
          data: cached.data,
          cached: true,
          stale: true,
          timestamp: cached.timestamp,
          fetchedAt: cached.fetchedAt,
        });
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: ChartData = await response.json();
    const fetchedAt = now;

    // Store in cache
    historyCache.set(cacheKey, {
      data,
      timestamp: now,
      fetchedAt,
    });

    return NextResponse.json({
      data,
      cached: false,
      timestamp: now,
      fetchedAt,
    });
  } catch (error) {
    console.error('Error fetching coin history:', error);
    // Return cached data if available on any error
    const cachedData = historyCache.get(cacheKey);
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
      { error: 'Failed to fetch coin history', message: (error as Error).message },
      { status: 500 }
    );
  }
}
