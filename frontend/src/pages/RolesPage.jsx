import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ACTIONS = ['create', 'read', 'update', 'delete'];

export default function RolesPage() {
  const { can } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canRead = can('roles', 'read');
  const canUpdate = can('roles', 'update');

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    Promise.all([api.get('/roles'), api.get('/roles/permissions')])
      .then(([roleList, permissionList]) => {
        setRoles(roleList);
        setPermissions(permissionList);
        if (roleList.length > 0) setSelectedRoleId(roleList[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [canRead]);

  useEffect(() => {
    if (!selectedRoleId) return;
    api
      .get(`/roles/${selectedRoleId}`)
      .then((role) => {
        setChecked(new Set(role.permissions.map((p) => p.id)));
      })
      .catch((err) => setError(err.message));
  }, [selectedRoleId]);

  const modules = useMemo(() => [...new Set(permissions.map((p) => p.module))], [permissions]);
  const permissionByModuleAction = useMemo(() => {
    const map = {};
    for (const p of permissions) map[`${p.module}:${p.action}`] = p.id;
    return map;
  }, [permissions]);

  function toggle(permissionId) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.put(`/roles/${selectedRoleId}/permissions`, { permissionIds: [...checked] });
      setMessage('Permissions saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You don't have permission to view Roles.
      </div>
    );
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.name === 'SUPER_ADMIN';

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Roles &amp; Permissions</h1>

      <div className="mb-4 flex gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRoleId(role.id)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              role.id === selectedRoleId
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {role.name}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-3 text-sm text-green-600">{message}</p>}

      {isSuperAdmin ? (
        <p className="text-sm text-slate-500">
          SUPER_ADMIN always has full access to every module — permissions here are informational only.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Module</th>
              {ACTIONS.map((action) => (
                <th key={action} className="px-4 py-2 text-center font-medium text-slate-500 capitalize">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {modules.map((module) => (
              <tr key={module}>
                <td className="px-4 py-2 font-medium text-slate-700 capitalize">{module.replace(/_/g, ' ')}</td>
                {ACTIONS.map((action) => {
                  const permissionId = permissionByModuleAction[`${module}:${action}`];
                  if (!permissionId) return <td key={action} className="px-4 py-2 text-center text-slate-300">—</td>;
                  return (
                    <td key={action} className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        disabled={!canUpdate || isSuperAdmin}
                        checked={checked.has(permissionId)}
                        onChange={() => toggle(permissionId)}
                        className="h-4 w-4"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canUpdate && !isSuperAdmin && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
      )}
    </div>
  );
}
