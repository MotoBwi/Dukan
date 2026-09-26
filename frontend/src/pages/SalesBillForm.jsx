import { useMemo, useState } from 'react';
import CustomerPicker from '../components/CustomerPicker';

const SALE_UNITS = ['KG', 'PCS', 'TROLLY', 'TIN', 'NUMBER'];
const emptyLine = () => ({ itemName: '', unit: '', qty: '', price: '' });
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const inr = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export default function SalesBillForm({ items, onSubmit, onCancel, onCreated }) {
  const [customer, setCustomer] = useState(null);
  const [saleDate, setSaleDate] = useState(todayLocal);
  const [paidAmount, setPaidAmount] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([emptyLine()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const itemsByName = useMemo(() => Object.fromEntries(items.map((i) => [i.name, i])), [items]);

  const requestedByItem = useMemo(() => {
    const map = {};
    for (const l of lines) {
      if (l.itemName) map[l.itemName] = (map[l.itemName] || 0) + (Number(l.qty) || 0);
    }
    return map;
  }, [lines]);

  const lineAmount = (l) => (Number(l.qty) || 0) * (Number(l.price) || 0);
  const total = lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const paid = Number(paidAmount) || 0;
  const due = total - paid;

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function pickItem(idx, name) {
    const item = itemsByName[name];
    const patch = { itemName: name };
    if (item && SALE_UNITS.includes(item.default_unit)) patch.unit = item.default_unit;
    updateLine(idx, patch);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!customer) return setError('Select a customer.');
    if (!saleDate) return setError('Select the sale date.');
    for (const [i, l] of lines.entries()) {
      if (!l.itemName || !l.unit || !(Number(l.qty) > 0) || !(Number(l.price) > 0)) {
        return setError(`Item ${i + 1}: select item and measurement, and enter qty and price.`);
      }
    }
    if (Math.round(paid * 100) > Math.round(total * 100)) {
      return setError('Paid amount cannot be more than the bill total.');
    }

    setBusy(true);
    try {
      await onSubmit({
        customerId: customer.id,
        saleDate,
        paidAmount: paidAmount === '' ? undefined : paid,
        note: note || undefined,
        items: lines.map((l) => ({
          itemName: l.itemName,
          unit: l.unit,
          qty: Number(l.qty),
          price: Number(l.price),
        })),
      });
      onCreated?.();
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Customer <span className="text-red-500">*</span>
          </span>
          <CustomerPicker value={customer} onChange={setCustomer} />
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">
            Sale Date <span className="text-red-500">*</span>
          </span>
          <input type="date" className={inputClass} value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </label>
      </div>

      <p className="mb-2 mt-4 text-sm font-medium text-slate-600">Items</p>
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const item = itemsByName[line.itemName];
          const stock = item ? Number(item.stock) : null;
          const requested = requestedByItem[line.itemName] || 0;
          const over = stock !== null && requested > stock;

          return (
            <div key={idx} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <select
                    className={inputClass}
                    value={line.itemName}
                    onChange={(e) => pickItem(idx, e.target.value)}
                  >
                    <option value="" disabled>
                      Select item name…
                    </option>
                    {items.map((i) => (
                      <option key={i.id} value={i.name}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  {item && (
                    <p className={`mt-1 text-xs ${over ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                      Available stock: {stock} {item.default_unit ? item.default_unit.replace(/_/g, ' ') : ''}
                      {over && ` — only ${stock} in stock, you are selling ${requested}`}
                    </p>
                  )}
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <select className={inputClass} value={line.unit} onChange={(e) => updateLine(idx, { unit: e.target.value })}>
                  <option value="" disabled>
                    Measurement…
                  </option>
                  {SALE_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Qty"
                  className={inputClass}
                  value={line.qty}
                  onChange={(e) => updateLine(idx, { qty: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  className={inputClass}
                  value={line.price}
                  onChange={(e) => updateLine(idx, { price: e.target.value })}
                />
                <div className="flex items-center justify-end text-sm font-medium text-slate-700">
                  {inr(lineAmount(line))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setLines((prev) => [...prev, emptyLine()])}
        className="mt-3 rounded-md border border-dashed border-indigo-300 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50"
      >
        + Add another item
      </button>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Paid Amount (leave blank if fully on due)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
        </label>
        <div className="rounded-md bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Bill total</span>
            <span className="font-semibold text-slate-800">{inr(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Due</span>
            <span className={`font-semibold ${due > 0 ? 'text-red-600' : 'text-slate-800'}`}>{inr(Math.max(due, 0))}</span>
          </div>
        </div>
      </div>

      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-600">Note</span>
        <textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
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
