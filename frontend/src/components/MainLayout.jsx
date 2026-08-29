import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

const STAFF_NAV = [
  { to: '/companies', label: 'Companies' },
  { to: '/campaigns', label: 'Internships' },
];
const STUDENT_NAV = [
  { to: '/my-internship', label: 'My Internship' },
];

function isStudentOnly(user) {
  const roles = user?.roles || [];
  return roles.includes('student') && !roles.some((r) => ['admin', 'coordinator', 'teacher'].includes(r));
}

function isCoordinator(user) {
  const roles = user?.roles || [];
  return roles.includes('coordinator') || roles.includes('admin');
}

function isAdmin(user) {
  return (user?.roles || []).includes('admin');
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  let navItems = isStudentOnly(user) ? STUDENT_NAV : STAFF_NAV;
  if (isCoordinator(user)) navItems = [...navItems, { to: '/classes', label: 'Classes' }, { to: '/monitoring', label: 'Monitoring' }];
  if (isAdmin(user)) navItems = [...navItems, { to: '/users', label: 'Users' }];

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('workplace_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('workplace_sidebar_collapsed', collapsed ? 'true' : 'false'); } catch { /* best-effort */ }
  }, [collapsed]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white rounded shadow p-2"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        <span className="block w-6 h-0.5 bg-slate-700 mb-1" />
        <span className="block w-6 h-0.5 bg-slate-700 mb-1" />
        <span className="block w-6 h-0.5 bg-slate-700" />
      </button>

      <div className={mobileOpen ? 'block' : 'hidden md:block'}>
        <Sidebar navItems={navItems} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      <div className={`flex flex-col min-h-screen transition-all duration-200 ${collapsed ? 'md:ml-16' : 'md:ml-56'}`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-4 h-14 flex items-center justify-end">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {user && <span>{user.first_name} {user.last_name}</span>}
              <button onClick={handleLogout} className="text-slate-400 hover:text-slate-700">Sign out</button>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
