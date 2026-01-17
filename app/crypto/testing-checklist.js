/**
 * Manual Testing Checklist for Crypto Dashboard
 * 
 * Run through this checklist to verify all features work correctly
 */

export const testingChecklist = {
  setup: {
    title: "Initial Setup",
    tests: [
      "✓ npm install completes without errors",
      "✓ npm run dev starts successfully",
      "✓ Navigate to /crypto loads without errors",
      "✓ No console errors on page load",
    ]
  },

  dataLoading: {
    title: "Data Loading & Display",
    tests: [
      "✓ Loading skeletons appear while fetching data",
      "✓ Cryptocurrency list loads (100 coins)",
      "✓ All coin images display correctly",
      "✓ Prices show in correct format ($X,XXX.XX)",
      "✓ 24h percentage changes display with colors",
      "✓ Market cap values formatted correctly",
      "✓ Last update timestamp shows in header",
    ]
  },

  tableView: {
    title: "Table View Functionality",
    tests: [
      "✓ Table displays all columns correctly",
      "✓ Click rank column to sort",
      "✓ Click name column to sort",
      "✓ Click price column to sort",
      "✓ Click 24h % column to sort",
      "✓ Click market cap column to sort",
      "✓ Click volume column to sort",
      "✓ Sort direction indicator shows (↑/↓)",
      "✓ Row hover effect works",
      "✓ Clicking row opens chart",
    ]
  },

  gridView: {
    title: "Grid View Functionality",
    tests: [
      "✓ Toggle to grid view using icon",
      "✓ Cards display in responsive grid",
      "✓ Each card shows coin image, name, symbol",
      "✓ Price, 24h change, market cap visible",
      "✓ Card hover effect works",
      "✓ Clicking card opens chart",
    ]
  },

  search: {
    title: "Search & Filter",
    tests: [
      "✓ Search input appears at top",
      "✓ Typing filters results in real-time",
      "✓ Search by coin name works (e.g., 'Bitcoin')",
      "✓ Search by symbol works (e.g., 'BTC')",
      "✓ Case-insensitive search",
      "✓ Clear search resets results",
      "✓ No results message if no matches",
    ]
  },

  charting: {
    title: "Chart Functionality",
    tests: [
      "✓ Clicking coin opens chart section",
      "✓ Chart loads with loading indicator",
      "✓ Price history displays as line chart",
      "✓ X-axis shows dates/times",
      "✓ Y-axis shows prices with $ symbol",
      "✓ Hover over chart shows tooltip",
      "✓ Tooltip displays price at point",
      "✓ Chart has gradient fill",
      "✓ Chart is responsive",
    ]
  },

  timePeriods: {
    title: "Time Period Selection",
    tests: [
      "✓ Time period selector visible with chart",
      "✓ Default period is 7D",
      "✓ Click 1D button loads 1-day data",
      "✓ Click 7D button loads 7-day data",
      "✓ Click 30D button loads 30-day data",
      "✓ Click 1Y button loads 1-year data",
      "✓ Active period is highlighted",
      "✓ Chart updates when period changes",
      "✓ X-axis labels adjust to period",
    ]
  },

  favorites: {
    title: "Favorites System",
    tests: [
      "✓ Star icon appears next to each coin",
      "✓ Clicking empty star (☆) marks as favorite",
      "✓ Favorite shown with filled star (★)",
      "✓ Clicking filled star removes favorite",
      "✓ Favorites persist after page refresh",
      "✓ Star color is gold/yellow",
      "✓ Star hover effect works",
    ]
  },

  theme: {
    title: "Theme Toggle",
    tests: [
      "✓ Theme toggle button in header",
      "✓ Default theme is dark",
      "✓ Click toggle switches to light mode",
      "✓ All colors update correctly",
      "✓ Chart colors update with theme",
      "✓ Click again switches back to dark",
      "✓ Theme persists after refresh",
      "✓ No flash of unstyled content",
    ]
  },

  autoRefresh: {
    title: "Auto-Refresh",
    tests: [
      "✓ Auto-refresh enabled by default (🔄)",
      "✓ Data refreshes every 30 seconds",
      "✓ Last update timestamp changes",
      "✓ Click button to disable (⏸️)",
      "✓ Refresh stops when disabled",
      "✓ Click to re-enable",
      "✓ Manual refresh button works",
    ]
  },

  export: {
    title: "Data Export",
    tests: [
      "✓ Export button visible in header",
      "✓ Click button triggers download",
      "✓ File downloads as JSON",
      "✓ Filename includes timestamp",
      "✓ JSON contains all coin data",
      "✓ JSON is properly formatted",
    ]
  },

  responsive: {
    title: "Responsive Design",
    tests: [
      "✓ Desktop (>1024px) - all columns visible",
      "✓ Tablet (768-1024px) - layout adjusts",
      "✓ Mobile (640-768px) - fewer columns",
      "✓ Small mobile (<640px) - minimal columns",
      "✓ Header stacks on mobile",
      "✓ Chart remains readable on mobile",
      "✓ Touch interactions work",
      "✓ Grid becomes single column on mobile",
      "✓ No horizontal scrolling",
    ]
  },

  errorHandling: {
    title: "Error Handling",
    tests: [
      "✓ Error boundary catches React errors",
      "✓ API errors show error message",
      "✓ Retry button appears on error",
      "✓ Retry button re-fetches data",
      "✓ Network errors handled gracefully",
      "✓ Rate limit errors show appropriate message",
      "✓ Missing chart data shows 'No data' message",
    ]
  },

  localStorage: {
    title: "Local Storage Persistence",
    tests: [
      "✓ Theme preference saved",
      "✓ Favorites list saved",
      "✓ View mode (table/grid) saved",
      "✓ Time period preference saved",
      "✓ All preferences persist on refresh",
      "✓ Can clear localStorage manually",
    ]
  },

  accessibility: {
    title: "Accessibility",
    tests: [
      "✓ Tab key navigates through elements",
      "✓ Focus indicators visible",
      "✓ Buttons have aria-labels",
      "✓ Images have alt text",
      "✓ Color contrast meets WCAG AA",
      "✓ Screen reader announces changes",
      "✓ Keyboard shortcuts work",
    ]
  },

  performance: {
    title: "Performance",
    tests: [
      "✓ Initial load under 3 seconds",
      "✓ Smooth scrolling",
      "✓ No layout shifts",
      "✓ Chart renders smoothly",
      "✓ No janky animations",
      "✓ Search filters quickly",
      "✓ Sorting is instant",
      "✓ API responses cached",
    ]
  },

  api: {
    title: "API Integration",
    tests: [
      "✓ /crypto/api/coins returns data",
      "✓ /crypto/api/coin-history returns data",
      "✓ /crypto/api/search returns results",
      "✓ Cache headers set correctly",
      "✓ Error responses handled",
      "✓ Rate limiting works",
      "✓ Cached data used when available",
    ]
  },
};

