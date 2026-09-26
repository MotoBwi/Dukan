import ResourcePage from '../components/ResourcePage';

const UNIT_OPTIONS = ['KG', 'PCS', 'GARI_BY_WHEEL'].map((u) => ({ value: u, label: u.replace(/_/g, ' ') }));

const createFields = [
  { name: 'itemName', label: 'Item Name', required: true },
  { name: 'unit', label: 'Measurement', type: 'select', required: true, options: UNIT_OPTIONS },
  {
    name: 'wheels',
    label: 'Wheels (Gari type)',
    type: 'select',
    required: true,
    options: [4, 6, 10, 12, 14, 16, 18].map((n) => ({ value: n, label: `${n} wheeler` })),
    showIf: (values) => values.unit === 'GARI_BY_WHEEL',
  },
  { name: 'qty', label: 'Qty (kitni gari)', type: 'number', step: '0.01', required: true },
  { name: 'price', label: 'Price (per gari, us wheeler ka rate)', type: 'number', step: '0.01', required: true },
  { name: 'purchaseDate', label: 'Purchase Date', type: 'date', required: true },
  { name: 'note', label: 'Note', type: 'textarea' },
];

export default function PurchasesPage() {
  return (
    <ResourcePage
      title="Purchases"
      module="purchases"
      endpoint="/purchases"
      searchable
      columns={[
        { key: 'item_name', label: 'Item Name' },
        {
          key: 'unit',
          label: 'Measurement',
          render: (row) => (row.wheels ? `GARI BY WHEEL (${row.wheels} wheeler)` : row.unit.replace(/_/g, ' ')),
        },
        { key: 'qty', label: 'Qty' },
        { key: 'price', label: 'Price' },
        { key: 'amount', label: 'Amount' },
        { key: 'purchase_date', label: 'Date' },
      ]}
      fields={{ create: createFields }}
    />
  );
}
