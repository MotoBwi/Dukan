import { useEffect, useState } from 'react';
import ResourcePage from '../components/ResourcePage';
import { api } from '../api/client';

const UNIT_OPTIONS = ['KG', 'PCS', 'GARI_BY_WHEEL', 'TROLLY', 'TIN', 'NUMBER'].map((u) => ({
  value: u,
  label: u.replace(/_/g, ' '),
}));

const formFields = [
  { name: 'name', label: 'Item Name', required: true },
  { name: 'defaultUnit', label: 'Default Unit', type: 'select', options: UNIT_OPTIONS },
];

export default function ItemsPage() {
  const [stock, setStock] = useState([]);

  useEffect(() => {
    api.get('/items/stock').then(setStock).catch(() => {});
  }, []);

  const stockByItem = Object.fromEntries(stock.map((s) => [s.id, s.balance]));

  return (
    <div>
      <ResourcePage
        title="Items"
        module="items"
        endpoint="/items"
        columns={[
          { key: 'name', label: 'Item Name' },
          { key: 'default_unit', label: 'Default Unit' },
          { key: 'stock', label: 'Stock Balance', render: (row) => stockByItem[row.id] ?? '—' },
        ]}
        fields={{ create: formFields, edit: formFields }}
      />
    </div>
  );
}
