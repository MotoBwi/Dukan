import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import ResourceForm from './ResourceForm';

/**
 * Generic list + create/edit/delete page driven by a declarative config.
 * Keeps every module (customers, items, purchases, ...) to a thin config file
 * instead of duplicating table/modal/permission wiring per page.
 */
export default function ResourcePage({
  title,
  module,
  endpoint,
  columns,
  fields,
  searchable = true,
  extraQuery,
  emptyMessage = 'No records yet.',
  deletable = true,
  editable = true,
  renderCreateForm,
}) {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const canRead = can(module, 'read');
  const canCreate = can(module, 'create');
  const canUpdate = can(module, 'update') && editable;
  const canDelete = can(module, 'delete') && deletable;

  const load = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError('');
    try {
      const query = { ...(extraQuery || {}) };
      if (searchable) query.search = search;
      const data = await api.get(endpoint, query);
      setRows(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, search, canRead]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(values) {
    await api.post(endpoint, fields.toPayload ? fields.toPayload(values) : values);
    setShowCreate(false);
    load();
  }

  async function handleEdit(values) {
    await api.patch(`${endpoint}/${editRow.id}`, fields.toPayload ? fields.toPayload(values) : values);
    setEditRow(null);
    load();
  }

  async function handleDelete() {
    setDeleteBusy(true);
    try {
      await api.delete(`${endpoint}/${deleteRow.id}`);
      setDeleteRow(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You don't have permission to view {title}.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        <div className="flex items-center gap-2">
          {searchable && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}
          {canCreate && (fields?.create || renderCreateForm) && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2 text-left font-medium text-slate-500">
                  {col.label}
                </th>
              ))}
              {(canUpdate || canDelete) && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (canUpdate || canDelete ? 1 : 0)} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (canUpdate || canDelete ? 1 : 0)} className="px-4 py-6 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2 text-slate-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {(canUpdate || canDelete) && (
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {canUpdate && fields?.edit && (
                        <button
                          onClick={() => setEditRow(row)}
                          className="mr-3 text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteRow(row)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && renderCreateForm && (
        <Modal title={`Add ${title}`} onClose={() => setShowCreate(false)} wide>
          {renderCreateForm({ onSubmit: handleCreate, onCancel: () => setShowCreate(false) })}
        </Modal>
      )}

      {showCreate && !renderCreateForm && fields?.create && (
        <Modal title={`Add ${title}`} onClose={() => setShowCreate(false)}>
          <ResourceForm
            fields={fields.create}
            initialValues={fields.defaultValues ? fields.defaultValues() : {}}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {editRow && fields?.edit && (
        <Modal title={`Edit ${title}`} onClose={() => setEditRow(null)}>
          <ResourceForm
            fields={fields.edit}
            initialValues={fields.toFormValues ? fields.toFormValues(editRow) : editRow}
            onSubmit={handleEdit}
            onCancel={() => setEditRow(null)}
            submitLabel="Save"
          />
        </Modal>
      )}

      {deleteRow && (
        <ConfirmDialog
          message={`Delete this ${title.toLowerCase().replace(/s$/, '')}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteRow(null)}
          busy={deleteBusy}
        />
      )}
    </div>
  );
}
