import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Logo from './Logo';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('workplace_sidebar_collapsed', collapsed ? 'true' : 'false'); } catch { /* best-effort */ }
  }, [collapsed]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function close(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [userMenuOpen]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';
  const roles = user?.roles || [];

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
          <div className="px-4 h-14 flex items-center justify-between">
            <Logo />
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-workplace-teal-600 hover:bg-workplace-teal-700 text-white flex items-center justify-center font-semibold text-sm transition-colors"
                aria-label="User menu"
              >
                {initials}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {user ? `${user.first_name} ${user.last_name}` : ''}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">{roles.join(', ')}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
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
