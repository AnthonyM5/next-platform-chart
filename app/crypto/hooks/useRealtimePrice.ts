'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Maps CoinGecko coin IDs to CoinCap asset IDs where they differ.
 * CoinCap WebSocket: wss://ws.coincap.io/prices?assets=bitcoin,ethereum,...
 */
const COINGECKO_TO_COINCAP: Record<string, string> = {
  ripple: 'xrp',
  binancecoin: 'binance-coin',
  'bitcoin-cash': 'bitcoin-cash-abc-2',
  'lido-staked-ether': 'staked-ether',
};

// Reverse map: CoinCap ID → CoinGecko ID
const COINCAP_TO_COINGECKO: Record<string, string> = Object.fromEntries(
  Object.entries(COINGECKO_TO_COINCAP).map(([cg, cc]) => [cc, cg])
);

function toCoinCapId(coinGeckoId: string): string {
  return COINGECKO_TO_COINCAP[coinGeckoId] ?? coinGeckoId;
}

function toCoinGeckoId(coinCapId: string): string {
  return COINCAP_TO_COINGECKO[coinCapId] ?? coinCapId;
}

export interface RealtimePriceResult {
  /** Map of CoinGecko coin ID → latest streamed price */
  prices: Record<string, number>;
  /** Whether the WebSocket connection is currently open */
  connected: boolean;
}

const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Streams real-time prices for the given CoinGecko coin IDs via the
 * CoinCap WebSocket API (wss://ws.coincap.io).  No API key required.
 *
 * Falls back gracefully: if the connection cannot be established the hook
 * simply returns `{ prices: {}, connected: false }` so callers can fall
 * back to the REST-polled data.
 */
export function useRealtimePrice(coinIds: string[]): RealtimePriceResult {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const coinIdsRef = useRef<string[]>(coinIds);
  const mountedRef = useRef(true);

  // Keep the ref in sync without triggering a reconnect on each render
  coinIdsRef.current = coinIds;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!mountedRef.current) return;
    if (coinIdsRef.current.length === 0) return;

    const coinCapIds = coinIdsRef.current.map(toCoinCapId).join(',');
    const url = `wss://ws.coincap.io/prices?assets=${coinCapIds}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as Record<string, string>;
          setPrices((prev) => {
            const next = { ...prev };
            for (const [coinCapId, priceStr] of Object.entries(data)) {
              const price = parseFloat(priceStr);
              if (!isNaN(price)) {
                next[toCoinGeckoId(coinCapId)] = price;
              }
            }
            return next;
          });
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!mountedRef.current) return;
        setConnected(false);

        // Exponential back-off reconnect (cap at MAX_RECONNECT_ATTEMPTS)
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay =
            RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            // eslint-disable-next-line react-hooks/immutability
            if (mountedRef.current) connect();
          }, delay);
        }
      };
    } catch {
      // WebSocket constructor can throw in some environments
      setConnected(false);
    }
  }, []); // stable – reads coinIds via ref

  // Connect once coinIds are available
  useEffect(() => {
    if (coinIds.length > 0 && wsRef.current === null) {
      connect();
    }
  }, [coinIds, connect]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearReconnectTimer]);

  return { prices, connected };
}
