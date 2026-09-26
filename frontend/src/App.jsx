import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import ItemsPage from './pages/ItemsPage';
import PurchasesPage from './pages/PurchasesPage';
import SalesPage from './pages/SalesPage';
import ReturnsPage from './pages/ReturnsPage';
import RecoveryPage from './pages/RecoveryPage';
import RemindersPage from './pages/RemindersPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import ReportsPage from './pages/ReportsPage';
import LedgerPage from './pages/LedgerPage';
import InvoicePage from './pages/InvoicePage';
import SearchPage from './pages/SearchPage';
import AccountPage from './pages/AccountPage';
import RevenuePage from './pages/RevenuePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/purchases" element={<PurchasesPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/recovery" element={<RecoveryPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/ledger" element={<LedgerPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/revenue" element={<RevenuePage />} />
              <Route path="/invoices" element={<InvoicePage />} />
              <Route path="/invoices/:billId" element={<InvoicePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/roles" element={<RolesPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
