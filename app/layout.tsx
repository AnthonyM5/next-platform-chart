import '../styles/globals.css';
import './crypto/crypto-dashboard.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Crypto Dashboard - Real-time Cryptocurrency Tracking',
    description: 'Track cryptocurrency prices, market caps, and price changes in real-time with interactive charts and data visualization.',
};

interface RootLayoutProps {
    children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/favicon.svg" sizes="any" />
            </head>
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
