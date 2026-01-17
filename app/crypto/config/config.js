// Environment configuration for Crypto Dashboard

export const config = {
  // API Configuration
  coinGeckoApiKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '',
  baseApiUrl: '/crypto/api',
  
  // Cache Durations (milliseconds)
  cacheDuration: {
    coins: parseInt(process.env.CACHE_DURATION_COINS || '30000'), // 30 seconds
    history: parseInt(process.env.CACHE_DURATION_HISTORY || '300000'), // 5 minutes
    search: parseInt(process.env.CACHE_DURATION_SEARCH || '3600000'), // 1 hour
  },
  
  // Auto-refresh interval
  autoRefreshInterval: parseInt(process.env.AUTO_REFRESH_INTERVAL || '30000'), // 30 seconds
  
  // Display settings
  defaultCurrency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'usd',
  defaultPerPage: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PER_PAGE || '100'),
  defaultTimePeriod: process.env.NEXT_PUBLIC_DEFAULT_TIME_PERIOD || '7',
  
  // Feature flags
  features: {
    enableNotifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false',
    enableExport: process.env.NEXT_PUBLIC_ENABLE_EXPORT !== 'false',
    enableFavorites: process.env.NEXT_PUBLIC_ENABLE_FAVORITES !== 'false',
    enableComparison: process.env.NEXT_PUBLIC_ENABLE_COMPARISON !== 'false',
  },
};

export default config;
