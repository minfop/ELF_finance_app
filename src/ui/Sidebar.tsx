import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import type { UserRole } from '../store/slices/authSlice'

interface SidebarProps {
  onNavigate?: () => void
}

type MenuItem = {
  key: string
  label: string
  to: string
  roles: UserRole[]
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', to: '/', roles: ['admin', 'manager', 'collectioner'] },
  { key: 'users', label: 'User Management', to: '/users', roles: ['admin'] },
  { key: 'customers', label: 'Customer Management', to: '/customers', roles: ['admin', 'manager', 'collectioner'] },
  { key: 'collection', label: 'Collection Types', to: '/collection-types', roles: ['admin', 'manager'] },
  { key: 'linetype', label: 'Line Types', to: '/line-types', roles: ['admin', 'manager'] },
  { key: 'loan', label: 'Loan', to: '/loans', roles: ['admin', 'manager', 'collectioner'] },
]

function Sidebar({ onNavigate }: SidebarProps) {
  const role = useSelector((s: RootState) => s.auth.role)

  return (
    <nav className="h-full flex flex-col gap-1">
      <div className="px-2 py-3 text-xl font-semibold text-gray-900">ELF Finance</div>
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {MENU_ITEMS.filter((m) => m.roles.includes(role)).map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium ` +
                  `${isActive ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-700 hover:bg-white/70'}`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export default Sidebar


