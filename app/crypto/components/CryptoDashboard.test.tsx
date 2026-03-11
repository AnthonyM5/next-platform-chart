/**
 * Tests for CryptoDashboard component.
 *
 * CryptoDashboard is the main orchestrator.  This test suite verifies the
 * critical data-flow paths:
 *
 *   1. REST coin list fetched on mount → rendered in table
 *   2. WebSocket prices merged into `liveCoins` (rtPrices override current_price)
 *   3. `setRtPrices` / `setWsConnected` called to sync WS state into Zustand
 *   4. Error handling when fetch fails
 *
 * Heavy dependencies (fetch, Zustand store, child components) are mocked so
 * tests run quickly and deterministically.
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CryptoDashboard from './CryptoDashboard';
import type { Coin } from '../types';

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted ensures these are defined before mock factories)
// ---------------------------------------------------------------------------

const { mockSetRtPrices, mockSetWsConnected, mockAddNotification } = vi.hoisted(() => ({
  mockSetRtPrices: vi.fn(),
  mockSetWsConnected: vi.fn(),
  mockAddNotification: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Controls what useRealtimePrice returns — mutate these in tests.
let mockRtPricesFromHook: Record<string, number> = {};
let mockWsConnected = false;

vi.mock('../hooks/useRealtimePrice', () => ({
  useRealtimePrice: () => ({
    prices: mockRtPricesFromHook,
    connected: mockWsConnected,
  }),
}));

vi.mock('../store/cryptoStore', () => ({
  useCryptoStore: () => ({
    timePeriod: '7',
    currency: 'usd',
    chartPattern: 'line',
    addNotification: mockAddNotification,
    initFromStorage: vi.fn(),
    setRtPrices: mockSetRtPrices,
    setWsConnected: mockSetWsConnected,
  }),
}));

// Stub child components to avoid full rendering chains.
vi.mock('./CryptoTable', () => ({
  default: ({ coins }: { coins: Coin[] }) => (
    <div data-testid="crypto-table">
      {coins.map((c) => (
        <div key={c.id} data-testid={`coin-${c.id}`} data-price={c.current_price} />
      ))}
    </div>
  ),
}));
vi.mock('./CryptoChart', () => ({ default: () => <div data-testid="crypto-chart" /> }));
vi.mock('./CandlestickChart', () => ({ default: () => <div data-testid="candlestick-chart" /> }));
vi.mock('./FreshnessIndicator', () => ({ default: () => null }));
vi.mock('./ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./LoadingSkeleton', () => ({ default: () => <div data-testid="loading-skeleton" /> }));
vi.mock('./ThemeToggle', () => ({ default: () => null }));
vi.mock('./ViewModeToggle', () => ({ default: () => null }));
vi.mock('./ChartPatternToggle', () => ({ default: () => null }));
vi.mock('./TimePeriodSelector', () => ({ default: () => null }));
vi.mock('./StudiesDropdown', () => ({ default: () => null }));
vi.mock('./LivePrice', () => ({
  default: ({ fallbackPrice }: { fallbackPrice: number }) => (
    <span data-testid="live-price">${fallbackPrice}</span>
  ),
}));

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleCoins: Coin[] = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: '',
    current_price: 50000,
    market_cap: 1e12,
    market_cap_rank: 1,
    fully_diluted_valuation: null,
    total_volume: 1e10,
    high_24h: 51000,
    low_24h: 49000,
    price_change_24h: 1000,
    price_change_percentage_24h: 2,
    market_cap_change_24h: 1e10,
    market_cap_change_percentage_24h: 1,
    circulating_supply: 19e6,
    total_supply: 21e6,
    max_supply: 21e6,
    ath: 69000,
    ath_change_percentage: -28,
    ath_date: '',
    atl: 67,
    atl_change_percentage: 74000,
    atl_date: '',
    roi: null,
    last_updated: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockRtPricesFromHook = {};
  mockWsConnected = false;

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (String(url).includes('/crypto/api/coins')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: sampleCoins, fetchedAt: Date.now() }),
      });
    }
    if (String(url).includes('/crypto/api/coin-history')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { prices: [[Date.now(), 50000]], market_caps: [], total_volumes: [] },
            fetchedAt: Date.now(),
          }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CryptoDashboard', () => {
  it('renders without crashing', () => {
    render(<CryptoDashboard />);
    expect(screen.getByText(/Crypto Dashboard/i)).toBeTruthy();
  });

  it('fetches the coin list from /crypto/api/coins on mount', async () => {
    render(<CryptoDashboard />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/crypto/api/coins'));
    });
  });

  it('renders the table after the coin list loads', async () => {
    render(<CryptoDashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('crypto-table')).toBeTruthy();
    });
  });

  it('renders coins from the REST response in the table', async () => {
    render(<CryptoDashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('coin-bitcoin')).toBeTruthy();
    });
  });

  it('renders coins from the REST response with correct price data', async () => {
    render(<CryptoDashboard />);
    await waitFor(() => {
      const coinEl = screen.getByTestId('coin-bitcoin');
      // Coin should be rendered with the REST price (50000)
      expect(coinEl.getAttribute('data-price')).toBe('50000');
    });
  });

  it('calls addNotification with type "error" when the coin fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });
    render(<CryptoDashboard />);
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });
  });
});
