export default function FormField({ field, value, onChange }) {
  const { name, label, type = 'text', required, options, placeholder, step } = field;

  const commonClass =
    'w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>

      {type === 'select' ? (
        <select
          className={commonClass}
          value={value ?? ''}
          required={required}
          onChange={(e) => onChange(name, e.target.value)}
        >
          <option value="" disabled>
            Select {label.toLowerCase()}…
          </option>
          {(options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          className={commonClass}
          value={value ?? ''}
          required={required}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => onChange(name, e.target.value)}
        />
      ) : (
        <input
          className={commonClass}
          type={type}
          step={step}
          value={value ?? ''}
          required={required}
          placeholder={placeholder}
          list={field.datalistId}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
    </label>
  );
}
