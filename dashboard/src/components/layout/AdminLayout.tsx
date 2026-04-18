import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, RefreshCw, Database, LineChart, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminLayout() {
  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Scraper', path: '/scraper', icon: RefreshCw },
    { name: 'Data Control', path: '/data', icon: Database },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground dark">
      {/* Sidebar Persistent (Kiri) */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-status-amber/20 p-2 rounded-lg text-status-amber">
            <Zap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">Bible Admin</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm",
                  isActive
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-surface-container-high hover:text-primary"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 text-xs text-muted-foreground border-t border-border">
          Phase 1 System
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
