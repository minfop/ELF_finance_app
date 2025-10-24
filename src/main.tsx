import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/store'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import AppLayout from './ui/AppLayout.tsx'
import ProtectedRoute from './ui/ProtectedRoute.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Users from './pages/Users.tsx'
import Customers from './pages/Customers.tsx'
import CollectionTypes from './pages/CollectionTypes.tsx'
import Loans from './pages/Loans.tsx'
import NotFound from './pages/NotFound.tsx'
import Login from './pages/Login.tsx'
import CreateCompany from './pages/CreateCompany.tsx'
import CreateAdmin from './pages/CreateAdmin.tsx'
import LineTypePage from './pages/LineType.tsx'
import Installments from './pages/Installments.tsx'
import Lines from './pages/Lines.tsx'
import ExpensesTypes from './pages/ExpensesTypes.tsx'
import Expenses from './pages/Expenses.tsx'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/create-company', element: <CreateCompany /> },
  { path: '/create-admin', element: <CreateAdmin /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'users', element: <Users /> },
          { path: 'customers', element: <Customers /> },
          { path: 'collection-types', element: <CollectionTypes /> },
          { path: 'loans', element: <Loans /> },
          { path: 'loans/:loanId/installments', element: <Installments /> },
          { path: 'lines', element: <Lines /> },
          { path: 'expenses-types', element: <ExpensesTypes /> },
              { path: 'expenses', element: <Expenses /> },
          { path: '/line-types', element: <LineTypePage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
