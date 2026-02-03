/**
 * Automated tests for data freshness utilities.
 *
 * Run with: npx vitest run app/crypto/utils/dataFreshness.test.ts
 * Or: npx jest app/crypto/utils/dataFreshness.test.ts (if using Jest)
 */

import {
  evaluateFreshness,
  detectPriceDrift,
  detectTimestampDrift,
  FRESHNESS_THRESHOLDS,
} from './dataFreshness';

describe('evaluateFreshness', () => {
  it('marks data as fresh when within threshold', () => {
    const now = Date.now();
    const result = evaluateFreshness(now - 10_000, FRESHNESS_THRESHOLDS.COINS_LIST);
    expect(result.isFresh).toBe(true);
    expect(result.staleReason).toBeUndefined();
  });

  it('marks data as stale when exceeding threshold', () => {
    const now = Date.now();
    const result = evaluateFreshness(now - 120_000, FRESHNESS_THRESHOLDS.COINS_LIST);
    expect(result.isFresh).toBe(false);
    expect(result.staleReason).toContain('old');
  });
});

describe('detectPriceDrift', () => {
  it('returns acceptable when drift is small', () => {
    const result = detectPriceDrift(50000, 50050);
    expect(result.acceptable).toBe(true);
    expect(result.driftPercent).toBeLessThan(1);
  });

  it('returns unacceptable when drift is large', () => {
    const result = detectPriceDrift(50000, 52000);
    expect(result.acceptable).toBe(false);
    expect(result.driftPercent).toBeGreaterThan(1);
  });
});

describe('detectTimestampDrift', () => {
  it('returns acceptable when timestamps are close', () => {
    const now = Date.now();
    const result = detectTimestampDrift(now, now - 30_000);
    expect(result.acceptable).toBe(true);
  });

  it('returns unacceptable when timestamps are far apart', () => {
    const now = Date.now();
    const result = detectTimestampDrift(now, now - 300_000);
    expect(result.acceptable).toBe(false);
  });
});
