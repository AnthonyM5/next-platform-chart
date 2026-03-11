/**
 * Unit tests for technical indicator calculation functions.
 *
 * These are pure functions with no React dependencies, so they can be tested
 * directly with simple numeric arrays.
 */

import { describe, expect, it } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateMACD,
  calculateBollingerBands,
} from './indicators';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an ascending price series starting at `start` with `count` elements. */
function ascendingSeries(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => start + i);
}

/** Build a constant price series. */
function flatSeries(value: number, count: number): number[] {
  return Array.from({ length: count }, () => value);
}

// ---------------------------------------------------------------------------
// calculateSMA
// ---------------------------------------------------------------------------

describe('calculateSMA', () => {
  it('returns an array the same length as the input', () => {
    const data = ascendingSeries(1, 10);
    expect(calculateSMA(data, 3)).toHaveLength(10);
  });

  it('fills the first (period - 1) positions with null', () => {
    const result = calculateSMA(ascendingSeries(1, 10), 4);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull();
    expect(result[3]).not.toBeNull();
  });

  it('computes the correct simple average', () => {
    // data: [1, 2, 3, 4, 5] — SMA(3)
    // SMA at index 2 = (1+2+3)/3 = 2
    // SMA at index 3 = (2+3+4)/3 = 3
    // SMA at index 4 = (3+4+5)/3 = 4
    const result = calculateSMA([1, 2, 3, 4, 5], 3);
    expect(result[2]).toBeCloseTo(2);
    expect(result[3]).toBeCloseTo(3);
    expect(result[4]).toBeCloseTo(4);
  });

  it('returns all nulls when period exceeds data length', () => {
    const result = calculateSMA([1, 2, 3], 5);
    expect(result.every((v) => v === null)).toBe(true);
  });

  it('returns a single value for period === data length', () => {
    const result = calculateSMA([2, 4, 6], 3);
    const nonNull = result.filter((v) => v !== null);
    expect(nonNull).toHaveLength(1);
    expect(nonNull[0]).toBeCloseTo(4);
  });

  it('is constant for a flat series', () => {
    const result = calculateSMA(flatSeries(100, 20), 5);
    const nonNull = result.filter((v) => v !== null);
    nonNull.forEach((v) => expect(v).toBeCloseTo(100));
  });
});

// ---------------------------------------------------------------------------
// calculateEMA
// ---------------------------------------------------------------------------

