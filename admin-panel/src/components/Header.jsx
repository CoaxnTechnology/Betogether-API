import React from 'react';
import { Menu, Bell, Search, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center space-x-3 relative group">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer">
              <User className="w-4 h-4 text-white" />
            </div>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                <p className="text-xs text-blue-600 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;