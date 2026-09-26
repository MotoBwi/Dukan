import { useState } from 'react';
import FormField from './FormField';

export default function ResourceForm({ fields, initialValues = {}, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function handleChange(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {fields.filter((field) => !field.showIf || field.showIf(values)).map((field) => (
        <FormField key={field.name} field={field} value={values[field.name]} onChange={handleChange} />
      ))}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

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
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
