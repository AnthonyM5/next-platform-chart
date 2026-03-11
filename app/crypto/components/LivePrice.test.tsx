/**
 * Tests for LivePrice component.
 *
 * LivePrice reads the live price for a specific coin from the Zustand store
 * (state.rtPrices[coinId]) and falls back to a prop when no WebSocket price
 * is available.  Price-direction changes trigger CSS animation classes via
 * imperative DOM manipulation (no React animation state).
 *
 * Zustand is mocked so each test controls store state directly.
 */

import { render, screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LivePrice from './LivePrice';

// ---------------------------------------------------------------------------
// Zustand store mock
// ---------------------------------------------------------------------------

let mockRtPrices: Record<string, number> = {};

vi.mock('../store/cryptoStore', () => ({
  useCryptoStore: (selector: (state: { rtPrices: Record<string, number> }) => unknown) =>
    selector({ rtPrices: mockRtPrices }),
}));

beforeEach(() => {
  mockRtPrices = {};
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LivePrice', () => {
  it('renders the fallback price when no live price is in the store', () => {
    render(<LivePrice coinId="bitcoin" fallbackPrice={50000} />);
    expect(screen.getByText('$50,000.00')).toBeTruthy();
  });

  it('renders the live store price when available', () => {
    mockRtPrices = { bitcoin: 61234.56 };
    render(<LivePrice coinId="bitcoin" fallbackPrice={50000} />);
    expect(screen.getByText('$61,234.56')).toBeTruthy();
  });

  it('formats high-value prices with 2 decimal places', () => {
    mockRtPrices = { bitcoin: 100000.1 };
    render(<LivePrice coinId="bitcoin" fallbackPrice={0} />);
    expect(screen.getByText('$100,000.10')).toBeTruthy();
  });

  it('formats sub-dollar prices with up to 6 decimal places', () => {
    mockRtPrices = { shib: 0.000012 };
    render(<LivePrice coinId="shib" fallbackPrice={0} />);
    // Exact digits depend on locale but price should contain the value
    const el = screen.getByText(/\$0\.0000/);
    expect(el).toBeTruthy();
  });

  it('uses the fallbackPrice when coinId is not in rtPrices', () => {
    mockRtPrices = { ethereum: 3000 };
    render(<LivePrice coinId="bitcoin" fallbackPrice={45000} />);
    expect(screen.getByText('$45,000.00')).toBeTruthy();
  });

  it('renders a span with the live-price class', () => {
    render(<LivePrice coinId="bitcoin" fallbackPrice={1} />);
    const span = document.querySelector('span.live-price');
    expect(span).not.toBeNull();
  });

  it('applies a custom className to the span', () => {
    render(<LivePrice coinId="bitcoin" fallbackPrice={1} className="my-custom" />);
    const span = document.querySelector('span.my-custom');
    expect(span).not.toBeNull();
  });

  it('adds price-flash-up class when live price increases', async () => {
    mockRtPrices = { bitcoin: 50000 };
    const { rerender } = render(<LivePrice coinId="bitcoin" fallbackPrice={50000} />);

    mockRtPrices = { bitcoin: 51000 };
    await act(async () => {
      rerender(<LivePrice coinId="bitcoin" fallbackPrice={50000} />);
    });

    const span = document.querySelector('span.live-price') as HTMLSpanElement;
    expect(span?.classList.contains('price-flash-up')).toBe(true);
  });

  it('adds price-flash-down class when live price decreases', async () => {
    mockRtPrices = { bitcoin: 50000 };
    const { rerender } = render(<LivePrice coinId="bitcoin" fallbackPrice={50000} />);

    mockRtPrices = { bitcoin: 49000 };
    await act(async () => {
      rerender(<LivePrice coinId="bitcoin" fallbackPrice={50000} />);
    });

    const span = document.querySelector('span.live-price') as HTMLSpanElement;
    expect(span?.classList.contains('price-flash-down')).toBe(true);
  });

  it('sets data-direction="up" when price increases and showDirection=true', async () => {
    mockRtPrices = { bitcoin: 50000 };
    const { rerender } = render(
      <LivePrice coinId="bitcoin" fallbackPrice={50000} showDirection={true} />
    );

    mockRtPrices = { bitcoin: 55000 };
    await act(async () => {
      rerender(<LivePrice coinId="bitcoin" fallbackPrice={50000} showDirection={true} />);
    });

    const span = document.querySelector('span.live-price') as HTMLSpanElement;
    expect(span?.dataset.direction).toBe('up');
  });

  it('sets data-direction="down" when price decreases and showDirection=true', async () => {
    mockRtPrices = { bitcoin: 50000 };
    const { rerender } = render(
      <LivePrice coinId="bitcoin" fallbackPrice={50000} showDirection={true} />
    );

    mockRtPrices = { bitcoin: 45000 };
    await act(async () => {
      rerender(<LivePrice coinId="bitcoin" fallbackPrice={50000} showDirection={true} />);
    });

    const span = document.querySelector('span.live-price') as HTMLSpanElement;
    expect(span?.dataset.direction).toBe('down');
  });

  it('does not set data-direction when showDirection=false', async () => {
    mockRtPrices = { bitcoin: 50000 };
    const { rerender } = render(
      <LivePrice coinId="bitcoin" fallbackPrice={50000} showDirection={false} />
    );

    mockRtPrices = { bitcoin: 55000 };
    await act(async () => {
      rerender(<LivePrice coinId="bitcoin" fallbackPrice={50000} showDirection={false} />);
    });

    const span = document.querySelector('span.live-price') as HTMLSpanElement;
    expect(span?.dataset.direction).toBeUndefined();
  });
});
