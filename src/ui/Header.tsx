import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Button from '../components/Button'

interface HeaderProps {
  onToggleSidebar: () => void
}

function Header({ onToggleSidebar }: HeaderProps) {
  const role = useSelector((s: RootState) => s.auth.role)
  const userName = useSelector((s: RootState) => s.auth.user)

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-header/100 backdrop-blur">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        <Button variant="ghost" className="md:hidden" onClick={onToggleSidebar}>
          ☰
        </Button>
        <div className="text-lg font-semibold text-gray-900">Dashboard</div>
        <div className="ml-auto flex items-center gap-3">
          {role && (
            <span className="text-xs rounded-full bg-gray-100 border border-gray-200 px-2 py-1 text-gray-700 capitalize">
              {role}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-sm text-gray-800 font-medium">
              {userName || 'User'}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header


