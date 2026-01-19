// Cryptocurrency data types from CoinGecko API

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: {
    times: number;
    currency: string;
    percentage: number;
  } | null;
  last_updated: string;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
}

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface ChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface ApiResponse<T> {
  data: T;
  cached: boolean;
  stale?: boolean;
  timestamp: number;
}

export interface ApiError {
  error: string;
  message: string;
}

// Time period options
export type TimePeriod = '1' | '7' | '30' | '365';

// Currency options
export type Currency = 'usd' | 'eur' | 'gbp' | 'jpy';

// View mode options
export type ViewMode = 'table' | 'grid';

// Theme options
export type Theme = 'light' | 'dark';

// Notification types
export interface Notification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// Price alerts
export interface PriceAlerts {
  [coinId: string]: number;
}

// RSI configuration
export interface RSIConfig {
  period: number;
  description: string;
  rationale: string;
}

export interface RSIConfigMap {
  [key: string]: RSIConfig;
  default: RSIConfig;
}

// Technical indicator info
export interface IndicatorInfo {
  title: string;
  description: string;
  levels?: {
    overbought?: string;
    oversold?: string;
    neutral?: string;
  };
  source: string;
}

// Technical Studies Configuration
export type StudyType = 'rsi' | 'sma' | 'bollingerBands' | 'macd';

export interface EnabledStudies {
  rsi: boolean;
  sma: boolean;
  bollingerBands: boolean;
  macd: boolean;
}

// SMA Configuration per timeframe
export interface SMAConfig {
  shortPeriod: number;
  longPeriod: number;
  description: string;
}

export interface SMAConfigMap {
  [key: string]: SMAConfig;
}

// MACD Configuration
export interface MACDConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  description: string;
}

export interface MACDConfigMap {
  [key: string]: MACDConfig;
}

// Bollinger Bands Configuration
export interface BollingerConfig {
  period: number;
  stdDev: number;
  description: string;
}

export interface BollingerConfigMap {
  [key: string]: BollingerConfig;
}

// MACD Data
export interface MACDData {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

// Bollinger Bands Data
export interface BollingerBandsData {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

// Sort configuration for tables
export interface SortConfig {
  key: keyof Coin;
  direction: 'asc' | 'desc';
}

// Chart.js related types
export interface ChartDataset {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  pointHoverBackgroundColor?: string;
  borderWidth?: number;
}

// Component props types
export interface CryptoTableProps {
  coins: Coin[];
  loading: boolean;
  onSelectCoin?: (coinId: string) => void;
}

export interface CryptoChartProps {
  coinData: ChartData | null;
  loading: boolean;
}

export interface LoadingSkeletonProps {
  type?: 'table' | 'chart' | 'card';
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
