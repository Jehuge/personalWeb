import React, { useState } from 'react';
import { useTheme } from './ThemeContext';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, showBack = false, onBack, backLabel = '返回' }) => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: '首页' },
    { id: 'blog', label: '博客' },
    { id: 'gallery', label: '摄影' },
    { id: 'ai', label: 'AI 实验室' },
  ];

  return (
    <nav className="sticky top-4 z-50 w-full max-w-7xl mx-auto px-4 md:px-6">
      <div className="glass-card rounded-2xl px-6 sm:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left side: Back button or Logo */}
          <div className="flex items-center gap-3">
            {showBack && onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {backLabel}
              </button>
            ) : (
              <div className="flex-shrink-0 flex items-center cursor-pointer group" onClick={() => onTabChange('home')}>
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg mr-2 flex items-center justify-center text-white font-bold text-lg group-hover:rotate-12 transition-transform">
                  A
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  TianJQ<span className="text-primary-500">.Space</span>
                </span>
              </div>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === item.id
                  ? 'bg-gray-100 dark:bg-white/10 text-primary-600 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
              >
                {item.label}
              </button>
            ))}

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="切换主题"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-2 glass-card rounded-2xl overflow-hidden animate-slide-up">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-3 rounded-xl text-base font-medium ${activeTab === item.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                toggleTheme();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-3 rounded-xl text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {theme === 'light' ? '切换到夜间模式' : '切换到日间模式'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};