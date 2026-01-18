import CryptoDashboard from './components/CryptoDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crypto Dashboard - Real-time Cryptocurrency Tracking',
  description: 'Track cryptocurrency prices, market caps, and price changes in real-time with interactive charts and data visualization.',
};

export default function CryptoPage() {
  return <CryptoDashboard />;
}
