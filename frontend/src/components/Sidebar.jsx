import { NavLink } from 'react-router-dom';
import { FaBuilding, FaClipboardList, FaLayerGroup, FaChartBar, FaUsers, FaUserGraduate, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import Logo from './Logo';

// Same structural pattern as ILS-dev's Sidebar/StaffSidebar: fixed-left,
// collapsible icon-only <-> full width, white background, active item
// highlighted — using Workplace's own teal brand color instead of ILS-dev's
// blue. Workplace's nav is short enough to stay a flat list (no sections).
const ICONS = {
  '/companies':     <FaBuilding />,
  '/campaigns':     <FaClipboardList />,
  '/classes':       <FaLayerGroup />,
  '/monitoring':    <FaChartBar />,
  '/users':         <FaUsers />,
  '/my-internship': <FaUserGraduate />,
};

export default function Sidebar({ navItems, collapsed, onToggle }) {
  return (
    <aside className={`fixed left-0 top-0 h-screen ${collapsed ? 'w-16' : 'w-56'} bg-white shadow flex flex-col py-4 px-3 transition-all duration-200 z-40 overflow-hidden`}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onToggle}
          className="p-2 text-slate-500 hover:text-workplace-teal-700"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <FaAngleDoubleRight /> : <FaAngleDoubleLeft />}
        </button>
        {!collapsed && <Logo scale={0.5} />}
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to} to={item.to} title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex ${collapsed ? 'justify-center' : 'items-center gap-3'} px-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-workplace-teal-50 text-workplace-teal-700'
                  : 'text-slate-600 hover:bg-workplace-teal-50 hover:text-workplace-teal-700'
              }`
            }
          >
            <span className="text-base flex-shrink-0">{ICONS[item.to]}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
