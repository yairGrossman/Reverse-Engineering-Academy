import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * App shell: fixed sidebar + top bar + routed content. Owns the mobile
 * sidebar open/close state — the only piece of layout state that exists.
 */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Keying the content wrapper by pathname remounts it on navigation,
  // replaying the .page-enter animation — a lightweight page transition.
  const { pathname } = useLocation();

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <div className="app-layout__main">
        <TopBar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main key={pathname} className="app-layout__content page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
