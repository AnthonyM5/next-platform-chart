import { NextResponse } from 'next/server';

// Cache for search results
let searchCache = {
  data: null,
  timestamp: null,
};

const CACHE_DURATION = 3600000; // 1 hour for search list

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Check cache for full list
    const now = Date.now();
    
    if (!searchCache.data || !searchCache.timestamp || (now - searchCache.timestamp) > CACHE_DURATION) {
      // Fetch full list from CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/coins/list', {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 } // 1 hour
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      searchCache.data = await response.json();
      searchCache.timestamp = now;
    }

    // Filter results if query provided
    let results = searchCache.data;
    if (query && query.length > 0) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(coin => 
        coin.name.toLowerCase().includes(lowerQuery) ||
        coin.symbol.toLowerCase().includes(lowerQuery) ||
        coin.id.toLowerCase().includes(lowerQuery)
      ).slice(0, 20); // Limit to 20 results
    } else {
      results = results.slice(0, 50); // Return top 50 if no query
    }

    return NextResponse.json({
      data: results,
      cached: true,
      timestamp: searchCache.timestamp,
    });
  } catch (error) {
    console.error('Error searching cryptocurrencies:', error);
    return NextResponse.json(
      { error: 'Failed to search cryptocurrencies', message: error.message },
      { status: 500 }
    );
  }
}
