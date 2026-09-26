import { useState } from 'react';
import { api } from '../api/client';
import CustomerPicker from '../components/CustomerPicker';

const inr = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (s) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export default function ReturnForm({ onSubmit, onCancel }) {
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [returnDate, setReturnDate] = useState(todayLocal);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sale = sales.find((s) => String(s.id) === String(saleId));

  async function handleCustomer(c) {
    setCustomer(c);
    setSaleId('');
    setQty('');
    setPrice('');
    setSales([]);
    setError('');
    if (!c) return;
    setSalesLoading(true);
    try {
      setSales(await api.get('/sales', { customerId: c.id, limit: 200 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSalesLoading(false);
    }
  }

  function handleSale(id) {
    setSaleId(id);
    const s = sales.find((x) => String(x.id) === String(id));
    if (s) {
      setQty(String(Number(s.qty)));
      setPrice(String(Number(s.price)));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customer) return setError('Select a customer.');
    if (!sale) return setError('Select the sale that is being returned.');
    if (!(Number(qty) > 0) || !(Number(price) > 0)) return setError('Enter a valid qty and price.');
    if (Number(qty) > Number(sale.qty)) return setError(`Return qty cannot be more than the sold qty (${Number(sale.qty)}).`);
    if (!returnDate) return setError('Select the return date.');

    setBusy(true);
    try {
      await onSubmit({
        saleId: sale.id,
        qty: Number(qty),
        price: Number(price),
        returnDate,
        reason: reason || undefined,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3 text-sm">
        <span className="mb-1 block font-medium text-slate-600">
          Customer <span className="text-red-500">*</span>
        </span>
        <CustomerPicker value={customer} onChange={handleCustomer} />
      </div>

      {customer && (
        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Sale <span className="text-red-500">*</span>
          </span>
          <select className={inputClass} value={saleId} onChange={(e) => handleSale(e.target.value)}>
            <option value="" disabled>
              {salesLoading ? 'Loading sales…' : sales.length === 0 ? 'No sales for this customer' : 'Select sale…'}
            </option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {`Bill #${s.bill_id ?? s.id} · ${fmtDate(s.sale_date)} · ${s.item_name} ${Number(s.qty)} ${s.unit} × ${inr(s.price)}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {sale && (
        <div className="mb-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
          Sold: <b>{Number(sale.qty)} {sale.unit}</b> of <b>{sale.item_name}</b> at {inr(sale.price)} = {inr(sale.amount)}
          {' · '}Paid {inr(sale.paid_amount)} · Due {inr(sale.due_amount)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Return Qty <span className="text-red-500">*</span>
          </span>
          <input type="number" step="0.01" min="0" className={inputClass} value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Price <span className="text-red-500">*</span>
          </span>
          <input type="number" step="0.01" min="0" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
      </div>

      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-600">
          Return Date <span className="text-red-500">*</span>
        </span>
        <input type="date" className={inputClass} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
      </label>

      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-600">Reason</span>
        <textarea className={inputClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Create'}
        </button>
      </div>
    </form>
  );
}
