import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Tag, 
  Users, 
  UserPlus, 
  X,
  Settings,
  LogOut
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Categories', href: '/categories', icon: Tag },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Fake Users', href: '/fake-users', icon: UserPlus },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BT</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">BeTogether</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    }`
                  }
                  onClick={() => onClose()}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-1">
            <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
            
            {/* User Info */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;