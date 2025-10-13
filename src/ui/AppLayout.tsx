import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside
        className={
          `fixed z-40 inset-y-0 left-0 w-72 transform transition-transform duration-200 ease-in-out ` +
          `bg-sidebar border-r border-gray-200 p-4 ` +
          `${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ` +
          `md:static md:translate-x-0 md:w-64`
        }
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="p-4 md:p-6 bg-white flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout


