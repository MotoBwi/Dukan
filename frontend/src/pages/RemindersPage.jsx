import ResourcePage from '../components/ResourcePage';
import ReminderForm from './ReminderForm';

function StatusCell({ row }) {
  if (row.status === 'done') {
    return (
      <div>
        <span className="text-green-700">{row.sent_at ? `Sent ${row.sent_at}` : 'Done'}</span>
        {row.last_error && <div className="text-xs text-amber-600">{row.last_error}</div>}
      </div>
    );
  }
  return (
    <div>
      <span className="capitalize">{row.status}</span>
      {row.last_error && <div className="text-xs text-red-600">Email failed: {row.last_error}</div>}
    </div>
  );
}

export default function RemindersPage() {
  return (
    <ResourcePage
      title="Reminders"
      module="reminders"
      endpoint="/reminders"
      searchable={false}
      columns={[
        { key: 'customer_name', label: 'Customer', render: (row) => row.customer_name || '—' },
        { key: 'title', label: 'Title' },
        { key: 'email', label: 'Email', render: (row) => row.email || '—' },
        { key: 'note', label: 'Note' },
        { key: 'remind_at', label: 'Remind At' },
        { key: 'status', label: 'Status', render: (row) => <StatusCell row={row} /> },
      ]}
      fields={{}}
      renderCreateForm={({ onSubmit, onCancel }) => <ReminderForm onSubmit={onSubmit} onCancel={onCancel} />}
    />
  );
}
