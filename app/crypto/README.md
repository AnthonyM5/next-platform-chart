# Cryptocurrency Price Tracking Dashboard

A comprehensive, production-ready cryptocurrency dashboard with real-time price tracking, interactive charts, and advanced data visualization.

## Features

### Core Functionality
- ✅ Real-time cryptocurrency data from CoinGecko API
- ✅ Display multiple cryptocurrencies with prices, 24h changes, and market caps
- ✅ Interactive charts showing price history over customizable time periods
- ✅ Time period selection (1D, 7D, 30D, 1Y)
- ✅ Cryptocurrency comparison capability

### Technical Features
- ✅ Built with Next.js 16 and React 19
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Error handling with error boundaries
- ✅ Loading states with skeleton screens
- ✅ Chart.js integration for data visualization
- ✅ API caching to reduce API calls
- ✅ Search and filter functionality

### UI/UX Features
- ✅ Modern dashboard layout with dark/light mode toggle
- ✅ Auto-refresh every 30 seconds (can be toggled)
- ✅ Interactive charts with hover tooltips
- ✅ Color-coded price change indicators (green/red)
- ✅ Responsive grid and table layouts
- ✅ Loading skeletons during data fetch
- ✅ Smooth animations and transitions

### Data Display
- ✅ Table and grid view modes
- ✅ Sortable columns
- ✅ Market cap and volume statistics
- ✅ 24h price change percentages
- ✅ Favorite coins functionality

### Additional Features
- ✅ Local storage for user preferences (theme, favorites, view mode)
- ✅ Export functionality for data (JSON format)
- ✅ Mobile-friendly touch controls
- ✅ Keyboard navigation support
- ✅ Screen reader accessibility
- ✅ Responsive design with breakpoints

### Security & Performance
- ✅ API rate limiting protection via caching
- ✅ HTTPS enforcement for API calls
- ✅ Error boundaries for graceful error handling
- ✅ Client-side state management with Zustand
- ✅ Optimized re-renders

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000/crypto
```

## Dependencies

The following packages have been added to `package.json`:

- `chart.js` (^4.4.1) - Chart rendering library
- `react-chartjs-2` (^5.2.0) - React wrapper for Chart.js
- `zustand` (^4.4.7) - State management
- `date-fns` (^3.0.6) - Date formatting utilities

## Project Structure

```
app/crypto/
├── api/
│   ├── coins/route.js          # Fetch cryptocurrency list
│   ├── coin-history/route.js   # Fetch historical price data
│   └── search/route.js         # Search cryptocurrencies
├── components/
│   ├── CryptoDashboard.jsx     # Main dashboard component
│   ├── CryptoTable.jsx         # Table/Grid view component
│   ├── CryptoChart.jsx         # Interactive chart component
│   ├── ThemeToggle.jsx         # Dark/Light mode toggle
│   ├── TimePeriodSelector.jsx  # Time period selector
│   ├── ViewModeToggle.jsx      # Table/Grid view toggle
│   ├── LoadingSkeleton.jsx     # Loading states
│   └── ErrorBoundary.jsx       # Error handling
├── store/
│   └── cryptoStore.js          # Zustand state management
├── crypto-dashboard.css        # Complete styling
├── layout.jsx                  # Layout wrapper
├── page.jsx                    # Page entry point
└── README.md                   # This file
```

## API Routes

### GET /crypto/api/coins
Fetches the list of cryptocurrencies with market data.

**Query Parameters:**
- `vs_currency` (default: 'usd') - Currency for prices
- `per_page` (default: '50') - Number of results
- `page` (default: '1') - Page number

**Response:**
```json
{
  "data": [...],
  "cached": boolean,
  "timestamp": number
}
```

### GET /crypto/api/coin-history
Fetches historical price data for a specific cryptocurrency.

**Query Parameters:**
- `id` (required) - Cryptocurrency ID
- `days` (default: '7') - Number of days of history
- `vs_currency` (default: 'usd') - Currency

**Response:**
```json
{
  "data": {
    "prices": [[timestamp, price], ...],
    "market_caps": [...],
    "total_volumes": [...]
  },
  "cached": boolean,
  "timestamp": number
}
```

### GET /crypto/api/search
Search for cryptocurrencies.

**Query Parameters:**
- `q` - Search query

**Response:**
```json
{
  "data": [...],
  "cached": boolean,
  "timestamp": number
}
```

## State Management

The application uses Zustand for state management with localStorage persistence:

- **Theme**: Dark/Light mode preference
- **Favorites**: List of favorite coin IDs
- **Selected Coins**: Coins for comparison
- **Time Period**: Selected chart time period
- **Currency**: Display currency (USD, EUR, etc.)
- **View Mode**: Table or grid view preference
- **Price Alerts**: User-defined price alerts

## Caching Strategy

To minimize API calls and improve performance:

- **Coin list**: Cached for 30 seconds
- **Historical data**: Cached for 5 minutes
- **Search results**: Cached for 1 hour
- **Next.js**: Built-in revalidation on API routes

## Responsive Breakpoints

- **Desktop**: > 1024px
- **Tablet**: 768px - 1024px
- **Mobile**: < 768px
- **Small Mobile**: < 640px

## Accessibility Features

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader compatible
- Color contrast compliant
- Alt text for images

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimizations

- Component memoization where appropriate
- Lazy loading of chart data
- Debounced search inputs
- Optimized re-renders with proper dependencies
- Image optimization
- CSS animations using transform/opacity

## Future Enhancements

Potential additions for future versions:

- WebSocket integration for true real-time updates
- Advanced charting features (indicators, overlays)
- Portfolio tracking functionality
- Price alert notifications
- Multi-currency support
- Historical comparison charts
- News integration
- Social sentiment analysis
- Advanced filtering and sorting
- Cryptocurrency details pages

## Environment Variables

While this implementation doesn't require environment variables, you can add them for:

```env
# Optional: If using a CoinGecko API key
NEXT_PUBLIC_COINGECKO_API_KEY=your_api_key_here

# Optional: Customize cache durations
CACHE_DURATION_COINS=30000
CACHE_DURATION_HISTORY=300000
```

## Deployment

The application is ready for deployment on:

- **Vercel**: Zero-config deployment for Next.js
- **Netlify**: With Next.js runtime support
- **Other platforms**: That support Next.js 16+

### Build for Production

```bash
npm run build
npm start
```

## API Rate Limits

CoinGecko free API limits:
- 10-50 calls/minute (depending on endpoint)
- The caching strategy helps stay within limits

For production, consider:
- CoinGecko Pro API for higher limits
- Implementing additional caching layers
- Using a CDN for static assets

## Contributing

This is a starter implementation. Feel free to extend with:
- Additional cryptocurrency APIs
- More chart types
- Advanced analytics
- Social features
- Portfolio management

## License

This project is part of the Next.js Platform Starter and follows the same license.

## Support

For issues or questions:
- Check the CoinGecko API documentation
- Review Next.js documentation
- Check Chart.js documentation

## Credits

- Data provided by [CoinGecko API](https://www.coingecko.com/en/api)
- Built with [Next.js](https://nextjs.org/)
- Charts powered by [Chart.js](https://www.chartjs.org/)
- State management by [Zustand](https://github.com/pmndrs/zustand)
