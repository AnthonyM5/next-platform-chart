'use client';

import { useState, useMemo } from 'react';
import { useCryptoStore } from '../store/cryptoStore';

export default function CryptoTable({ coins, loading, onSelectCoin }) {
  const { favorites, addFavorite, removeFavorite, theme, viewMode } = useCryptoStore();
  const [sortConfig, setSortConfig] = useState({ key: 'market_cap_rank', direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredCoins = useMemo(() => {
    if (!coins) return [];
    
    let filtered = coins;

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter(coin => favorites.includes(coin.id));
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(coin =>
        coin.name.toLowerCase().includes(query) ||
        coin.symbol.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [coins, sortConfig, searchQuery, showFavoritesOnly, favorites]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFavorite = (coinId, e) => {
    e.stopPropagation();
    if (favorites.includes(coinId)) {
      removeFavorite(coinId);
    } else {
      addFavorite(coinId);
    }
  };

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatLargeNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString('en-US')}`;
  };

  if (loading) {
    return (
      <div className="crypto-table-skeleton">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="skeleton-row animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="crypto-grid">
        <div className="search-bar mb-6">
          <input
            type="text"
            placeholder="Search cryptocurrencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`favorites-toggle ${showFavoritesOnly ? 'active' : ''}`}
            title={showFavoritesOnly ? 'Show all coins' : 'Show favorites only'}
          >
            {showFavoritesOnly ? '★' : '☆'} Favorites
          </button>
        </div>
        {showFavoritesOnly && filteredCoins.length === 0 ? (
          <div className="no-favorites-message">
            <span className="star-icon">☆</span>
            <p>No favorites yet!</p>
            <p className="hint">Click the star icon on any coin to add it to your favorites.</p>
          </div>
        ) : (
        <div className="grid-container">
          {filteredCoins.map((coin) => (
            <div
              key={coin.id}
              className="crypto-card"
              onClick={() => onSelectCoin && onSelectCoin(coin.id)}
            >
              <div className="card-header">
                <img src={coin.image} alt={coin.name} className="coin-image" />
                <div className="coin-info">
                  <h3 className="coin-name">{coin.name}</h3>
                  <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
                </div>
                <button
                  onClick={(e) => handleFavorite(coin.id, e)}
                  className="favorite-button"
                  aria-label={favorites.includes(coin.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {favorites.includes(coin.id) ? '★' : '☆'}
                </button>
              </div>
              <div className="card-body">
                <div className="price-row">
                  <span className="label">Price:</span>
                  <span className="value">${formatNumber(coin.current_price)}</span>
                </div>
                <div className="change-row">
                  <span className="label">24h:</span>
                  <span className={`change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                    {coin.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                  </span>
                </div>
                <div className="market-cap-row">
                  <span className="label">Market Cap:</span>
                  <span className="value">{formatLargeNumber(coin.market_cap)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    );
  }

  return (
    <div className="crypto-table-container">
      <div className="search-bar mb-6">
        <input
          type="text"
          placeholder="Search cryptocurrencies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`favorites-toggle ${showFavoritesOnly ? 'active' : ''}`}
          title={showFavoritesOnly ? 'Show all coins' : 'Show favorites only'}
        >
          {showFavoritesOnly ? '★' : '☆'} Favorites
        </button>
      </div>
      {showFavoritesOnly && filteredCoins.length === 0 ? (
        <div className="no-favorites-message">
          <span className="star-icon">☆</span>
          <p>No favorites yet!</p>
          <p className="hint">Click the star icon on any coin to add it to your favorites.</p>
        </div>
      ) : (
      <div className="table-wrapper">
        <table className="crypto-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('market_cap_rank')} className="sortable">
                <div className="th-content">
                  # {sortConfig.key === 'market_cap_rank' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th></th>
              <th onClick={() => handleSort('name')} className="sortable">
                <div className="th-content">
                  Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th onClick={() => handleSort('current_price')} className="sortable text-right">
                <div className="th-content justify-end">
                  Price {sortConfig.key === 'current_price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th onClick={() => handleSort('price_change_percentage_24h')} className="sortable text-right">
                <div className="th-content justify-end">
                  24h % {sortConfig.key === 'price_change_percentage_24h' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th onClick={() => handleSort('market_cap')} className="sortable text-right">
                <div className="th-content justify-end">
                  Market Cap {sortConfig.key === 'market_cap' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th onClick={() => handleSort('total_volume')} className="sortable text-right">
                <div className="th-content justify-end">
                  Volume (24h) {sortConfig.key === 'total_volume' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoins.map((coin) => (
              <tr
                key={coin.id}
                className="table-row"
                onClick={() => onSelectCoin && onSelectCoin(coin.id)}
              >
                <td>{coin.market_cap_rank}</td>
                <td>
                  <button
                    onClick={(e) => handleFavorite(coin.id, e)}
                    className="favorite-button-small"
                    aria-label={favorites.includes(coin.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {favorites.includes(coin.id) ? '★' : '☆'}
                  </button>
                </td>
                <td>
                  <div className="coin-cell">
                    <img src={coin.image} alt={coin.name} className="coin-image-small" />
                    <div className="coin-details">
                      <span className="coin-name-text">{coin.name}</span>
                      <span className="coin-symbol-text">{coin.symbol.toUpperCase()}</span>
                      <span className="coin-price-mobile">${formatNumber(coin.current_price)}</span>
                    </div>
                  </div>
                </td>
                <td className="text-right font-semibold">${formatNumber(coin.current_price)}</td>
                <td className="text-right">
                  <span className={`change-badge ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                    {coin.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                  </span>
                </td>
                <td className="text-right">{formatLargeNumber(coin.market_cap)}</td>
                <td className="text-right">{formatLargeNumber(coin.total_volume)}</td>
                <td className="text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCoin && onSelectCoin(coin.id);
                    }}
                    className="view-button"
                  >
                    View Chart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
