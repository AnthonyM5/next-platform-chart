'use client';

import { create } from 'zustand';

// Create store without persist middleware initially to avoid SSR issues
export const useCryptoStore = create((set, get) => ({
  // Theme
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-theme', newTheme);
    }
    return { theme: newTheme };
  }),

  // Favorites
  favorites: [],
  addFavorite: (coinId) => set((state) => {
    const newFavorites = [...new Set([...state.favorites, coinId])];
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-favorites', JSON.stringify(newFavorites));
    }
    return { favorites: newFavorites };
  }),
  removeFavorite: (coinId) => set((state) => {
    const newFavorites = state.favorites.filter(id => id !== coinId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-favorites', JSON.stringify(newFavorites));
    }
    return { favorites: newFavorites };
  }),
  isFavorite: (coinId) => get().favorites.includes(coinId),

  // Selected coins for comparison
  selectedCoins: ['bitcoin', 'ethereum'],
  addSelectedCoin: (coinId) => set((state) => {
    const newSelected = [...new Set([...state.selectedCoins, coinId])];
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-selected', JSON.stringify(newSelected));
    }
    return { selectedCoins: newSelected };
  }),
  removeSelectedCoin: (coinId) => set((state) => {
    const newSelected = state.selectedCoins.filter(id => id !== coinId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-selected', JSON.stringify(newSelected));
    }
    return { selectedCoins: newSelected };
  }),

  // Time period
  timePeriod: '7',
  setTimePeriod: (period) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-period', period);
    }
    return { timePeriod: period };
  }),

  // Currency
  currency: 'usd',
  setCurrency: (curr) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-currency', curr);
    }
    return { currency: curr };
  }),

  // View mode
  viewMode: 'table', // 'table' or 'grid'
  setViewMode: (mode) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-viewmode', mode);
    }
    return { viewMode: mode };
  }),

  // Notifications
  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: Date.now() }]
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  // Price alerts
  priceAlerts: {},
  setPriceAlert: (coinId, threshold) => set((state) => {
    const newAlerts = { ...state.priceAlerts, [coinId]: threshold };
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-alerts', JSON.stringify(newAlerts));
    }
    return { priceAlerts: newAlerts };
  }),
  removePriceAlert: (coinId) => set((state) => {
    const alerts = { ...state.priceAlerts };
    delete alerts[coinId];
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-alerts', JSON.stringify(alerts));
    }
    return { priceAlerts: alerts };
  }),

  // Initialize from localStorage
  initFromStorage: () => {
    if (typeof window !== 'undefined') {
      const theme = localStorage.getItem('crypto-theme') || 'dark';
      const favorites = JSON.parse(localStorage.getItem('crypto-favorites') || '[]');
      const selectedCoins = JSON.parse(localStorage.getItem('crypto-selected') || '["bitcoin","ethereum"]');
      const timePeriod = localStorage.getItem('crypto-period') || '7';
      const currency = localStorage.getItem('crypto-currency') || 'usd';
      const viewMode = localStorage.getItem('crypto-viewmode') || 'table';
      const priceAlerts = JSON.parse(localStorage.getItem('crypto-alerts') || '{}');

      set({
        theme,
        favorites,
        selectedCoins,
        timePeriod,
        currency,
        viewMode,
        priceAlerts,
      });
    }
  },
}));
