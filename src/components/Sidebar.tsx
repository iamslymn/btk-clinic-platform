import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Stethoscope, 
  Package, 
  ShoppingBag, 
  Calendar, 
  ClipboardList, 
  PieChart,
  Settings,
  Link2,
  Tag,
  Building,
  Bell,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROUTES, isRouteActive } from '../lib/routes';
import { t } from '../lib/i18n';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: string[];
  exact?: boolean; // For exact matching (dashboard items)
}

const navItems: NavItem[] = [
  // Super Admin - using new canonical URLs
  { path: ROUTES.SUPER_ADMIN_DASHBOARD, label: t('nav.dashboard'), icon: Home, roles: ['super_admin'], exact: true },
  { path: ROUTES.SUPER_ADMIN_MANAGERS, label: t('nav.managers'), icon: Users, roles: ['super_admin'] },
  { path: '/super-admin/representatives', label: 'Nümayəndələr', icon: Users, roles: ['super_admin'] },
  { path: ROUTES.SUPER_ADMIN_DOCTORS, label: t('nav.doctors'), icon: Stethoscope, roles: ['super_admin'] },
  { path: ROUTES.SUPER_ADMIN_CLINICS, label: t('nav.clinics'), icon: Building, roles: ['super_admin'] },
  { path: ROUTES.SUPER_ADMIN_SPECIALIZATIONS, label: t('nav.specializations'), icon: Stethoscope, roles: ['super_admin'] },
  { path: ROUTES.SUPER_ADMIN_BRANDS, label: t('nav.brands'), icon: Tag, roles: ['super_admin'] },
  { path: ROUTES.SUPER_ADMIN_PRODUCTS, label: t('nav.products'), icon: Package, roles: ['super_admin'] },
  { path: ROUTES.SUPER_ADMIN_REPORTS, label: t('nav.reports'), icon: PieChart, roles: ['super_admin'] },
  { path: '/notifications', label: 'Bildirişlər', icon: Bell, roles: ['super_admin'] },
  
  // Manager - keeping existing structure
  { path: ROUTES.MANAGER_DASHBOARD, label: t('nav.dashboard'), icon: Home, roles: ['manager'], exact: true },
  { path: ROUTES.MANAGER_DOCTORS, label: t('nav.doctors'), icon: Stethoscope, roles: ['manager'] },
  { path: ROUTES.MANAGER_REPRESENTATIVES, label: t('nav.representatives'), icon: Users, roles: ['manager'] },
  { path: ROUTES.MANAGER_ASSIGNMENTS, label: t('nav.visitAssignments'), icon: Link2, roles: ['manager'] },
  { path: ROUTES.MANAGER_BRANDS, label: t('nav.brands'), icon: Tag, roles: ['manager'] },
  { path: ROUTES.MANAGER_PRODUCTS, label: t('nav.products'), icon: ShoppingBag, roles: ['manager'] },
  { path: ROUTES.MANAGER_REPORTS, label: t('nav.reports'), icon: PieChart, roles: ['manager'] },
  { path: '/notifications', label: 'Bildirişlər', icon: Bell, roles: ['manager'] },
  
  // Representative - keeping existing structure
  { path: ROUTES.REP_DASHBOARD, label: t('nav.dashboard'), icon: Home, roles: ['rep'], exact: true },
  { path: ROUTES.REP_SCHEDULE, label: t('nav.schedule'), icon: Calendar, roles: ['rep'] },
  { path: ROUTES.REP_VISITS, label: t('nav.visits'), icon: ClipboardList, roles: ['rep'] },
  { path: '/rep/brands', label: 'Brendlərim', icon: Tag, roles: ['rep'] },
  { path: '/notifications', label: 'Bildirişlər', icon: Bell, roles: ['rep'] },
];

export default function Sidebar() {
  const { role } = useAuth();
  const location = useLocation();
  
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(role || '')
  );

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BTK</span>
          </div>
          <span className="font-semibold text-gray-900">{t('headers.platform').replace('BTK ', '')}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(location.pathname, item.path, item.exact);
              
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50">
            <Settings className="w-5 h-5" />
            {t('nav.settings')}
          </button>
        </div>
      </div>
    </aside>
  );
}