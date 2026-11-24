import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const AppLayout = () => (
  <div className="flex h-screen bg-slate-50">
    <Sidebar />
    <div className="flex flex-1 flex-col min-w-0">
      <Header />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  </div>
)
