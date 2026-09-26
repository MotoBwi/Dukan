import { useEffect, useMemo, useState } from 'react';
import ResourcePage from '../components/ResourcePage';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const { can } = useAuth();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (!can('roles', 'read')) return;
    api
      .get('/roles')
      .then(setRoles)
      .catch(() => {});
  }, [can]);

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);
  const rolesById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles]);

  const createFields = useMemo(
    () => [
      { name: 'name', label: 'Name', required: true },
      { name: 'username', label: 'Username (login ID, optional)' },
      { name: 'email', label: 'Email' },
      { name: 'phone', label: 'Phone No', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
      { name: 'roleId', label: 'Role', type: 'select', required: true, options: roleOptions },
    ],
    [roleOptions]
  );

  const editFields = useMemo(
    () => [
      { name: 'name', label: 'Name' },
      { name: 'username', label: 'Username (login ID)' },
      { name: 'email', label: 'Email' },
      { name: 'phone', label: 'Phone No' },
      { name: 'roleId', label: 'Role', type: 'select', options: roleOptions },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'disabled', label: 'Disabled' },
        ],
      },
    ],
    [roleOptions]
  );

  return (
    <ResourcePage
      title="Users"
      module="users"
      endpoint="/users"
      searchable={false}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'username', label: 'Username', render: (row) => row.username || '—' },
        { key: 'phone', label: 'Phone No' },
        { key: 'email', label: 'Email' },
        { key: 'role_name', label: 'Role', render: (row) => rolesById[row.role_id]?.name || row.role_name },
        { key: 'status', label: 'Status' },
      ]}
      fields={{ create: createFields, edit: editFields }}
      emptyMessage="No staff/admin accounts yet."
    />
  );
}
