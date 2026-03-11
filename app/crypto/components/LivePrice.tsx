'use client';

import { useRef, useEffect } from 'react';

interface LivePriceProps {
  price: number;
  showDirection?: boolean;
  className?: string;
}

function formatPrice(price: number): string {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function LivePrice({ price, showDirection = true, className = '' }: LivePriceProps) {
  const prevPriceRef = useRef(price);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (price === prevPriceRef.current || !spanRef.current) return;

    const isUp = price > prevPriceRef.current;
    prevPriceRef.current = price;

    const el = spanRef.current;

    if (showDirection) {
      el.dataset.direction = isUp ? 'up' : 'down';
    }

    // Restart flash animation: remove → force reflow → add
    el.classList.remove('price-flash-up', 'price-flash-down');
    void el.offsetWidth;
    el.classList.add(isUp ? 'price-flash-up' : 'price-flash-down');

    const timer = setTimeout(() => {
      el.classList.remove('price-flash-up', 'price-flash-down');
      delete el.dataset.direction;
    }, 800);

    return () => clearTimeout(timer);
  }, [price, showDirection]);

  return (
    <span ref={spanRef} className={`live-price ${className}`}>
      ${formatPrice(price)}
    </span>
  );
}
