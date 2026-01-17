# Quick Setup Guide for Crypto Dashboard

## Installation Steps

### 1. Install Dependencies

Run the following command in your terminal:

```bash
npm install
```

This will install:
- `chart.js` - For creating interactive charts
- `react-chartjs-2` - React wrapper for Chart.js
- `zustand` - Lightweight state management
- `date-fns` - Date formatting utilities

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3000/crypto
```

## Project Structure Overview

```
app/crypto/
├── api/                          # API Routes
│   ├── coins/route.js           # Fetch cryptocurrency list
│   ├── coin-history/route.js    # Fetch historical data
│   └── search/route.js          # Search cryptocurrencies
│
├── components/                   # React Components
│   ├── CryptoDashboard.jsx      # Main dashboard (orchestrates everything)
│   ├── CryptoTable.jsx          # Table/Grid view with sorting
│   ├── CryptoChart.jsx          # Interactive price chart
│   ├── ThemeToggle.jsx          # Dark/Light mode switch
│   ├── TimePeriodSelector.jsx   # 1D/7D/30D/1Y selector
│   ├── ViewModeToggle.jsx       # Table/Grid toggle
│   ├── LoadingSkeleton.jsx      # Loading states
│   └── ErrorBoundary.jsx        # Error handling
│
├── store/                        # State Management
│   └── cryptoStore.js           # Zustand store with localStorage
│
├── config/                       # Configuration
│   └── config.js                # Environment config
│
├── crypto-dashboard.css         # Complete styling
├── layout.jsx                   # Layout wrapper
├── page.jsx                     # Page entry point
├── .env.example                 # Environment variables template
└── README.md                    # Full documentation
```

## Key Features Implemented

### ✅ Data Fetching & Display
- Real-time cryptocurrency prices from CoinGecko API
- Top 100 cryptocurrencies by market cap
- Price, 24h change, market cap, volume
- Sortable columns in table view
- Grid view with cards

### ✅ Interactive Charts
- Historical price data visualization
- Multiple time periods (1D, 7D, 30D, 1Y)
- Hover tooltips with price information
- Smooth animations and transitions

### ✅ User Interface
- **Dark/Light Mode**: Toggle with persistent preference
- **Table View**: Sortable data table with all metrics
- **Grid View**: Card-based layout for mobile
- **Search**: Filter cryptocurrencies by name or symbol
- **Responsive**: Works on desktop, tablet, and mobile

### ✅ Performance & UX
- Auto-refresh every 30 seconds (toggleable)
- API response caching (30s for prices, 5min for charts)
- Loading skeletons during data fetch
- Error boundaries for graceful error handling
- Smooth animations using CSS transforms

### ✅ Data Management
- Favorites: Star your preferred coins
- Local storage: Saves preferences across sessions
- Export: Download data as JSON
- View persistence: Remembers table/grid preference

### ✅ Accessibility
- Keyboard navigation
- ARIA labels
- Focus indicators
- Screen reader support
- Semantic HTML

## Usage Guide

### Viewing Cryptocurrencies

1. **Table View** (default):
   - Click column headers to sort
   - Click any row to view detailed chart
   - Use search bar to filter coins

2. **Grid View**:
   - Toggle using the grid icon in header
   - Cards show key metrics
   - Click any card to view chart

### Viewing Charts

1. Click any cryptocurrency row or card
2. Chart appears at the top
3. Use time period buttons (1D, 7D, 30D, 1Y)
4. Hover over chart to see specific prices
5. Click X to close chart

### Managing Favorites

- Click the star (☆) next to any coin
- Filled star (★) indicates favorite
- Favorites are saved in localStorage

### Exporting Data

- Click "Export" button in header
- Downloads current data as JSON file
- Includes all visible cryptocurrency data

### Theme Toggle

- Click sun/moon icon in header
- Switches between dark and light mode
- Preference saved in localStorage

### Auto-Refresh

- Enabled by default (🔄 icon)
- Updates prices every 30 seconds
- Click to pause (⏸️ icon)
- Resumes on next click

## API Endpoints

### GET /crypto/api/coins
Fetches cryptocurrency market data

**Parameters:**
- `vs_currency` (default: usd)
- `per_page` (default: 100)
- `page` (default: 1)

**Example:**
```
/crypto/api/coins?vs_currency=usd&per_page=100
```

### GET /crypto/api/coin-history
Fetches historical price data

**Parameters:**
- `id` (required) - Coin ID (e.g., "bitcoin")
- `days` (default: 7) - Number of days
- `vs_currency` (default: usd)

**Example:**
```
/crypto/api/coin-history?id=bitcoin&days=7
```

### GET /crypto/api/search
Searches for cryptocurrencies

**Parameters:**
- `q` - Search query

**Example:**
```
/crypto/api/search?q=bitcoin
```

## Customization

### Change Default Currency

Edit `app/crypto/config/config.js`:
```javascript
defaultCurrency: 'eur', // or 'gbp', 'jpy', etc.
```

### Adjust Cache Duration

Edit API route files or set environment variables:
```env
CACHE_DURATION_COINS=60000      # 1 minute
CACHE_DURATION_HISTORY=600000   # 10 minutes
```

### Modify Time Periods

Edit `app/crypto/components/TimePeriodSelector.jsx`:
```javascript
const TIME_PERIODS = [
  { value: '1', label: '1D' },
  { value: '7', label: '7D' },
  { value: '14', label: '2W' },  // Add this
  { value: '30', label: '30D' },
  { value: '365', label: '1Y' },
];
```

### Change Color Scheme

Edit `app/crypto/crypto-dashboard.css`:
```css
:root {
  --accent-primary: #4f46e5;  /* Change to your color */
  --positive: #10b981;        /* Green for gains */
  --negative: #ef4444;        /* Red for losses */
}
```

## Troubleshooting

### Charts not displaying
- Ensure Chart.js is installed: `npm install chart.js react-chartjs-2`
- Check browser console for errors
- Verify API is returning data

### Data not loading
- Check CoinGecko API status
- Verify internet connection
- Check browser console for API errors
- CoinGecko free tier has rate limits (10-50 calls/min)

### Theme not persisting
- Check if localStorage is enabled in browser
- Clear localStorage and try again: `localStorage.clear()`

### Search not working
- Ensure you're typing at least 2 characters
- Check if search API endpoint is responding
- Try clearing browser cache

## Performance Tips

1. **Reduce Auto-Refresh Frequency**: 
   - Edit `autoRefreshInterval` in config
   - Or toggle off when not needed

2. **Limit Displayed Coins**:
   - Change `per_page` parameter
   - Implement pagination

3. **Optimize Images**:
   - CoinGecko provides different image sizes
   - Use smaller images for grid view

4. **Enable API Key** (Optional):
   - Get CoinGecko Pro API key
   - Add to `.env.local`:
     ```
     NEXT_PUBLIC_COINGECKO_API_KEY=your_key
     ```

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## Security Considerations

- API calls are cached to prevent rate limiting
- No sensitive data stored in localStorage
- All API calls use HTTPS
- No authentication required (public data)

## Next Steps

Consider adding:
- [ ] WebSocket for real-time updates
- [ ] Portfolio tracking
- [ ] Price alerts with notifications
- [ ] Historical comparison between coins
- [ ] News integration
- [ ] Social sentiment analysis
- [ ] Advanced charting (candlesticks, indicators)
- [ ] Multiple currency support
- [ ] Cryptocurrency details pages

## Support

- **CoinGecko API Docs**: https://www.coingecko.com/en/api/documentation
- **Chart.js Docs**: https://www.chartjs.org/docs/
- **Next.js Docs**: https://nextjs.org/docs
- **Zustand Docs**: https://docs.pmnd.rs/zustand/

## License

Part of Next.js Platform Starter
