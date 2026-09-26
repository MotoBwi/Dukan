import { useState } from 'react';
import CustomerPicker from '../components/CustomerPicker';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export default function ReminderForm({ onSubmit, onCancel }) {
  const [customer, setCustomer] = useState(null);
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (!title.trim()) return setError('Enter a title.');
    if (!remindAt) return setError('Select when to remind.');

    setBusy(true);
    try {
      await onSubmit({
        customerId: customer?.id,
        email: email.trim(),
        title: title.trim(),
        note: note || undefined,
        remindAt,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3 text-sm">
        <span className="mb-1 block font-medium text-slate-600">Customer (optional)</span>
        <CustomerPicker value={customer} onChange={setCustomer} />
      </div>

      <label className="mb-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-600">
          Email <span className="text-red-500">*</span>
        </span>
        <input
          type="email"
          className={inputClass}
          placeholder="reminder will be sent to this address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="mb-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-600">
          Title <span className="text-red-500">*</span>
        </span>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="mb-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-600">Note</span>
        <textarea className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <label className="mb-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-600">
          Remind At <span className="text-red-500">*</span>
        </span>
        <input type="datetime-local" className={inputClass} value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
      </label>

      <p className="mb-1 text-xs text-slate-400">Channel: Email</p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

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
