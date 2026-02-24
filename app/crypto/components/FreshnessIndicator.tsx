'use client';

import { useMemo } from 'react';
import { evaluateFreshness, detectPriceDrift, FRESHNESS_THRESHOLDS } from '../utils/dataFreshness';

interface FreshnessIndicatorProps {
  listFetchedAt: number | null;
  chartFetchedAt?: number | null;
  listPrice?: number;
  chartLatestPrice?: number;
  /** When true the WebSocket feed is connected and prices are streaming live */
  wsConnected?: boolean;
}

/**
 * Visual indicator showing whether the displayed data is fresh.
 *
 * - When `wsConnected` is true the dot is always green and labelled "Live"
 *   because prices are updated in real-time via the WebSocket feed.
 * - Otherwise falls back to REST-based staleness detection.
 */
export default function FreshnessIndicator({
  listFetchedAt,
  chartFetchedAt,
  listPrice,
  chartLatestPrice,
  wsConnected,
}: FreshnessIndicatorProps) {
  const { status, message } = useMemo(() => {
    // If the WebSocket is streaming live we always consider data fresh
    if (wsConnected) {
      return { status: 'fresh' as const, message: 'Prices streaming live via WebSocket' };
    }

    if (!listFetchedAt) return { status: 'unknown' as const, message: 'Waiting for data...' };

    const listFreshness = evaluateFreshness(listFetchedAt, FRESHNESS_THRESHOLDS.COINS_LIST);

    let chartMessage = '';
    let driftMessage = '';
    let worst: 'fresh' | 'stale' | 'unknown' = listFreshness.isFresh ? 'fresh' : 'stale';

    if (chartFetchedAt) {
      const chartFreshness = evaluateFreshness(chartFetchedAt, FRESHNESS_THRESHOLDS.CHART_DATA);
      if (!chartFreshness.isFresh) {
        worst = 'stale';
        chartMessage = chartFreshness.staleReason ?? '';
      }
    }

    if (listPrice !== undefined && chartLatestPrice !== undefined) {
      const drift = detectPriceDrift(listPrice, chartLatestPrice);
      if (!drift.acceptable) {
        worst = 'stale';
        driftMessage = `Price drift ${drift.driftPercent.toFixed(2)}%`;
      }
    }

    const msgs: string[] = [];
    if (!listFreshness.isFresh) msgs.push(`List: ${listFreshness.staleReason}`);
    if (chartMessage) msgs.push(`Chart: ${chartMessage}`);
    if (driftMessage) msgs.push(driftMessage);
    if (msgs.length === 0) msgs.push(`Data is fresh (age ${listFreshness.ageFormatted})`);

    return { status: worst, message: msgs.join(' | ') };
  }, [wsConnected, listFetchedAt, chartFetchedAt, listPrice, chartLatestPrice]);

  const dotColor =
    status === 'fresh' ? '#22c55e' : status === 'stale' ? '#ef4444' : '#a3a3a3';

  return (
    <span
      className="freshness-indicator"
      title={message}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block',
          ...(wsConnected ? { animation: 'pulse 2s infinite' } : {}),
        }}
      />
      <span style={{ fontSize: 12, opacity: 0.8 }}>
        {wsConnected ? '⚡ Live' : (status === 'fresh' ? 'Live' : 'Stale')}
      </span>
    </span>
  );
}
