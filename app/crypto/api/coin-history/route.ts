import { NextRequest, NextResponse } from 'next/server';
import type { ChartData, ApiResponse } from '../../types';

// Cache for historical data
const historyCache = new Map<string, { data: ChartData; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes for historical data

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
      });
    }

    // Fetch from CoinGecko
    const apiUrl = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vsCurrency}&days=${days}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // 5 minutes
    });

    if (!response.ok) {
      // If rate limited (429) and we have cached data, return it
      if (response.status === 429 && cached) {
        console.log('Rate limited, returning stale cache for', id);
        return NextResponse.json({
          data: cached.data,
          cached: true,
          stale: true,
          timestamp: cached.timestamp,
        });
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: ChartData = await response.json();

    // Store in cache
    historyCache.set(cacheKey, {
      data,
      timestamp: now,
    });

    return NextResponse.json({
      data,
      cached: false,
      timestamp: now,
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
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch coin history', message: (error as Error).message },
      { status: 500 }
    );
  }
}
