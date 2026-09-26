import { useEffect, useState } from 'react';
import { api } from '../api/client';

const CARDS = [
  { key: 'total_customer_dues', label: 'Total Customer Dues', format: 'currency' },
  { key: 'customers_with_due', label: 'Customers with Due' },
  { key: 'today_sales_amount', label: "Today's Sales", format: 'currency' },
  { key: 'today_purchases_amount', label: "Today's Purchases", format: 'currency' },
  { key: 'stock_items_tracked', label: 'Items Tracked' },
  { key: 'pending_reminders', label: 'Pending Reminders' },
];

function format(value, kind) {
  if (kind === 'currency') return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  return value;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/summary')
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Dashboard</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!summary && !error && <p className="text-sm text-slate-400">Loading…</p>}

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div key={card.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">
                {format(summary[card.key], card.format)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
