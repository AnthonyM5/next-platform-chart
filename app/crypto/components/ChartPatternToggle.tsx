'use client';

import { useCryptoStore } from '../store/cryptoStore';
import type { ChartPattern } from '../types';

export default function ChartPatternToggle() {
  const { chartPattern, setChartPattern } = useCryptoStore();

  const patterns: { value: ChartPattern; label: string; icon: string }[] = [
    { value: 'line', label: 'Line', icon: '📈' },
    { value: 'candlestick', label: 'Candles', icon: '🕯️' },
  ];

  return (
    <div className="chart-pattern-toggle">
      {patterns.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => setChartPattern(value)}
          className={`pattern-btn ${chartPattern === value ? 'active' : ''}`}
          title={`${label} chart`}
          aria-pressed={chartPattern === value}
        >
          <span className="pattern-icon">{icon}</span>
          <span className="pattern-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
