import { Fragment, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const inr = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const inputClass =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const SORT_OPTIONS = [
  { value: 'due_desc', label: 'Highest due first' },
  { value: 'due_asc', label: 'Lowest due first' },
  { value: 'recent', label: 'Latest sale first' },
  { value: 'name', label: 'Name (A–Z)' },
];

const TYPE_STYLE = {
  SALE: 'bg-red-50 text-red-700',
  PAID: 'bg-green-50 text-green-700',
  RETURN: 'bg-amber-50 text-amber-700',
  RECOVERY: 'bg-green-50 text-green-700',
};
const TYPE_LABEL = { SALE: 'Sale', PAID: 'Received', RETURN: 'Return', RECOVERY: 'Recovery' };

function DueCell({ value }) {
  const n = Number(value);
  if (n > 0) return <span className="font-medium text-red-600">{inr(n)}</span>;
  if (n < 0) return <span className="text-amber-600">{inr(Math.abs(n))} (advance)</span>;
  return <span className="text-slate-500">{inr(0)}</span>;
}

const EMPTY = { q: '', address: '', from: '', to: '', sort: 'due_desc', onlyDue: false };

export default function SearchPage() {
  const { can } = useAuth();
  const canRead = can('customers', 'read') && can('sales', 'read');

  const [f, setF] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('customers');
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});

  async function load(filters) {
    setLoading(true);
    setError('');
    setOpenId(null);
    setDetails({});
    setApplied(filters);
    try {
      setRows(await api.get('/search', { ...filters, onlyDue: filters.onlyDue ? 'true' : '' }));
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canRead) load(EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  function set(key, value) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function clearAll() {
    setF(EMPTY);
    load(EMPTY);
  }

  function drillIntoAddress(address) {
    const next = { ...f, address: address === '(No address)' ? '' : address };
    setF(next);
    setView('customers');
    load(next);
  }

  async function toggle(id) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!details[id]) {
      try {
        const data = await api.get(`/reports/customer-ledger/${id}`, { from: applied.from, to: applied.to });
        setDetails((d) => ({ ...d, [id]: data }));
      } catch (err) {
        setDetails((d) => ({ ...d, [id]: { error: err.message } }));
      }
    }
  }

  const totals = useMemo(
    () =>
      rows.reduce(
        (t, r) => ({ amount: t.amount + Number(r.total_amount), paid: t.paid + Number(r.total_paid), due: t.due + Number(r.total_due) }),
        { amount: 0, paid: 0, due: 0 }
      ),
    [rows]
  );

  const byAddress = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const label = (r.address || '').trim() || '(No address)';
      const key = label.toLowerCase();
      const g = map.get(key) || { address: label, customers: [], amount: 0, paid: 0, due: 0 };
      g.customers.push({ name: r.name, phone: r.phone });
      g.amount += Number(r.total_amount);
      g.paid += Number(r.total_paid);
      g.due += Number(r.total_due);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.due - a.due || a.address.localeCompare(b.address));
  }, [rows]);

  const hasFilters = f.q || f.address || f.from || f.to || f.onlyDue || f.sort !== 'due_desc';

  if (!canRead) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You don't have permission to use search.
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Search</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(f);
        }}
        className="mb-4 flex flex-wrap items-end gap-3"
      >
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Search</span>
          <input
            className={`${inputClass} w-64`}
            placeholder="Name, phone, item, bill no, note…"
            value={f.q}
            onChange={(e) => set('q', e.target.value)}
            autoFocus
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Address</span>
          <input
            className={`${inputClass} w-44`}
            placeholder="Village / area…"
            value={f.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">From</span>
          <input type="date" className={inputClass} value={f.from} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">To</span>
          <input type="date" className={inputClass} value={f.to} onChange={(e) => set('to', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Sort</span>
          <select className={inputClass} value={f.sort} onChange={(e) => set('sort', e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
          <input type="checkbox" checked={f.onlyDue} onChange={(e) => set('onlyDue', e.target.checked)} />
          Only with due
        </label>
        <button type="submit" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">
          Search
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
          {[
            ['customers', 'Customers'],
            ['address', 'By address'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-3 py-1.5 ${view === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {!loading && (
          <p className="text-sm text-slate-500">
            {rows.length} customer{rows.length === 1 ? '' : 's'} · Total due{' '}
            <span className="font-semibold text-red-600">{inr(totals.due)}</span>
          </p>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {view === 'customers' ? (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Customer', 'Address', 'Sales', 'Total Amount', 'Paid', 'Due', 'Last Sale'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 font-medium text-slate-500 ${i < 2 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Searching…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Nothing found. Try a different word, address or date range.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <Fragment key={r.customer_id}>
                    <tr onClick={() => toggle(r.customer_id)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-800">
                        <span className="mr-2 text-slate-400">{openId === r.customer_id ? '▾' : '▸'}</span>
                        {r.name} <span className="text-slate-400">({r.phone})</span>
                        {applied.sort === 'due_desc' && idx === 0 && Number(r.total_due) > 0 && (
                          <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">
                            Highest due
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{r.address || '—'}</td>
                      <td className="px-4 py-2 text-right">{r.sales_count}</td>
                      <td className="px-4 py-2 text-right">{inr(r.total_amount)}</td>
                      <td className="px-4 py-2 text-right">{inr(r.total_paid)}</td>
                      <td className="px-4 py-2 text-right">
                        <DueCell value={r.total_due} />
                      </td>
                      <td className="px-4 py-2 text-right text-slate-500">{r.last_sale_date || '—'}</td>
                    </tr>
                    {openId === r.customer_id && (
                      <tr>
                        <td colSpan={7} className="bg-slate-50 px-4 py-3">
                          {!details[r.customer_id] ? (
                            <span className="text-slate-400">Loading…</span>
                          ) : details[r.customer_id].error ? (
                            <span className="text-red-600">{details[r.customer_id].error}</span>
                          ) : details[r.customer_id].entries.length === 0 ? (
                            <span className="text-slate-400">No entries in this date range.</span>
                          ) : (
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-slate-500">
                                  {['Date', 'Type', 'Particulars', 'Ref', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                                    <th key={h} className={`px-2 py-1 font-medium ${i >= 4 ? 'text-right' : 'text-left'}`}>
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {details[r.customer_id].entries.map((e, i) => (
                                  <tr key={i} className="border-t border-slate-200">
                                    <td className="whitespace-nowrap px-2 py-1">{e.date}</td>
                                    <td className="px-2 py-1">
                                      <span className={`rounded px-1.5 py-0.5 font-medium ${TYPE_STYLE[e.type]}`}>
                                        {TYPE_LABEL[e.type]}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1">{e.particulars}</td>
                                    <td className="whitespace-nowrap px-2 py-1 text-slate-500">{e.ref}</td>
                                    <td className="px-2 py-1 text-right text-red-600">{e.debit ? inr(e.debit) : ''}</td>
                                    <td className="px-2 py-1 text-right text-green-700">{e.credit ? inr(e.credit) : ''}</td>
                                    <td className="px-2 py-1 text-right">
                                      <DueCell value={e.balance} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold text-slate-800">
                <tr>
                  <td className="px-4 py-2" colSpan={3}>
                    Total ({rows.length} customers)
                  </td>
                  <td className="px-4 py-2 text-right">{inr(totals.amount)}</td>
                  <td className="px-4 py-2 text-right">{inr(totals.paid)}</td>
                  <td className="px-4 py-2 text-right">
                    <DueCell value={totals.due} />
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Address', 'Customers', 'Total Amount', 'Paid', 'Due'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 font-medium text-slate-500 ${i <= 1 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Searching…
                  </td>
                </tr>
              ) : byAddress.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Nothing found.
                  </td>
                </tr>
              ) : (
                byAddress.map((g) => (
                  <tr key={g.address} onClick={() => drillIntoAddress(g.address)} className="cursor-pointer hover:bg-slate-50" title="Click to see these customers">
                    <td className="px-4 py-2 text-slate-800">{g.address}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {g.customers.map((c) => c.name).join(', ')}
                      {g.customers.length > 1 && (
                        <span className="text-slate-400"> · {g.customers.length} customers</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">{inr(g.amount)}</td>
                    <td className="px-4 py-2 text-right">{inr(g.paid)}</td>
                    <td className="px-4 py-2 text-right">
                      <DueCell value={g.due} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
