import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const inr = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const inputClass =
  'rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const TYPE_STYLE = {
  SALE: 'bg-red-50 text-red-700',
  PAID: 'bg-green-50 text-green-700',
  RETURN: 'bg-amber-50 text-amber-700',
  RECOVERY: 'bg-green-50 text-green-700',
};
const TYPE_LABEL = { SALE: 'Sale', PAID: 'Received', RETURN: 'Return', RECOVERY: 'Recovery' };

function Balance({ value, strong = false }) {
  const n = Number(value);
  const weight = strong ? 'font-semibold' : '';
  if (n > 0)
    return (
      <span className={`${weight} text-red-600`}>
        {inr(n)} <span className="text-xs font-normal">due</span>
      </span>
    );
  if (n < 0)
    return (
      <span className={`${weight} text-amber-600`}>
        {inr(Math.abs(n))} <span className="text-xs font-normal">advance</span>
      </span>
    );
  return <span className="text-slate-500">{inr(0)}</span>;
}

export default function LedgerPage() {
  const { can } = useAuth();
  const canRead =
    can('customers', 'read') && can('sales', 'read') && can('returns', 'read') && can('recovery', 'read');

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLedger = useCallback(async (customerId, range) => {
    setLoading(true);
    setError('');
    try {
      setLedger(await api.get(`/reports/customer-ledger/${customerId}`, range));
    } catch (err) {
      setError(err.message);
      setLedger(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCustomers = useCallback(
    async (term) => {
      setSearching(true);
      setError('');
      try {
        const list = await api.get('/customers', { search: term, limit: 30 });
        setResults(list);
        if (term && list.length === 1) {
          setSelected(list[0]);
          loadLedger(list[0].id, { from, to });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setSearching(false);
      }
    },
    [from, to, loadLedger]
  );

  useEffect(() => {
    if (canRead) searchCustomers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  function pick(customer) {
    setSelected(customer);
    loadLedger(customer.id, { from, to });
  }

  if (!canRead) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You don't have permission to view the ledger.
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800 print:hidden">Customer Ledger</h1>

      <div className="print:hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            searchCustomers(search.trim());
          }}
          className="mb-3 flex flex-wrap items-end gap-3"
        >
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Search customer</span>
            <input
              className={`${inputClass} w-72`}
              placeholder="Name, phone or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </label>
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">
            Search
          </button>
        </form>

        {searching ? (
          <p className="mb-3 text-sm text-slate-400">Searching…</p>
        ) : results.length === 0 ? (
          <p className="mb-3 text-sm text-slate-400">No customers found.</p>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => pick(c)}
                className={`rounded-md border px-3 py-1.5 text-left text-sm ${
                  selected?.id === c.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{c.name}</span> <span className="text-slate-400">({c.phone})</span>
                {c.address && <span className="block text-xs text-slate-400">{c.address}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {selected && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-lg font-semibold text-slate-800">{selected.name}</p>
              <p className="text-sm text-slate-500">
                {selected.phone}
                {selected.address ? ` · ${selected.address}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2 print:hidden">
              <label className="text-xs">
                <span className="mb-1 block text-slate-500">From</span>
                <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-slate-500">To</span>
                <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
              <button
                onClick={() => loadLedger(selected.id, { from, to })}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
              >
                Show
              </button>
              {(from || to) && (
                <button
                  onClick={() => {
                    setFrom('');
                    setTo('');
                    loadLedger(selected.id, {});
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Print
              </button>
            </div>
          </div>

          {loading || !ledger ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Total Debit (goods sold)</p>
                  <p className="text-lg font-semibold text-slate-800">{inr(ledger.total_debit)}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Total Credit (received + returns)</p>
                  <p className="text-lg font-semibold text-slate-800">{inr(ledger.total_credit)}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Closing Balance</p>
                  <p className="text-lg">
                    <Balance value={ledger.closing_balance} strong />
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Date', 'Type', 'Particulars', 'Ref', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-4 py-2 font-medium text-slate-500 ${i >= 4 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(from || Number(ledger.opening_balance) !== 0) && (
                      <tr className="bg-slate-50 text-slate-600">
                        <td className="px-4 py-2" colSpan={6}>
                          Opening balance{from ? ` (before ${from})` : ''}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Balance value={ledger.opening_balance} />
                        </td>
                      </tr>
                    )}
                    {ledger.entries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                          No entries for this customer{from || to ? ' in this date range' : ''}.
                        </td>
                      </tr>
                    ) : (
                      ledger.entries.map((e, i) => (
                        <tr key={i}>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-600">{e.date}</td>
                          <td className="px-4 py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[e.type]}`}>
                              {TYPE_LABEL[e.type]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-800">{e.particulars}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-500">{e.ref}</td>
                          <td className="px-4 py-2 text-right text-red-600">{e.debit ? inr(e.debit) : ''}</td>
                          <td className="px-4 py-2 text-right text-green-700">{e.credit ? inr(e.credit) : ''}</td>
                          <td className="px-4 py-2 text-right">
                            <Balance value={e.balance} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold text-slate-800">
                    <tr>
                      <td className="px-4 py-2" colSpan={4}>
                        Total
                      </td>
                      <td className="px-4 py-2 text-right">{inr(ledger.total_debit)}</td>
                      <td className="px-4 py-2 text-right">{inr(ledger.total_credit)}</td>
                      <td className="px-4 py-2 text-right">
                        <Balance value={ledger.closing_balance} strong />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
