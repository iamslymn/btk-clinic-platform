
import { LogOut, User, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { t } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { getUnreadCount } from '../lib/api/notifications';
import { NavLink } from 'react-router-dom';

export default function Header() {
  const { userProfile, signOut } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let timer: any;
    const load = async () => {
      try { const c = await getUnreadCount(); setUnread(c); } catch {}
      timer = setTimeout(load, 15000);
    };
    load();
    return () => timer && clearTimeout(timer);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('headers.platform')}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <NavLink to="/notifications" className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] leading-none rounded-full bg-red-500 text-white px-1.5 py-0.5">{unread}</span>
            )}
          </NavLink>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                {userProfile?.manager?.full_name || 
                 userProfile?.representative?.full_name || 
                 userProfile?.email}
              </span>
              <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                {userProfile?.role?.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
              title={t('auth.signOut')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}