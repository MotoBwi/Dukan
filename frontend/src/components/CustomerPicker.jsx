import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const boxClass =
  'w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export default function CustomerPicker({ value, onChange }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await api.get('/customers', { search: text.trim(), limit: 10 });
        if (!cancelled) {
          setResults(list);
          setActive(0);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, open]);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  function select(customer) {
    onChange(customer);
    setText('');
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (results[active]) select(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  if (value) {
    return (
      <div className={`${boxClass} flex items-center justify-between bg-white`}>
        <span className="truncate">
          {value.name} <span className="text-slate-400">({value.phone})</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Change customer"
          className="ml-2 text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className={boxClass}
        placeholder="Search by name or phone…"
        value={text}
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {error ? (
            <li className="px-3 py-2 text-sm text-red-600">{error}</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">{loading ? 'Searching…' : 'No customers found'}</li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(c);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-indigo-50' : ''}`}
              >
                <span className="font-medium text-slate-800">{c.name}</span>{' '}
                <span className="text-slate-500">({c.phone})</span>
                {c.address && <span className="block text-xs text-slate-400">{c.address}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
