'use client';

import { useRef, useEffect } from 'react';
import { useCryptoStore } from '../store/cryptoStore';

interface LivePriceProps {
  coinId: string;
  fallbackPrice: number;
  showDirection?: boolean;
  className?: string;
}

function formatPrice(price: number): string {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function LivePrice({ coinId, fallbackPrice, showDirection = true, className = '' }: LivePriceProps) {
  const livePrice = useCryptoStore((state) => state.rtPrices[coinId] ?? fallbackPrice);
  const prevPriceRef = useRef(livePrice);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (livePrice === prevPriceRef.current || !spanRef.current) return;

    const isUp = livePrice > prevPriceRef.current;
    prevPriceRef.current = livePrice;

    const el = spanRef.current;

    // Update direction indicator via data attribute (CSS-driven, no React state)
    if (showDirection) {
      el.dataset.direction = isUp ? 'up' : 'down';
    }

    // Restart flash animation: remove → force reflow → add
    el.classList.remove('price-flash-up', 'price-flash-down');
    void el.offsetWidth; // trigger reflow so animation restarts
    el.classList.add(isUp ? 'price-flash-up' : 'price-flash-down');

    const timer = setTimeout(() => {
      el.classList.remove('price-flash-up', 'price-flash-down');
      delete el.dataset.direction;
    }, 800);

    return () => clearTimeout(timer);
  }, [livePrice, showDirection]);

  return (
    <span ref={spanRef} className={`live-price ${className}`}>
      ${formatPrice(livePrice)}
    </span>
  );
}
