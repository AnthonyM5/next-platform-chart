import '../styles/globals.css';
import './crypto/crypto-dashboard.css';

export const metadata = {
    title: 'Crypto Dashboard - Real-time Cryptocurrency Tracking',
    description: 'Track cryptocurrency prices, market caps, and price changes in real-time with interactive charts and data visualization.',
};

export default function RootLayout({ children }) {
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
