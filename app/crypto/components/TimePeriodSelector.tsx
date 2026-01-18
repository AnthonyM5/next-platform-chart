'use client';

import { useCryptoStore } from '../store/cryptoStore';
import type { TimePeriod } from '../types';

interface TimePeriodOption {
  value: TimePeriod;
  label: string;
}

const TIME_PERIODS: TimePeriodOption[] = [
  { value: '1', label: '1D' },
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '365', label: '1Y' },
];

export default function TimePeriodSelector() {
  const { timePeriod, setTimePeriod } = useCryptoStore();

  return (
    <div className="time-period-selector">
      {TIME_PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => setTimePeriod(period.value)}
          className={`period-button ${timePeriod === period.value ? 'active' : ''}`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
