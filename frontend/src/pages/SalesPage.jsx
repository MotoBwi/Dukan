import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage';
import SalesBillForm from './SalesBillForm';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SalesPage() {
  const { can } = useAuth();
  const [items, setItems] = useState([]);

  const canReadItems = can('items', 'read');

  const loadItems = useCallback(() => {
    if (!canReadItems) return;
    api
      .get('/items/options')
      .then(setItems)
      .catch(() => {});
  }, [canReadItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <ResourcePage
      title="Sales"
      module="sales"
      endpoint="/sales"
      searchable={false}
      columns={[
        {
          key: 'bill_id',
          label: 'Bill # (invoice)',
          render: (row) =>
            row.bill_id ? (
              <Link to={`/invoices/${row.bill_id}`} className="text-indigo-600 hover:underline" title="Open invoice">
                {row.bill_id}
              </Link>
            ) : (
              '—'
            ),
        },
        {
          key: 'customer_id',
          label: 'Customer',
          render: (row) => row.customer_name || `#${row.customer_id}`,
        },
        { key: 'item_name', label: 'Item Name' },
        { key: 'unit', label: 'Measurement' },
        { key: 'qty', label: 'Qty' },
        { key: 'price', label: 'Price' },
        { key: 'amount', label: 'Amount' },
        { key: 'paid_amount', label: 'Paid' },
        { key: 'due_amount', label: 'Due' },
        { key: 'sale_date', label: 'Date' },
      ]}
      fields={{}}
      renderCreateForm={({ onSubmit, onCancel }) => (
        <SalesBillForm
          items={items}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onCreated={loadItems}
        />
      )}
    />
  );
}
