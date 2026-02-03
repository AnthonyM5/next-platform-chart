'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import CryptoTable from './CryptoTable';
import CryptoChart from './CryptoChart';
import CandlestickChart from './CandlestickChart';
import ChartPatternToggle from './ChartPatternToggle';
import ThemeToggle from './ThemeToggle';
import TimePeriodSelector from './TimePeriodSelector';
import ViewModeToggle from './ViewModeToggle';
import StudiesDropdown from './StudiesDropdown';
import ErrorBoundary from './ErrorBoundary';
import FreshnessIndicator from './FreshnessIndicator';
import type { Coin, ChartData, OHLCData } from '../types';

export default function CryptoDashboard() {
  const { timePeriod, currency, chartPattern, addNotification, initFromStorage } = useCryptoStore();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [ohlcData, setOhlcData] = useState<OHLCData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [listFetchedAt, setListFetchedAt] = useState<number | null>(null);
  const [chartFetchedAt, setChartFetchedAt] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mounted, setMounted] = useState(false);
  const chartSectionRef = useRef<HTMLElement>(null);

  // Initialize from storage on mount
  useEffect(() => {
    initFromStorage();
    setMounted(true);
  }, [initFromStorage]);

  // Fetch coin list
  const fetchCoins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/crypto/api/coins?vs_currency=${currency}&per_page=100`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch cryptocurrency data');
      }

      const result = await response.json();
      setCoins(result.data);
      setLastUpdate(new Date());
      setListFetchedAt(result.fetchedAt ?? Date.now());
      
      // Check for price alerts
      result.data.forEach((coin: Coin) => {
        // Price alert logic would go here
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: `Failed to fetch data: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  }, [currency, addNotification]);

  // Fetch chart data for selected coin
  const fetchChartData = useCallback(async (coinId: string) => {
    try {
      setChartLoading(true);
      
      const response = await fetch(`/crypto/api/coin-history?id=${coinId}&days=${timePeriod}&vs_currency=${currency}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const result = await response.json();
      setChartData(result.data);
      setChartFetchedAt(result.fetchedAt ?? Date.now());
      setSelectedCoin(coinId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      addNotification({
        type: 'error',
        message: `Failed to fetch chart data: ${errorMessage}`,
      });
    } finally {
      setChartLoading(false);
    }
  }, [timePeriod, currency, addNotification]);

  // Fetch OHLC data for candlestick chart
  const fetchOhlcData = useCallback(async (coinId: string) => {
    try {
      setChartLoading(true);
      
      const response = await fetch(`/crypto/api/ohlc?id=${coinId}&days=${timePeriod}&vs_currency=${currency}&provider=auto`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch OHLC data');
      }

      const result = await response.json();
      setOhlcData(result.data);
      setChartFetchedAt(result.fetchedAt ?? Date.now());
      setSelectedCoin(coinId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      addNotification({
        type: 'error',
        message: `Failed to fetch OHLC data: ${errorMessage}`,
      });
    } finally {
      setChartLoading(false);
    }
  }, [timePeriod, currency, addNotification]);

  // Initial fetch
  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchCoins();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchCoins, autoRefresh]);

  // Refetch chart when time period or chart pattern changes
  useEffect(() => {
    if (selectedCoin) {
      if (chartPattern === 'candlestick') {
        fetchOhlcData(selectedCoin);
      } else {
        fetchChartData(selectedCoin);
      }
    }
  }, [timePeriod, chartPattern, selectedCoin, fetchChartData, fetchOhlcData]);

  // Export data functionality
  const exportData = () => {
    try {
      const dataStr = JSON.stringify(coins, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crypto-data-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: 'Data exported successfully',
      });
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Failed to export data',
      });
    }
  };

  const handleSelectCoin = (coinId: string) => {
    if (selectedCoin === coinId) {
      setSelectedCoin(null);
      setChartData(null);
      setOhlcData(null);
    } else {
      if (chartPattern === 'candlestick') {
        fetchOhlcData(coinId);
      } else {
        fetchChartData(coinId);
      }
      // Scroll to chart after a short delay to allow render
      setTimeout(() => {
        chartSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const selectedCoinData = coins.find(c => c.id === selectedCoin);

  return (
    <ErrorBoundary>
      <div className="crypto-dashboard">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="dashboard-title">
                <span className="title-icon">₿</span>
                Crypto Dashboard
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {lastUpdate && (
                  <p className="last-update">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </p>
                )}
                <FreshnessIndicator
                  listFetchedAt={listFetchedAt}
                  chartFetchedAt={chartFetchedAt}
                  listPrice={selectedCoinData?.current_price}
                  chartLatestPrice={chartData?.prices?.length ? chartData.prices[chartData.prices.length - 1][1] : undefined}
                />
              </div>
            </div>
            <div className="header-right">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`refresh-toggle ${autoRefresh ? 'active' : ''}`}
                title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
              >
                {autoRefresh ? '🔄' : '⏸️'}
              </button>
              <button
                onClick={exportData}
                className="export-button"
                title="Export data"
              >
                📥 Export
              </button>
              <ViewModeToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-main">
          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={fetchCoins} className="retry-button">
                Retry
              </button>
            </div>
          )}

          {/* Chart Section */}
          {selectedCoin && (
            <section className="chart-section" ref={chartSectionRef}>
              <div className="chart-header">
                <div className="chart-title-area">
                  {selectedCoinData && (
                    <div className="selected-coin-info">
                      <img 
                        src={selectedCoinData.image} 
                        alt={selectedCoinData.name} 
                        className="selected-coin-image"
                      />
                      <div>
                        <h2 className="selected-coin-name">{selectedCoinData.name}</h2>
                        <div className="selected-coin-price">
                          <span className="price">${selectedCoinData.current_price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="chart-controls">
                  <ChartPatternToggle />
                  <StudiesDropdown />
                  <TimePeriodSelector />
                  <button
                    onClick={() => {
                      setSelectedCoin(null);
                      setChartData(null);
                      setOhlcData(null);
                    }}
                    className="close-chart-button"
                    aria-label="Close chart"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {chartPattern === 'candlestick' ? (
                <CandlestickChart ohlcData={ohlcData} loading={chartLoading} />
              ) : (
                <CryptoChart coinData={chartData} loading={chartLoading} />
              )}
            </section>
          )}

          {/* Table Section */}
          <section className="table-section">
            <div className="section-header">
              <h2 className="section-title">Market Overview</h2>
              <button
                onClick={fetchCoins}
                className="refresh-button"
                disabled={loading}
              >
                {loading ? '⏳' : '🔄'} Refresh
              </button>
            </div>
            <CryptoTable
              coins={coins}
              loading={loading}
              onSelectCoin={handleSelectCoin}
            />
          </section>
        </main>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>Data provided by CoinGecko API</p>
          <p>
            <a 
              href="https://www.coingecko.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              Visit CoinGecko
            </a>
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