describe('calculateEMA', () => {
  it('returns an array the same length as the input', () => {
    expect(calculateEMA(ascendingSeries(1, 10), 3)).toHaveLength(10);
  });

  it('fills the first (period - 1) positions with null', () => {
    const result = calculateEMA(ascendingSeries(1, 10), 4);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull();
    expect(result[3]).not.toBeNull();
  });

  it('first non-null value equals the SMA of the first period', () => {
    // data: [1, 2, 3, 4, 5], period: 3
    // first EMA = SMA(1,2,3) = 2
    const result = calculateEMA([1, 2, 3, 4, 5], 3);
    expect(result[2]).toBeCloseTo(2);
  });

  it('is constant for a flat series (EMA = constant price)', () => {
    const result = calculateEMA(flatSeries(50, 20), 5);
    const nonNull = result.filter((v) => v !== null) as number[];
    nonNull.forEach((v) => expect(v).toBeCloseTo(50));
  });

  it('returns all nulls when data length < period', () => {
    const result = calculateEMA([10, 20], 5);
    expect(result.every((v) => v === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateMACD
// ---------------------------------------------------------------------------

describe('calculateMACD', () => {
  const longData = ascendingSeries(1, 50);

  it('returns macdLine, signalLine, and histogram of the same length as input', () => {
    const { macdLine, signalLine, histogram } = calculateMACD(longData, 12, 26, 9);
    expect(macdLine).toHaveLength(longData.length);
    expect(signalLine).toHaveLength(longData.length);
    expect(histogram).toHaveLength(longData.length);
  });

  it('histogram = macdLine - signalLine for non-null entries', () => {
    const { macdLine, signalLine, histogram } = calculateMACD(longData, 12, 26, 9);
    for (let i = 0; i < histogram.length; i++) {
      const m = macdLine[i];
      const s = signalLine[i];
      const h = histogram[i];
      if (m !== null && s !== null && h !== null) {
        expect(h).toBeCloseTo(m - s, 8);
      }
    }
  });

  it('macdLine is null for the first (slowPeriod - 1) values', () => {
    const { macdLine } = calculateMACD(longData, 12, 26, 9);
    for (let i = 0; i < 25; i++) {
      expect(macdLine[i]).toBeNull();
    }
  });

  it('signalLine is null until enough MACD values exist', () => {
    const { signalLine } = calculateMACD(longData, 12, 26, 9);
    // First non-null signalLine index: slowPeriod-1 + signalPeriod-1 = 25+8 = 33
    for (let i = 0; i < 33; i++) {
      expect(signalLine[i]).toBeNull();
    }
    expect(signalLine[33]).not.toBeNull();
  });

  it('returns all nulls for short data (< slowPeriod)', () => {
    const { macdLine, signalLine, histogram } = calculateMACD([1, 2, 3], 12, 26, 9);
    expect(macdLine.every((v) => v === null)).toBe(true);
    expect(signalLine.every((v) => v === null)).toBe(true);
    expect(histogram.every((v) => v === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateBollingerBands
// ---------------------------------------------------------------------------

describe('calculateBollingerBands', () => {
  const data = ascendingSeries(1, 30);

  it('returns upper, middle, lower arrays each the same length as input', () => {
    const { upper, middle, lower } = calculateBollingerBands(data, 20, 2);
    expect(upper).toHaveLength(data.length);
    expect(middle).toHaveLength(data.length);
    expect(lower).toHaveLength(data.length);
  });

  it('upper >= middle >= lower for all non-null values', () => {
    const { upper, middle, lower } = calculateBollingerBands(data, 20, 2);
    for (let i = 0; i < data.length; i++) {
      const u = upper[i];
      const m = middle[i];
      const l = lower[i];
      if (u !== null && m !== null && l !== null) {
        expect(u).toBeGreaterThanOrEqual(m);
        expect(m).toBeGreaterThanOrEqual(l);
      }
    }
  });

  it('bands are equidistant from the middle (symmetric around SMA)', () => {
    const { upper, middle, lower } = calculateBollingerBands(data, 5, 2);
    for (let i = 0; i < data.length; i++) {
      const u = upper[i];
      const m = middle[i];
      const l = lower[i];
      if (u !== null && m !== null && l !== null) {
        expect(u - m).toBeCloseTo(m - l, 8);
      }
    }
  });

  it('bands collapse to the middle for a completely flat series (stdDev = 0)', () => {
    const flat = flatSeries(100, 30);
    const { upper, middle, lower } = calculateBollingerBands(flat, 5, 2);
    const nonNull = upper.filter((v) => v !== null) as number[];
    nonNull.forEach((v) => expect(v).toBeCloseTo(100));
    (lower.filter((v) => v !== null) as number[]).forEach((v) => expect(v).toBeCloseTo(100));
    (middle.filter((v) => v !== null) as number[]).forEach((v) => expect(v).toBeCloseTo(100));
  });

  it('first (period - 1) values are null', () => {
    const { middle } = calculateBollingerBands(data, 20, 2);
    for (let i = 0; i < 19; i++) {
      expect(middle[i]).toBeNull();
    }
    expect(middle[19]).not.toBeNull();
  });

  it('wider stdDev multiplier produces wider bands', () => {
    const { upper: u2, lower: l2 } = calculateBollingerBands(data, 5, 2);
    const { upper: u3, lower: l3 } = calculateBollingerBands(data, 5, 3);
    const i = 10; // first non-null for period=5
    if (u2[i] !== null && u3[i] !== null && l2[i] !== null && l3[i] !== null) {
      expect(u3[i]!).toBeGreaterThan(u2[i]!);
      expect(l3[i]!).toBeLessThan(l2[i]!);
    }
  });
});
