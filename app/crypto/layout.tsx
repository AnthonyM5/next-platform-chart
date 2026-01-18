import './crypto-dashboard.css';
import type { ReactNode } from 'react';

interface CryptoLayoutProps {
  children: ReactNode;
}

export default function CryptoLayout({ children }: CryptoLayoutProps) {
  return children;
}
