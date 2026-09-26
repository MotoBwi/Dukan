import ResourcePage from '../components/ResourcePage';
import ReturnForm from './ReturnForm';

export default function ReturnsPage() {
  return (
    <ResourcePage
      title="Returns"
      module="returns"
      endpoint="/returns"
      searchable={false}
      columns={[
        { key: 'customer_name', label: 'Customer', render: (row) => row.customer_name || '—' },
        { key: 'item_name', label: 'Item Name' },
        { key: 'sale_id', label: 'Sale #', render: (row) => (row.bill_id ? `${row.sale_id} (Bill #${row.bill_id})` : row.sale_id) },
        { key: 'unit', label: 'Measurement' },
        { key: 'qty', label: 'Qty' },
        { key: 'price', label: 'Price' },
        { key: 'amount', label: 'Amount' },
        { key: 'return_date', label: 'Date' },
        { key: 'reason', label: 'Reason' },
      ]}
      fields={{}}
      renderCreateForm={({ onSubmit, onCancel }) => <ReturnForm onSubmit={onSubmit} onCancel={onCancel} />}
    />
  );
}
