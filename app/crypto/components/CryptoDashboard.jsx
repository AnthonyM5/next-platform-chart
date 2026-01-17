'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCryptoStore } from '../store/cryptoStore';
import CryptoTable from './CryptoTable';
import CryptoChart from './CryptoChart';
import ThemeToggle from './ThemeToggle';
import TimePeriodSelector from './TimePeriodSelector';
import ViewModeToggle from './ViewModeToggle';
import ErrorBoundary from './ErrorBoundary';
import LoadingSkeleton from './LoadingSkeleton';

export default function CryptoDashboard() {
  const { timePeriod, currency, selectedCoins, addNotification, theme, initFromStorage } = useCryptoStore();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mounted, setMounted] = useState(false);

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
      
      // Check for price alerts
      result.data.forEach(coin => {
        // Price alert logic would go here
      });
    } catch (err) {
      setError(err.message);
      addNotification({
        type: 'error',
        message: `Failed to fetch data: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  }, [currency, addNotification]);

  // Fetch chart data for selected coin
  const fetchChartData = useCallback(async (coinId) => {
    try {
      setChartLoading(true);
      
      const response = await fetch(`/crypto/api/coin-history?id=${coinId}&days=${timePeriod}&vs_currency=${currency}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      const result = await response.json();
      setChartData(result.data);
      setSelectedCoin(coinId);
    } catch (err) {
      addNotification({
        type: 'error',
        message: `Failed to fetch chart data: ${err.message}`,
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

  // Refetch chart when time period changes
  useEffect(() => {
    if (selectedCoin) {
      fetchChartData(selectedCoin);
    }
  }, [timePeriod, selectedCoin, fetchChartData]);

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

  const handleSelectCoin = (coinId) => {
    if (selectedCoin === coinId) {
      setSelectedCoin(null);
      setChartData(null);
    } else {
      fetchChartData(coinId);
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
              {lastUpdate && (
                <p className="last-update">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
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
            <section className="chart-section">
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
                          <span className={`change ${selectedCoinData.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                            {selectedCoinData.price_change_percentage_24h >= 0 ? '▲' : '▼'} 
                            {Math.abs(selectedCoinData.price_change_percentage_24h).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="chart-controls">
                  <TimePeriodSelector />
                  <button
                    onClick={() => {
                      setSelectedCoin(null);
                      setChartData(null);
                    }}
                    className="close-chart-button"
                    aria-label="Close chart"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <CryptoChart coinData={chartData} loading={chartLoading} />
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
