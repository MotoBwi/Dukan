import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const inr = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const selectClass =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function ProfitText({ value, strong = false }) {
  const n = Number(value);
  const weight = strong ? 'font-semibold' : '';
  if (n > 0) return <span className={`${weight} text-green-700`}>{inr(n)}</span>;
  if (n < 0) return <span className={`${weight} text-red-600`}>−{inr(Math.abs(n))}</span>;
  return <span className="text-slate-500">{inr(0)}</span>;
}

function StatCard({ label, value, hint, tone = 'text-slate-800' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Totals({ t }) {
  const profit = Number(t.profit);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Total Purchase" value={inr(t.purchases)} hint="Maal kharida (cost)" />
      <StatCard label="Total Sales" value={inr(t.sales)} hint="Maal becha (gross)" />
      <StatCard label="Returns" value={inr(t.returns)} hint="Customer ne wapas kiya" />
      <StatCard label="Revenue" value={inr(t.revenue)} hint="Sales − Returns" />
      <StatCard
        label={profit < 0 ? 'Loss' : 'Profit'}
        value={profit < 0 ? `−${inr(Math.abs(profit))}` : inr(profit)}
        hint="Revenue − Purchase"
        tone={profit < 0 ? 'text-red-600' : 'text-green-700'}
      />
      <StatCard label="Amount Received" value={inr(t.received)} hint="Bill ke saath mila + recovery" />
      <StatCard label="Pending Due" value={inr(t.pending)} hint="Abhi bhi baaki (in sales par)" tone="text-amber-600" />
    </div>
  );
}

function BarChart({ rows, getLabel }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.purchases, r.revenue]));
  const rowH = 30;
  const labelW = 64;
  const chartW = 520;
  const height = rows.length * rowH + 8;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" /> Purchase
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Revenue (Sales − Returns)
        </span>
      </div>
      <svg viewBox={`0 0 ${labelW + chartW + 10} ${height}`} className="w-full" role="img" aria-label="Purchase and revenue by period">
        {rows.map((r, i) => {
          const y = i * rowH + 4;
          return (
            <g key={r.period}>
              <text x="0" y={y + 15} className="fill-slate-500 text-[11px]">
                {getLabel(r)}
              </text>
              <rect x={labelW} y={y} width={(Math.max(0, r.purchases) / max) * chartW} height="10" rx="2" className="fill-amber-400" />
              <rect x={labelW} y={y + 12} width={(Math.max(0, r.revenue) / max) * chartW} height="10" rx="2" className="fill-emerald-500" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PeriodTable({ rows, totals, periodHeader, getLabel }) {
  const cols = ['Purchase', 'Sales', 'Returns', 'Revenue', 'Profit / Loss', 'Received', 'Pending'];
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-slate-500">{periodHeader}</th>
            {cols.map((c) => (
              <th key={c} className="px-4 py-2 text-right font-medium text-slate-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.period}>
              <td className="px-4 py-2 font-medium text-slate-700">{getLabel(r)}</td>
              <td className="px-4 py-2 text-right">{inr(r.purchases)}</td>
              <td className="px-4 py-2 text-right">{inr(r.sales)}</td>
              <td className="px-4 py-2 text-right">{inr(r.returns)}</td>
              <td className="px-4 py-2 text-right">{inr(r.revenue)}</td>
              <td className="px-4 py-2 text-right">
                <ProfitText value={r.profit} />
              </td>
              <td className="px-4 py-2 text-right">{inr(r.received)}</td>
              <td className="px-4 py-2 text-right text-amber-600">{inr(r.pending)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold text-slate-800">
          <tr>
            <td className="px-4 py-2">Total</td>
            <td className="px-4 py-2 text-right">{inr(totals.purchases)}</td>
            <td className="px-4 py-2 text-right">{inr(totals.sales)}</td>
            <td className="px-4 py-2 text-right">{inr(totals.returns)}</td>
            <td className="px-4 py-2 text-right">{inr(totals.revenue)}</td>
            <td className="px-4 py-2 text-right">
              <ProfitText value={totals.profit} strong />
            </td>
            <td className="px-4 py-2 text-right">{inr(totals.received)}</td>
            <td className="px-4 py-2 text-right text-amber-600">{inr(totals.pending)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function RevenuePage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role_name === 'SUPER_ADMIN';

  const [tab, setTab] = useState('total');
  const [year, setYear] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    const request =
      tab === 'total'
        ? api.get('/revenue/summary')
        : tab === 'monthly'
          ? api.get('/revenue/monthly', { year })
          : api.get('/revenue/yearly');
    request
      .then((result) => {
        if (cancelled) return;
        setData(result);
        if (tab === 'monthly' && !year) setYear(String(result.year));
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, year, isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        This section is only available to the Super Admin.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">Revenue</h1>
        <div className="flex items-center gap-3">
          {tab === 'monthly' && data?.years && (
            <select className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
              {data.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
            {[
              ['total', 'Total'],
              ['monthly', 'Monthly'],
              ['yearly', 'Yearly'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 ${tab === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {!loading && data && tab === 'total' && <Totals t={data.totals} />}

      {!loading && data && tab === 'monthly' && (
        <div className="space-y-4">
          <Totals t={data.totals} />
          <BarChart rows={data.rows} getLabel={(r) => MONTHS[r.month - 1]} />
          <PeriodTable rows={data.rows} totals={data.totals} periodHeader={`Month (${data.year})`} getLabel={(r) => MONTHS[r.month - 1]} />
        </div>
      )}

      {!loading && data && tab === 'yearly' && (
        <div className="space-y-4">
          <Totals t={data.totals} />
          {data.rows.length > 0 ? (
            <>
              <BarChart rows={data.rows} getLabel={(r) => String(r.year)} />
              <PeriodTable rows={data.rows} totals={data.totals} periodHeader="Year" getLabel={(r) => String(r.year)} />
            </>
          ) : (
            <p className="text-sm text-slate-400">No purchases or sales recorded yet.</p>
          )}
        </div>
      )}

      <div className="mt-6 rounded-md bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">Yeh figures aise nikalte hain</p>
        <ul className="list-disc space-y-0.5 pl-4">
          <li>Purchase = Purchases register ka total. Sales = Sales register ka total (deleted entries nahi ginte).</li>
          <li>Revenue = Sales − Returns.</li>
          <li>
            Profit / Loss = Revenue − Purchase. Yeh seedha hisaab hai: jo maal kharida par abhi bika nahi (godown mein hai) woh us
            period mein Loss jaisa dikhega, kyunki stock ki keemat ismein nahi jodi gayi.
          </li>
          <li>
            Received = bill ke saath mila paisa + recovery se aaya paisa (jis tarikh ko mila). Pending = in sales par abhi tak baaki
            due.
          </li>
        </ul>
      </div>
    </div>
  );
}
