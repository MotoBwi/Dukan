import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const inr = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const inputClass =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function DueCell({ value }) {
  const n = Number(value);
  if (n > 0) return <span className="font-medium text-red-600">{inr(n)}</span>;
  if (n < 0) return <span className="text-amber-600">{inr(n)} (advance)</span>;
  return <span className="text-slate-500">{inr(0)}</span>;
}

function RecoverySection({ list }) {
  const total = list.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="mt-4">
      <p className="mb-1 text-xs font-semibold text-slate-600">
        Recovery entries ({list.length}) — total {inr(total)}
      </p>
      {list.length === 0 ? (
        <p className="text-xs text-slate-400">No recovery entries for this filter.</p>
      ) : (
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-slate-500">
              {['Date', 'Mode', 'Collected By', 'Entered By', 'Sale #', 'Note', 'Amount'].map((h, i) => (
                <th key={h} className={`px-2 py-1 font-medium ${i === 6 ? 'text-right' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-slate-200">
                <td className="px-2 py-1">{r.payment_date}</td>
                <td className="px-2 py-1">{r.payment_mode}</td>
                <td className="px-2 py-1">{r.collected_by || '—'}</td>
                <td className="px-2 py-1">{r.created_by_name || '—'}</td>
                <td className="px-2 py-1">{r.sale_id ?? '—'}</td>
                <td className="px-2 py-1">{r.note || '—'}</td>
                <td className="px-2 py-1 text-right font-medium text-green-700">{inr(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { can } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [itemId, setItemId] = useState('');
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [dueDir, setDueDir] = useState('desc');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});

  const canRead = can('sales', 'read');
  const canFilterItems = can('items', 'read');
  const canFilterUsers = can('users', 'read');

  useEffect(() => {
    if (canFilterItems) api.get('/items/options').then(setItems).catch(() => {});
    if (canFilterUsers) api.get('/users', { limit: 200 }).then(setUsers).catch(() => {});
  }, [canFilterItems, canFilterUsers]);

  const load = useCallback(
    async (filters) => {
      const f = filters || { from, to, search, itemId, userId };
      setLoading(true);
      setError('');
      setOpenId(null);
      setDetails({});
      try {
        setRows(await api.get('/reports/customer-sales', f));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [from, to, search, itemId, userId]
  );

  useEffect(() => {
    if (canRead) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  function clearFilters() {
    setFrom('');
    setTo('');
    setSearch('');
    setItemId('');
    setUserId('');
    load({});
  }

  async function toggle(id) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!details[id]) {
      try {
        const lines = await api.get(`/reports/customer-sales/${id}`, { from, to, itemId, userId });
        setDetails((d) => ({ ...d, [id]: lines }));
      } catch (err) {
        setError(err.message);
      }
    }
  }

  const sortedRows = useMemo(() => {
    const sign = dueDir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => sign * (Number(a.total_due) - Number(b.total_due)));
  }, [rows, dueDir]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (t, r) => ({
          sales: t.sales + Number(r.sales_count),
          amount: t.amount + Number(r.total_amount),
          returned: t.returned + Number(r.total_returned),
          paid: t.paid + Number(r.total_paid),
          due: t.due + Number(r.total_due),
        }),
        { sales: 0, amount: 0, returned: 0, paid: 0, due: 0 }
      ),
    [rows]
  );

  const hasFilters = from || to || search || itemId || userId;

  if (!canRead) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You don't have permission to view reports.
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Customer-wise Sales Report</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex flex-wrap items-end gap-3"
      >
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Search customer</span>
          <input
            className={`${inputClass} w-64`}
            placeholder="Name, phone or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">From</span>
          <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">To</span>
          <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {canFilterItems && (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Item</span>
            <select className={inputClass} value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">All items</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {canFilterUsers && (
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">User (entered by)</span>
            <select className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">
          Show Report
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </form>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Customer', 'Sales', 'Total Amount', 'Returned', 'Paid (incl. recovery)'].map((h, i) => (
                <th key={h} className={`px-4 py-2 font-medium text-slate-500 ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
              <th
                onClick={() => setDueDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                title="Click to reverse order"
                className="cursor-pointer select-none px-4 py-2 text-right font-medium text-indigo-600"
              >
                Due {dueDir === 'desc' ? '↓' : '↑'}
              </th>
              <th className="px-4 py-2 text-right font-medium text-slate-500">Last Sale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No sales found for this filter.
                </td>
              </tr>
            ) : (
              sortedRows.map((r) => (
                <Fragment key={r.customer_id}>
                  <tr onClick={() => toggle(r.customer_id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-800">
                      <span className="mr-2 text-slate-400">{openId === r.customer_id ? '▾' : '▸'}</span>
                      {r.name} <span className="text-slate-400">({r.phone})</span>
                      {r.address && <div className="ml-5 text-xs text-slate-400">{r.address}</div>}
                    </td>
                    <td className="px-4 py-2 text-right">{r.sales_count}</td>
                    <td className="px-4 py-2 text-right">{inr(r.total_amount)}</td>
                    <td className="px-4 py-2 text-right">{inr(r.total_returned)}</td>
                    <td className="px-4 py-2 text-right">{inr(r.total_paid)}</td>
                    <td className="px-4 py-2 text-right">
                      <DueCell value={r.total_due} />
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500">{r.last_sale_date}</td>
                  </tr>
                  {openId === r.customer_id && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 px-4 py-3">
                        {!details[r.customer_id] ? (
                          <span className="text-slate-400">Loading…</span>
                        ) : (
                          <>
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-slate-500">
                                {['Date', 'Item', 'Unit', 'By', 'Qty', 'Price', 'Amount', 'Paid', 'Due'].map((h, i) => (
                                  <th key={h} className={`px-2 py-1 font-medium ${i < 4 ? 'text-left' : 'text-right'}`}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {details[r.customer_id].sales.map((s) => (
                                <tr key={s.id} className="border-t border-slate-200">
                                  <td className="px-2 py-1">{s.sale_date}</td>
                                  <td className="px-2 py-1">{s.item_name}</td>
                                  <td className="px-2 py-1">{s.unit}</td>
                                  <td className="px-2 py-1">{s.created_by_name || '—'}</td>
                                  <td className="px-2 py-1 text-right">{s.qty}</td>
                                  <td className="px-2 py-1 text-right">{inr(s.price)}</td>
                                  <td className="px-2 py-1 text-right">{inr(s.amount)}</td>
                                  <td className="px-2 py-1 text-right">{inr(s.paid_amount)}</td>
                                  <td className="px-2 py-1 text-right">
                                    <DueCell value={s.due_amount} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {details[r.customer_id].recoveries && (
                            <RecoverySection list={details[r.customer_id].recoveries} />
                          )}
                          </>
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
                <td className="px-4 py-2">Total ({rows.length} customers)</td>
                <td className="px-4 py-2 text-right">{totals.sales}</td>
                <td className="px-4 py-2 text-right">{inr(totals.amount)}</td>
                <td className="px-4 py-2 text-right">{inr(totals.returned)}</td>
                <td className="px-4 py-2 text-right">{inr(totals.paid)}</td>
                <td className="px-4 py-2 text-right">
                  <DueCell value={totals.due} />
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
