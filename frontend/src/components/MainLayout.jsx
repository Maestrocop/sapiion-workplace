import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  if (isAdmin(user)) navItems = [...navItems, { to: '/people', label: 'People' }];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-semibold text-workplace-teal-700">Sapiion Workplace</span>
            <nav className="flex gap-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `text-sm px-2 py-1 rounded ${isActive ? 'text-workplace-teal-700 font-medium' : 'text-slate-500 hover:text-slate-700'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {user && <span>{user.first_name} {user.last_name}</span>}
            <button onClick={handleLogout} className="text-slate-400 hover:text-slate-700">Sign out</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