// Run this in browser console to track testing progress
export function trackTesting() {
  let completed = 0;
  let total = 0;

  Object.values(testingChecklist).forEach(section => {
    console.log(`\n${section.title}`);
    console.log('='.repeat(50));
    section.tests.forEach(test => {
      console.log(test);
      total++;
    });
  });

  console.log(`\n\nTotal Tests: ${total}`);
  console.log('Mark each test as complete as you verify it!');
}

// Quick API test
export async function testApis() {
  console.log('Testing APIs...\n');

  try {
    // Test coins endpoint
    console.log('1. Testing /crypto/api/coins...');
    const coinsRes = await fetch('/crypto/api/coins?per_page=10');
    const coinsData = await coinsRes.json();
    console.log('✓ Coins API:', coinsData.data.length, 'coins loaded');

    // Test history endpoint
    console.log('2. Testing /crypto/api/coin-history...');
    const historyRes = await fetch('/crypto/api/coin-history?id=bitcoin&days=7');
    const historyData = await historyRes.json();
    console.log('✓ History API:', historyData.data.prices.length, 'data points');

    // Test search endpoint
    console.log('3. Testing /crypto/api/search...');
    const searchRes = await fetch('/crypto/api/search?q=bitcoin');
    const searchData = await searchRes.json();
    console.log('✓ Search API:', searchData.data.length, 'results');

    console.log('\n✅ All API tests passed!');
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Test localStorage
export function testLocalStorage() {
  console.log('Testing localStorage...\n');

  const keys = [
    'crypto-theme',
    'crypto-favorites',
    'crypto-selected',
    'crypto-period',
    'crypto-currency',
    'crypto-viewmode',
    'crypto-alerts',
  ];

  keys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`${key}:`, value || 'not set');
  });
}

export default {
  testingChecklist,
  trackTesting,
  testApis,
  testLocalStorage,
};
