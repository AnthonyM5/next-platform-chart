/**
 * Data Freshness Utilities
 *
 * Helpers to detect stale data and drift between the overview list and the chart.
 */

export interface FreshnessInfo {
  isFresh: boolean;
  ageMs: number;
  ageSec: number;
  ageFormatted: string;
  staleReason?: string;
}

/** Thresholds in ms */
export const FRESHNESS_THRESHOLDS = {
  COINS_LIST: 60_000,      // list prices should not be older than 60 s
  CHART_DATA: 300_000,     // historical chart can be up to 5 min
  MAX_DRIFT: 120_000,      // max acceptable drift between list price and chart latest point
};

/**
 * Evaluates how fresh a data payload is.
 * @param fetchedAt - epoch ms when the data was retrieved from the upstream API
 * @param thresholdMs - max acceptable age
 */
export function evaluateFreshness(fetchedAt: number, thresholdMs: number): FreshnessInfo {
  const now = Date.now();
  const ageMs = now - fetchedAt;
  const ageSec = Math.round(ageMs / 1000);
  const isFresh = ageMs <= thresholdMs;
  const ageFormatted = ageSec < 60
    ? `${ageSec}s`
    : `${Math.floor(ageSec / 60)}m ${ageSec % 60}s`;

  return {
    isFresh,
    ageMs,
    ageSec,
    ageFormatted,
    staleReason: isFresh ? undefined : `Data is ${ageFormatted} old (threshold ${thresholdMs / 1000}s)`,
  };
}

/**
 * Detects drift between the list price and the most recent chart price point.
 */
export function detectPriceDrift(
  listPrice: number,
  chartLatestPrice: number
): { driftPercent: number; acceptable: boolean } {
  if (listPrice === 0) return { driftPercent: 0, acceptable: true };
  const driftPercent = Math.abs((listPrice - chartLatestPrice) / listPrice) * 100;
  // Allow up to 1% drift (crypto volatility)
  return { driftPercent, acceptable: driftPercent <= 1 };
}

/**
 * Detects timestamp drift between list and chart (last point).
 */
export function detectTimestampDrift(
  listFetchedAt: number,
  chartLastTimestamp: number
): { driftMs: number; acceptable: boolean } {
  const driftMs = Math.abs(listFetchedAt - chartLastTimestamp);
  return { driftMs, acceptable: driftMs <= FRESHNESS_THRESHOLDS.MAX_DRIFT };
}
