import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const MIN_ROWS = 8;

const money = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

function InvoiceSheet({ inv }) {
  const { shop, customer, items, totals } = inv;
  const fillers = Math.max(MIN_ROWS - items.length, 0);
  const cell = 'border border-black px-2 py-1.5';

  return (
    <div className="mx-auto max-w-[794px] border border-black bg-white p-8 text-[13px] text-black">
      <div className="flex flex-wrap justify-between gap-5 border-b-2 border-black pb-3">
        <div>
          <div className="text-2xl font-extrabold tracking-wide">{shop.name}</div>
          <div className="mt-1 text-xs leading-relaxed">
            {shop.address}
            {(shop.phone || shop.gstin) && (
              <>
                <br />
                {shop.phone && `Phone: ${shop.phone}`}
                {shop.phone && shop.gstin && '  |  '}
                {shop.gstin && `GSTIN: ${shop.gstin}`}
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold tracking-[2px]">INVOICE</div>
          <table className="ml-auto mt-1">
            <tbody>
              <tr>
                <td className="py-0.5 pl-3 text-slate-500">Invoice No.</td>
                <td className="py-0.5 pl-3 font-bold">{inv.invoice_no}</td>
              </tr>
              <tr>
                <td className="py-0.5 pl-3 text-slate-500">Date</td>
                <td className="py-0.5 pl-3 font-bold">{fmtDate(inv.date)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="my-4 flex flex-wrap gap-5">
        <div className="min-w-[200px] flex-1 border border-black px-3 py-2">
          <b className="mb-1 block text-[11px] tracking-widest">BILL TO</b>
          {customer.name}
          <br />
          Phone: {customer.phone}
          {customer.address && (
            <>
              <br />
              {customer.address}
            </>
          )}
        </div>
        <div className="min-w-[200px] flex-1 border border-black px-3 py-2">
          <b className="mb-1 block text-[11px] tracking-widest">PAYMENT STATUS</b>
          {totals.status.charAt(0) + totals.status.slice(1).toLowerCase()}
          <br />
          Received: ₹{money(totals.paid)}
          <br />
          Balance: ₹{money(totals.due)}
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-xs">
            <th className={`${cell} w-11 text-center`}>#</th>
            <th className={`${cell} text-left`}>Item</th>
            <th className={`${cell} text-center`}>Unit</th>
            <th className={`${cell} text-right`}>Qty</th>
            <th className={`${cell} text-right`}>Rate (₹)</th>
            <th className={`${cell} text-right`}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.sale_id}>
              <td className={`${cell} text-center`}>{i + 1}</td>
              <td className={cell}>{it.item_name}</td>
              <td className={`${cell} text-center`}>{it.unit}</td>
              <td className={`${cell} text-right`}>{it.qty}</td>
              <td className={`${cell} text-right`}>{money(it.price)}</td>
              <td className={`${cell} text-right`}>{money(it.amount)}</td>
            </tr>
          ))}
          {Array.from({ length: fillers }).map((_, i) => (
            <tr key={`f${i}`}>
              {Array.from({ length: 6 }).map((__, j) => (
                <td key={j} className={`${cell} h-7`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap gap-5">
        <div className="min-w-[220px] flex-1 border border-black px-3 py-2">
          <b>Amount in words</b>
          <br />
          {totals.amount_in_words}
        </div>
        <table className="w-[250px] border-collapse">
          <tbody>
            <tr>
              <td className={cell}>Sub Total</td>
              <td className={`${cell} text-right`}>{money(totals.subtotal)}</td>
            </tr>
            {totals.returned > 0 && (
              <tr>
                <td className={cell}>Less: Returns</td>
                <td className={`${cell} text-right`}>{money(totals.returned)}</td>
              </tr>
            )}
            <tr>
              <td className={cell}>Paid</td>
              <td className={`${cell} text-right`}>{money(totals.paid)}</td>
            </tr>
            <tr className="bg-gray-100 text-sm font-extrabold">
              <td className={cell}>Balance Due</td>
              <td className={`${cell} text-right`}>{money(totals.due)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-9 flex items-end justify-between gap-5 text-xs">
        <div>{shop.terms}</div>
        <div className="w-[190px] border-t border-black pt-1 text-center">Authorised Signature</div>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const canRead = can('sales', 'read');

  const [input, setInput] = useState(billId || '');
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canRead || !billId) return undefined;
    let cancelled = false;
    api
      .get(`/invoices/${billId}`)
      .then((data) => {
        if (!cancelled) {
          setInvoice(data);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setInvoice(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [billId, canRead]);

  function handleSubmit(e) {
    e.preventDefault();
    const value = input.trim().replace(/^#/, '');
    if (!/^\d+$/.test(value)) {
      setError('Enter a valid bill number (digits only).');
      setInvoice(null);
      return;
    }
    setLoading(true);
    navigate(`/invoices/${value}`);
  }

  if (!canRead) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You don't have permission to view invoices.
      </div>
    );
  }

  return (
    <div>
      <div className="print:hidden">
        <h1 className="mb-4 text-xl font-semibold text-slate-800">Invoice</h1>
        <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Bill number</span>
            <input
              className="w-48 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. 9"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
          </label>
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">
            Show Invoice
          </button>
          {invoice && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Print
            </button>
          )}
        </form>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {loading && !invoice && <p className="text-sm text-slate-400">Loading…</p>}
        {!billId && !error && (
          <p className="text-sm text-slate-400">
            Type a bill number to open its invoice. You can also click a Bill # on the Sales page.
          </p>
        )}
      </div>

      {invoice && String(invoice.invoice_no) === String(billId) && <InvoiceSheet inv={invoice} />}
    </div>
  );
}
