# Cryptocurrency Dashboard - Copilot Instructions

This is a production-ready cryptocurrency tracking dashboard built with Next.js 16, TypeScript, and Chart.js. It features real-time price tracking with CoinGecko API integration, interactive charts with technical indicators (RSI, SMA, MACD, Bollinger Bands), and a Zustand-based state management system.

## Build, Test, and Lint Commands

```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run ESLint
npm run lint
```

**Note:** The main cryptocurrency dashboard is located at `/crypto` route, not the root path.

## Project Architecture

### Application Structure

```
app/
├── crypto/                    # Main cryptocurrency dashboard feature
│   ├── api/                  # API routes (proxies to CoinGecko)
│   │   ├── coins/route.ts    # Coin list with market data (30s cache)
│   │   ├── coin-history/route.ts  # Historical price data (5min cache)
│   │   └── search/route.ts   # Coin search endpoint (1hr cache)
│   ├── components/           # React components
│   ├── store/                # Zustand state management
│   │   └── cryptoStore.ts    # Global state with localStorage persistence
│   ├── utils/                # Technical indicator calculations
│   │   └── indicators.ts     # RSI, SMA, MACD, Bollinger Bands
│   ├── types/                # TypeScript definitions
│   └── crypto-dashboard.css  # Complete styling
├── layout.tsx                # Root layout
└── page.tsx                  # Home page
middleware.ts                 # Security headers and routing middleware
```

### State Management (Zustand)

The application uses **Zustand** without persistence middleware to avoid SSR hydration issues. State is manually synced with localStorage:

- **Theme**: `light` | `dark` (default: dark)
- **Time Period**: `1` | `7` | `30` | `365` days
- **Favorites**: Persisted coin IDs array
- **Selected Coins**: For comparison (default: bitcoin, ethereum)
- **Enabled Studies**: Technical indicator toggles
- **View Mode**: `table` | `grid`
- **Currency**: Currently only USD supported in UI

**Important:** Always call `initFromStorage()` on client mount to hydrate state from localStorage.

### Technical Indicators System

All indicators are dynamically configured based on the selected time period to match data granularity:

| Timeframe | Data Points | RSI Period | SMA (Short/Long) | MACD (Fast/Slow/Signal) | Bollinger (Period) |
|-----------|-------------|------------|------------------|-------------------------|---------------------|
| 1 day     | Hourly      | 9          | 10/20            | 8/17/9                  | 14                  |
| 7 days    | Hourly/Daily| 14         | 20/50            | 12/26/9                 | 20                  |
| 30 days   | Daily       | 14         | 20/50            | 12/26/9                 | 20                  |
| 1 year    | Daily       | 21         | 50/200           | 19/39/9                 | 30                  |

**Configuration locations:**
- `app/crypto/utils/indicators.ts` - All period configs exported as constants
- Formulas follow Investopedia standards (see inline comments with links)

### Chart.js Implementation

The application uses **react-chartjs-2** wrapper with manual dataset management:

**Registered components:**
```typescript
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);
```

**Multi-panel layout:**
1. **Main Price Chart** - Price line with overlays (SMA, Bollinger Bands)
2. **RSI Panel** - Separate chart with fixed 0-100 scale
3. **MACD Panel** - Histogram (Bar) + signal lines (Line)

**Dataset ordering matters:**
- Bollinger Bands rendered first (behind price) using `fill: '+1'` for band shading
- Price dataset in middle
- SMA overlays on top

**Performance optimizations:**
- `pointRadius: 0` for all line charts
- `useMemo` for indicator calculations
- Conditional rendering based on `enabledStudies`

### API Routes & Caching

All API routes implement in-memory caching with stale-while-revalidate strategy:

```typescript
// Example cache pattern
let cache: CacheEntry = { data: null, timestamp: null };

// Returns stale cache on rate limits (429) or errors
// Cache durations: coins (30s), history (5min), search (1hr)
```

**Important:** CoinGecko API has rate limits. Always check for cached/stale flags in response.

## Key Conventions

### Component Patterns

1. **Dual file formats**: Many components have both `.jsx` and `.tsx` versions. The `.tsx` files are the current implementation; `.jsx` are legacy.

2. **Client components**: All components using Zustand or browser APIs must have `'use client'` directive.

3. **Loading states**: Use `LoadingSkeleton` component with `type` prop for consistent loading UI.

4. **Error handling**: Wrap data-fetching components in `ErrorBoundary`.

### TypeScript Configuration

- **Path alias**: `@/*` maps to project root (e.g., `@/app/crypto/types`)
- **JSX**: Set to `react-jsx` (uses new JSX transform)
- **Strict mode**: Enabled

### Styling

- **Tailwind v4**: Uses new `@tailwindcss/postcss` plugin (not v3 CLI)
- **CSS custom properties**: Theme colors in `crypto-dashboard.css` (don't use Tailwind dark: variant directly)
- **Responsive breakpoints**: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)

### API Data Flow

1. Client components call Next.js API routes (`/crypto/api/*`)
2. API routes fetch from CoinGecko with caching
3. Data flows to Zustand store or component state
4. Chart components derive indicator data from prices using `utils/indicators.ts`

**Never call CoinGecko directly from client components** - always use the API routes to leverage caching and avoid CORS issues.

### localStorage Keys

All localStorage keys are prefixed with `crypto-`:
- `crypto-theme`
- `crypto-favorites`
- `crypto-selected`
- `crypto-period`
- `crypto-currency`
- `crypto-viewmode`
- `crypto-studies`
- `crypto-alerts`

## Configuration Files

- **next.config.js**: React Compiler enabled, redirects/rewrites configured
- **netlify.toml**: Build command and publish directory
- **tsconfig.json**: Path aliases and strict mode
- **.eslintrc.json**: Next.js core-web-vitals with disabled img-element rule
- **renovate.json**: Dependency updates managed by Renovate

## Important Notes

- The app uses **React 19** and **Next.js 16** with experimental React Compiler
- **Netlify Blobs** package is included but not actively used in crypto dashboard
- Middleware adds security headers and logs all requests
- No test suite currently exists - manual testing via dev server
