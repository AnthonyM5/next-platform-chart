'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { format } from 'date-fns';
import { useCryptoStore } from '../store/cryptoStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function CryptoChart({ coinData, loading }) {
  const { theme } = useCryptoStore();
  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className="chart-skeleton">
        <div className="animate-pulse">
          <div className="h-[400px] bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!coinData || !coinData.prices || coinData.prices.length === 0) {
    return (
      <div className="chart-empty">
        <p>No chart data available</p>
      </div>
    );
  }

  const prices = coinData.prices.map(([timestamp, price]) => ({
    x: timestamp,
    y: price,
  }));

  const labels = coinData.prices.map(([timestamp]) => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, HH:mm');
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Price',
        data: prices.map(p => p.y),
        borderColor: isDark ? 'rgb(99, 102, 241)' : 'rgb(79, 70, 229)',
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: isDark ? 'rgb(99, 102, 241)' : 'rgb(79, 70, 229)',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#000',
        bodyColor: isDark ? '#fff' : '#000',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          maxTicksLimit: 8,
          autoSkip: true,
        },
      },
      y: {
        display: true,
        grid: {
          color: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          callback: function(value) {
            return '$' + value.toLocaleString('en-US');
          },
        },
      },
    },
  };

  return (
    <div className="crypto-chart">
      <div className="h-[400px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
