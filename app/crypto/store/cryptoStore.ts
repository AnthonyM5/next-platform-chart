'use client';

import { create } from 'zustand';
import type { Theme, TimePeriod, Currency, ViewMode, Notification, PriceAlerts, EnabledStudies, StudyType } from '../types';

interface CryptoState {
  // Theme
  theme: Theme;
  toggleTheme: () => void;

  // Favorites
  favorites: string[];
  addFavorite: (coinId: string) => void;
  removeFavorite: (coinId: string) => void;
  isFavorite: (coinId: string) => boolean;

  // Selected coins for comparison
  selectedCoins: string[];
  addSelectedCoin: (coinId: string) => void;
  removeSelectedCoin: (coinId: string) => void;

  // Time period
  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;

  // Currency
  currency: Currency;
  setCurrency: (currency: Currency) => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Technical Studies
  enabledStudies: EnabledStudies;
  toggleStudy: (study: StudyType) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: number) => void;

  // Price alerts
  priceAlerts: PriceAlerts;
  setPriceAlert: (coinId: string, threshold: number) => void;
  removePriceAlert: (coinId: string) => void;

  // Initialize from localStorage
  initFromStorage: () => void;
}

// Create store without persist middleware initially to avoid SSR issues
export const useCryptoStore = create<CryptoState>((set, get) => ({
  // Theme
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const newTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-theme', newTheme);
    }
    return { theme: newTheme };
  }),

  // Favorites
  favorites: [],
  addFavorite: (coinId: string) => set((state) => {
    const newFavorites = [...new Set([...state.favorites, coinId])];
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-favorites', JSON.stringify(newFavorites));
    }
    return { favorites: newFavorites };
  }),
  removeFavorite: (coinId: string) => set((state) => {
    const newFavorites = state.favorites.filter(id => id !== coinId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-favorites', JSON.stringify(newFavorites));
    }
    return { favorites: newFavorites };
  }),
  isFavorite: (coinId: string) => get().favorites.includes(coinId),

  // Selected coins for comparison
  selectedCoins: ['bitcoin', 'ethereum'],
  addSelectedCoin: (coinId: string) => set((state) => {
    const newSelected = [...new Set([...state.selectedCoins, coinId])];
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-selected', JSON.stringify(newSelected));
    }
    return { selectedCoins: newSelected };
  }),
  removeSelectedCoin: (coinId: string) => set((state) => {
    const newSelected = state.selectedCoins.filter(id => id !== coinId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-selected', JSON.stringify(newSelected));
    }
    return { selectedCoins: newSelected };
  }),

  // Time period
  timePeriod: '7',
  setTimePeriod: (period: TimePeriod) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-period', period);
    }
    return { timePeriod: period };
  }),

  // Currency
  currency: 'usd',
  setCurrency: (curr: Currency) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-currency', curr);
    }
    return { currency: curr };
  }),

  // View mode
  viewMode: 'table',
  setViewMode: (mode: ViewMode) => set(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-viewmode', mode);
    }
    return { viewMode: mode };
  }),

  // Technical Studies
  enabledStudies: {
    rsi: true,
    sma: false,
    bollingerBands: false,
    macd: false,
  },
  toggleStudy: (study: StudyType) => set((state) => {
    const newStudies = {
      ...state.enabledStudies,
      [study]: !state.enabledStudies[study],
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-studies', JSON.stringify(newStudies));
    }
    return { enabledStudies: newStudies };
  }),

  // Notifications
  notifications: [],
  addNotification: (notification: Omit<Notification, 'id'>) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: Date.now() }]
  })),
  removeNotification: (id: number) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  // Price alerts
  priceAlerts: {},
  setPriceAlert: (coinId: string, threshold: number) => set((state) => {
    const newAlerts = { ...state.priceAlerts, [coinId]: threshold };
    if (typeof window !== 'undefined') {
      localStorage.setItem('crypto-alerts', JSON.stringify(newAlerts));
    }
    return { priceAlerts: newAlerts };
  }),
  removePriceAlert: (coinId: string) => set((state) => {
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
      const theme = (localStorage.getItem('crypto-theme') as Theme) || 'dark';
      const favorites: string[] = JSON.parse(localStorage.getItem('crypto-favorites') || '[]');
      const selectedCoins: string[] = JSON.parse(localStorage.getItem('crypto-selected') || '["bitcoin","ethereum"]');
      const timePeriod = (localStorage.getItem('crypto-period') as TimePeriod) || '7';
      const currency = (localStorage.getItem('crypto-currency') as Currency) || 'usd';
      const viewMode = (localStorage.getItem('crypto-viewmode') as ViewMode) || 'table';
      const priceAlerts: PriceAlerts = JSON.parse(localStorage.getItem('crypto-alerts') || '{}');
      const enabledStudies: EnabledStudies = JSON.parse(
        localStorage.getItem('crypto-studies') || 
        '{"rsi":true,"sma":false,"bollingerBands":false,"macd":false}'
      );

      set({
        theme,
        favorites,
        selectedCoins,
        timePeriod,
        currency,
        viewMode,
        priceAlerts,
        enabledStudies,
      });
    }
  },
}));
