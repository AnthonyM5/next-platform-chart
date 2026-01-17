'use client';

export default function LoadingSkeleton({ type = 'table' }) {
  if (type === 'chart') {
    return (
      <div className="chart-skeleton animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-[400px] bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="card-skeleton animate-pulse">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="table-skeleton animate-pulse">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        </div>
      ))}
    </div>
  );
}
