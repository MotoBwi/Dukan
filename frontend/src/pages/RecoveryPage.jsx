import { useEffect, useMemo, useState } from 'react';
import ResourcePage from '../components/ResourcePage';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PAYMENT_MODE_OPTIONS = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank' },
];

const editFields = [
  { name: 'amount', label: 'Amount (dues are re-balanced automatically)', type: 'number', step: '0.01', required: true },
  { name: 'paymentMode', label: 'Mode of Payment', type: 'select', required: true, options: PAYMENT_MODE_OPTIONS },
  { name: 'collectedBy', label: 'Collected By' },
  { name: 'paymentDate', label: 'Payment Date', type: 'date', required: true },
  { name: 'note', label: 'Note', type: 'textarea' },
];

const toFormValues = (row) => ({
  amount: row.amount,
  paymentMode: row.payment_mode,
  collectedBy: row.collected_by || '',
  paymentDate: row.payment_date,
  note: row.note || '',
});

export default function RecoveryPage() {
  const { can, user } = useAuth();
  const isSuperAdmin = user?.role_name === 'SUPER_ADMIN';
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (!can('customers', 'read')) return;
    api
      .get('/customers', { limit: 200 })
      .then(setCustomers)
      .catch(() => {});
  }, [can]);

  const createFields = useMemo(
    () => [
      {
        name: 'customerId',
        label: 'Customer',
        type: 'select',
        required: true,
        options: customers.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` })),
      },
      { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
      {
        name: 'paymentMode',
        label: 'Mode of Payment',
        type: 'select',
        required: true,
        options: [
          { value: 'UPI', label: 'UPI' },
          { value: 'CASH', label: 'Cash' },
          { value: 'BANK', label: 'Bank' },
        ],
      },
      { name: 'collectedBy', label: 'Collected By', required: true },
      { name: 'paymentDate', label: 'Payment Date', type: 'date', required: true },
      { name: 'note', label: 'Note', type: 'textarea' },
    ],
    [customers]
  );

  return (
    <ResourcePage
      title="Recovery"
      module="recovery"
      endpoint="/recovery"
      searchable={false}
      deletable={false}
      editable={isSuperAdmin}
      columns={[
        {
          key: 'customer_id',
          label: 'Customer',
          render: (row) => row.customer_name || `#${row.customer_id}`,
        },
        { key: 'amount', label: 'Amount' },
        { key: 'payment_mode', label: 'Mode', render: (row) => row.payment_mode },
        { key: 'collected_by', label: 'Collected By', render: (row) => row.collected_by || '—' },
        { key: 'payment_date', label: 'Date' },
        { key: 'note', label: 'Note' },
      ]}
      fields={{ create: createFields, edit: editFields, toFormValues }}
    />
  );
}
