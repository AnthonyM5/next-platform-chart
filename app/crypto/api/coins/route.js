import { NextResponse } from 'next/server';

// Cache configuration
const CACHE_DURATION = 30000; // 30 seconds
let cache = {
  data: null,
  timestamp: null,
};

export async function GET(request) {
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
      });
    }

    // Build API URL
    let apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h,7d,30d`;
    
    if (ids) {
      apiUrl += `&ids=${ids}`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 30 } // Next.js caching
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    cache = {
      data,
      timestamp: now,
      key: cacheKey,
    };

    return NextResponse.json({
      data,
      cached: false,
      timestamp: now,
    });
  } catch (error) {
    console.error('Error fetching cryptocurrency data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data', message: error.message },
      { status: 500 }
    );
  }
}
