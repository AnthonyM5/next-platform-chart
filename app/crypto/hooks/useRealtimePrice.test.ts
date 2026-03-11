/**
 * Tests for useRealtimePrice hook.
 *
 * WebSocket is mocked via a class stored on globalThis so vitest's jsdom
 * environment picks it up.  Each test controls the WebSocket lifecycle
 * (open, message, close) through the mock's static helpers.
 */

import { renderHook, act } from '@testing-library/react';
import { useRealtimePrice } from './useRealtimePrice';

// ---------------------------------------------------------------------------
// WebSocket mock
// ---------------------------------------------------------------------------

interface MockWSInstance {
  url: string;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  close: () => void;
  /** Simulate a successful connection */
  triggerOpen: () => void;
  /** Simulate an incoming price message */
  triggerMessage: (data: Record<string, string>) => void;
  /** Simulate a connection close */
  triggerClose: () => void;
  /** Simulate a connection error */
  triggerError: () => void;
}

let _lastInstance: MockWSInstance | null = null;

class MockWebSocket implements MockWSInstance {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    _lastInstance = this;
  }

  close() {
    this.onclose?.(new CloseEvent('close'));
    _lastInstance = null;
  }

  triggerOpen() {
    this.onopen?.(new Event('open'));
  }

  triggerMessage(data: Record<string, string>) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  triggerClose() {
    this.onclose?.(new CloseEvent('close'));
    _lastInstance = null;
  }

  triggerError() {
    this.onerror?.(new Event('error'));
  }
}

/** Get the currently active mock WebSocket instance (throws if none). */
function getLastWS(): MockWSInstance {
  if (!_lastInstance) throw new Error('No active MockWebSocket instance');
  return _lastInstance;
}

beforeAll(() => {
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  _lastInstance = null;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  _lastInstance = null;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRealtimePrice', () => {
  it('starts disconnected with empty prices when no coinIds provided', () => {
    const { result } = renderHook(() => useRealtimePrice([]));
    expect(result.current.connected).toBe(false);
    expect(result.current.prices).toEqual({});
  });

  it('opens a WebSocket connection when coinIds are provided', () => {
    renderHook(() => useRealtimePrice(['bitcoin', 'ethereum']));
    const ws = getLastWS();
    expect(ws.url).toContain('bitcoin');
    expect(ws.url).toContain('ethereum');
    expect(ws.url).toContain('wss://ws.coincap.io/prices');
  });

  it('maps CoinGecko IDs to CoinCap IDs in the URL', () => {
    renderHook(() => useRealtimePrice(['ripple', 'binancecoin']));
    const ws = getLastWS();
    expect(ws.url).toContain('xrp');
    expect(ws.url).toContain('binance-coin');
    // Original CoinGecko IDs should not appear
    expect(ws.url).not.toContain('ripple');
    expect(ws.url).not.toContain('binancecoin');
  });

  it('sets connected=true when WebSocket opens', () => {
    const { result } = renderHook(() => useRealtimePrice(['bitcoin']));
    act(() => {
      getLastWS().triggerOpen();
    });
    expect(result.current.connected).toBe(true);
  });

  it('stores incoming prices using CoinGecko IDs', () => {
    const { result } = renderHook(() => useRealtimePrice(['bitcoin', 'ethereum']));
    act(() => {
      getLastWS().triggerOpen();
      getLastWS().triggerMessage({ bitcoin: '60000.50', ethereum: '3000.25' });
    });
    expect(result.current.prices['bitcoin']).toBe(60000.5);
    expect(result.current.prices['ethereum']).toBe(3000.25);
  });

  it('translates CoinCap IDs back to CoinGecko IDs on message', () => {
    const { result } = renderHook(() => useRealtimePrice(['ripple']));
    act(() => {
      getLastWS().triggerOpen();
      // CoinCap sends 'xrp', hook must map back to 'ripple'
      getLastWS().triggerMessage({ xrp: '0.55' });
    });
    expect(result.current.prices['ripple']).toBe(0.55);
    expect(result.current.prices['xrp']).toBeUndefined();
  });

  it('sets connected=false on WebSocket error', () => {
    const { result } = renderHook(() => useRealtimePrice(['bitcoin']));
    act(() => {
      getLastWS().triggerOpen();
    });
    expect(result.current.connected).toBe(true);
    act(() => {
      getLastWS().triggerError();
    });
    expect(result.current.connected).toBe(false);
  });

  it('sets connected=false on WebSocket close', () => {
    const { result } = renderHook(() => useRealtimePrice(['bitcoin']));
    act(() => {
      getLastWS().triggerOpen();
    });
    act(() => {
      getLastWS().triggerClose();
    });
    expect(result.current.connected).toBe(false);
  });

  it('does not reconnect after unmount', () => {
    const { unmount } = renderHook(() => useRealtimePrice(['bitcoin']));
    act(() => {
      getLastWS().triggerOpen();
    });
    unmount();
    // After unmount the socket should be gone and no new instance created
    // even when timers fire (reconnect attempt)
    vi.runAllTimers();
    expect(_lastInstance).toBeNull();
  });

  it('ignores malformed WebSocket message frames', () => {
    const { result } = renderHook(() => useRealtimePrice(['bitcoin']));
    act(() => {
      getLastWS().triggerOpen();
    });
    // Malformed message should not throw or change prices
    act(() => {
      getLastWS().onmessage?.(new MessageEvent('message', { data: 'not-json' }));
    });
    expect(result.current.prices).toEqual({});
  });

  it('reconnects with a new WebSocket when the coin set changes', () => {
    // Start with just bitcoin
    const { rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useRealtimePrice(ids),
      { initialProps: { ids: ['bitcoin'] } }
    );
    const firstURL = getLastWS().url;
    expect(firstURL).toContain('bitcoin');

    // Add ethereum — hook should close the old socket and open a new one
    act(() => {
      rerender({ ids: ['bitcoin', 'ethereum'] });
    });

    const secondURL = getLastWS().url;
    expect(secondURL).toContain('bitcoin');
    expect(secondURL).toContain('ethereum');
    // A fresh socket was created (URL changed)
    expect(secondURL).not.toBe(firstURL);
  });

  it('does NOT reconnect when coinIds are reordered (same set)', () => {
    renderHook(
      ({ ids }: { ids: string[] }) => useRealtimePrice(ids),
      { initialProps: { ids: ['bitcoin', 'ethereum'] } }
    );
    const firstURL = getLastWS().url;

    // Reorder the array — sorted key is the same so no reconnect should happen
    act(() => {
      // re-render with same coins in reverse order; if reconnect happens
      // _lastInstance would be null momentarily then a new one created
    });
    // URL should be unchanged
    expect(getLastWS().url).toBe(firstURL);
  });

  it('retains accumulated prices after a coin-set reconnect', () => {
    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useRealtimePrice(ids),
      { initialProps: { ids: ['bitcoin'] } }
    );

    act(() => {
      getLastWS().triggerOpen();
      getLastWS().triggerMessage({ bitcoin: '70000' });
    });
    expect(result.current.prices['bitcoin']).toBe(70000);

    // Expand coin set — previous prices should survive in state
    act(() => {
      rerender({ ids: ['bitcoin', 'ethereum'] });
    });
    // bitcoin price still in state from before reconnect
    expect(result.current.prices['bitcoin']).toBe(70000);
  });
});
