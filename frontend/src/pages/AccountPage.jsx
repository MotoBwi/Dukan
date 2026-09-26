import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function passwordProblem(pw) {
  if (pw.length < 8) return 'New password must be at least 8 characters.';
  if (pw.length > 72) return 'New password can be at most 72 characters.';
  if (!/[A-Za-z]/.test(pw)) return 'New password must contain at least one letter.';
  if (!/\d/.test(pw)) return 'New password must contain at least one number.';
  return '';
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const problem = passwordProblem(newPassword);
    if (problem) return setError(problem);
    if (newPassword !== confirm) return setError('The two new passwords do not match.');
    if (newPassword === currentPassword) return setError('New password must be different from the current one.');

    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setDone(true);
      setTimeout(() => logout(), 1800);
    } catch (err) {
      setError(err.message || 'Could not change the password.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-xl font-semibold text-slate-800">Change password</h1>
      <p className="mb-5 text-sm text-slate-500">
        Signed in as {user?.name} ({user?.phone}). After changing it you will be signed out everywhere and asked to log in
        again.
      </p>

      {done ? (
        <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Password changed. Signing you out…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5">
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-600">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-600">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <span className="mt-1 block text-xs text-slate-400">At least 8 characters, with a letter and a number.</span>
          </label>
          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-slate-600">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </label>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      )}
    </div>
  );
}
