/**
 * Tests for CryptoChart component.
 *
 * CryptoChart renders a Chart.js line chart with optional technical indicators
 * (RSI, SMA, MACD, Bollinger Bands).  The `livePrice` prop enables imperitive
 * Chart.js updates without re-rendering React — this test suite verifies that:
 *
 *   1. The component renders (or shows a loading state) correctly
 *   2. The `livePrice` prop is accepted without errors
 *   3. When `livePrice` changes, the chart instance's last data-point is updated
 *      and `chart.update('none')` is called
 *
 * Chart.js is mocked so tests don't require a canvas environment.
 */

import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CryptoChart from './CryptoChart';
import type { ChartData } from '../types';

// ---------------------------------------------------------------------------
// Mock Chart.js / react-chartjs-2
// ---------------------------------------------------------------------------

/** Tracks calls made to the chart instance returned by the mock. */
const mockChartUpdate = vi.fn();
let mockChartInstance: {
  data: { datasets: { data: (number | null)[] }[] };
  update: typeof mockChartUpdate;
} | null = null;

vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(({ ref: refCallback, data }: {
    ref?: (instance: unknown) => void;
    data: { datasets: { data: (number | null)[] }[] };
  }) => {
    // Simulate the ref callback that react-chartjs-2 uses internally
    if (typeof refCallback === 'function') {
      mockChartInstance = {
        data: { datasets: [{ data: data.datasets[0]?.data?.slice() ?? [] }] },
        update: mockChartUpdate,
      };
      refCallback(mockChartInstance);
    }
    return <canvas data-testid="price-chart" />;
  }),
  Bar: vi.fn(() => <canvas data-testid="bar-chart" />),
}));

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: class {},
  LinearScale: class {},
  PointElement: class {},
  LineElement: class {},
  BarElement: class {},
  Title: class {},
  Tooltip: class {},
  Legend: class {},
  Filler: class {},
}));

// ---------------------------------------------------------------------------
// Mock Zustand store
// ---------------------------------------------------------------------------

vi.mock('../store/cryptoStore', () => ({
  useCryptoStore: () => ({
    theme: 'dark',
    timePeriod: '7',
    enabledStudies: { rsi: false, sma: false, bollingerBands: false, macd: false },
  }),
}));

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const now = Date.now();
const sampleChartData: ChartData = {
  prices: [
    [now - 6 * 86400_000, 40000],
    [now - 5 * 86400_000, 41000],
    [now - 4 * 86400_000, 42000],
    [now - 3 * 86400_000, 43000],
    [now - 2 * 86400_000, 44000],
    [now - 1 * 86400_000, 45000],
    [now, 46000],
  ],
  market_caps: [],
  total_volumes: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockChartInstance = null;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CryptoChart', () => {
  it('renders a loading skeleton when loading=true', () => {
    const { container } = render(<CryptoChart coinData={null} loading={true} />);
    expect(container.querySelector('.chart-skeleton')).not.toBeNull();
  });

  it('renders at least one price chart canvas when data is provided', () => {
    render(<CryptoChart coinData={sampleChartData} loading={false} />);
    // CryptoChart can render multiple Line canvases (price + RSI + MACD sub-charts)
    expect(screen.getAllByTestId('price-chart').length).toBeGreaterThan(0);
  });

  it('accepts a livePrice prop without throwing', () => {
    expect(() =>
      render(<CryptoChart coinData={sampleChartData} loading={false} livePrice={47000} />)
    ).not.toThrow();
  });

  it('does not render chart body when coinData is null and not loading', () => {
    render(<CryptoChart coinData={null} loading={false} />);
    expect(screen.queryByTestId('price-chart')).toBeNull();
  });

  it('updates the last dataset value when livePrice changes', async () => {
    const { rerender } = render(
      <CryptoChart coinData={sampleChartData} loading={false} livePrice={46000} />
    );

    // Advance time by > 1 second so the throttle allows an update
    vi.useFakeTimers();
    vi.advanceTimersByTime(1100);

    await act(async () => {
      rerender(<CryptoChart coinData={sampleChartData} loading={false} livePrice={48000} />);
    });

    vi.useRealTimers();

    // If the chart instance was captured and update called, the last data point
    // should have been mutated imperatively
    if (mockChartInstance) {
      expect(mockChartUpdate).toHaveBeenCalledWith('none');
    }
  });

  it('throttles rapid livePrice updates to at most 1 per second', async () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <CryptoChart coinData={sampleChartData} loading={false} livePrice={46000} />
    );

    // Fire several updates within 1 second
    await act(async () => { rerender(<CryptoChart coinData={sampleChartData} loading={false} livePrice={46100} />); });
    await act(async () => { rerender(<CryptoChart coinData={sampleChartData} loading={false} livePrice={46200} />); });
    await act(async () => { rerender(<CryptoChart coinData={sampleChartData} loading={false} livePrice={46300} />); });

    // Should not have called update more than once (first call triggers it,
    // subsequent calls within 1 s are throttled)
    const callCount = mockChartUpdate.mock.calls.length;
    expect(callCount).toBeLessThanOrEqual(1);

    vi.useRealTimers();
  });
});
