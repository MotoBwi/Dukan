import ResourcePage from '../components/ResourcePage';

const formFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'age', label: 'Age', type: 'number' },
  { name: 'phone', label: 'Phone No', required: true },
  { name: 'address', label: 'Address', type: 'textarea' },
];

export default function CustomersPage() {
  return (
    <ResourcePage
      title="Customers"
      module="customers"
      endpoint="/customers"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'age', label: 'Age' },
        { key: 'phone', label: 'Phone No' },
        { key: 'address', label: 'Address' },
      ]}
      fields={{ create: formFields, edit: formFields }}
    />
  );
}
