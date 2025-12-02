import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', path: '/', label: '首页' },
    { id: 'blog', path: '/blog', label: '博客' },
    { id: 'gallery', path: '/gallery', label: '摄影' },
    { id: 'ai', path: '/ai', label: 'AI 实验室' },
  ];

  // 判断是否在详情页（有 ID 参数）
  const isInDetail = /^\/(blog|gallery)\/\d+$/.test(location.pathname);
  const showBack = isInDetail;
  const backLabel = isInDetail ? '返回列表' : '返回';

  const handleBack = () => {
    if (isInDetail) {
      // 如果在详情页，返回到对应的列表页
      const basePath = location.pathname.split('/')[1];
      navigate(`/${basePath}`);
    } else {
      // 否则返回首页
      navigate('/');
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full">
      <div className="w-full">
        {/* 顶部栏：使用明显的浅色 / 深色纯色背景，确保一眼能看出变化 */}
        <div className="site-navbar bg-slate-50 dark:bg-slate-900 backdrop-blur-xl rounded-b-2xl px-4 sm:px-6 md:px-8 shadow-md shadow-primary-500/10 dark:shadow-black/50 border-b border-gray-200/70 dark:border-slate-700/80 transition-colors duration-300">
        <div className="flex justify-between h-16 items-center">
          {/* Left side: Back button or Logo */}
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {backLabel}
              </button>
            ) : (
              <Link to="/" className="flex-shrink-0 flex items-center cursor-pointer group">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg mr-2 flex items-center justify-center text-white font-bold text-lg group-hover:rotate-12 transition-transform shadow-md shadow-primary-500/40">
                  A
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  TianJQ<span className="text-primary-500">.Space</span>
                </span>
              </Link>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const isCurrent = isActive(item.path);
              const shared = 'px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-300';
              const activeClass =
                'bg-[#e3f0ff] text-[#1f2937] shadow-lg shadow-primary-500/40 ring-1 ring-white/70 dark:bg-[#cfe2ff] dark:text-[#0b1120] dark:shadow-[#a5b4fc]/40';
              const inactiveClass =
                'text-gray-700 hover:text-primary-600 hover:bg-primary-50 dark:text-white/85 dark:bg-white/10 dark:hover:bg-white/20';
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`${shared} ${isCurrent ? activeClass : inactiveClass}`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700/70 transition-colors border border-transparent dark:border-slate-600/60"
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
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-40 md:hidden mx-0 px-4">
          <div className="bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-[rgba(15,23,42,0.98)] dark:via-[rgba(15,23,42,1)] dark:to-[rgba(15,23,42,0.98)] backdrop-blur-xl rounded-2xl overflow-hidden animate-slide-up shadow-xl shadow-primary-500/10 dark:shadow-black/50 border border-gray-200/70 dark:border-slate-700/80">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const isCurrent = isActive(item.path);
              const shared = 'block w-full text-left px-3 py-3 rounded-2xl text-base font-semibold transition-all duration-200';
              const activeClass =
                'bg-[#e3f0ff] text-[#1f2937] shadow-lg shadow-primary-500/30 dark:bg-[#cfe2ff] dark:text-[#0b1120]';
              const inactiveClass =
                'text-gray-700 hover:bg-primary-50 hover:text-primary-600 dark:text-white/85 dark:bg-white/10 dark:hover:bg-white/20';
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${shared} ${isCurrent ? activeClass : inactiveClass}`}
                >
                  {item.label}
                </Link>
              );
            })}
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
        </div>
      )}
    </nav>
  );
};