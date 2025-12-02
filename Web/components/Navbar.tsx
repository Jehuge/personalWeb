import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import ThemeSwitch from './ThemeSwitch';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileThemeToggle = () => {
    toggleTheme();
    setIsMobileMenuOpen(false);
  };

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
              const shared =
                'relative px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-300 overflow-hidden group';
              const activeClass =
                'bg-[#e3f0ff] text-[#1f2937] shadow-lg shadow-primary-500/40 ring-1 ring-white/70 dark:bg-[#cfe2ff] dark:text-[#0b1120] dark:shadow-[#a5b4fc]/40 translate-y-0';
              const inactiveClass =
                'text-gray-700 hover:text-primary-600 hover:bg-primary-50 hover:-translate-y-[1px] hover:shadow-md hover:shadow-primary-500/20 dark:text-white/85 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:shadow-[0_0_24px_rgba(129,140,248,0.45)]';
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`${shared} ${isCurrent ? activeClass : inactiveClass}`}
                >
                  <span className="relative z-10">{item.label}</span>
                  {/* 柔和的背景光晕 */}
                  <span
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-primary-500/40 via-purple-500/25 to-sky-400/30 blur-xl transition-opacity duration-300 ${
                      isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'
                    }`}
                  />
                  {/* 底部滑动条指示器 */}
                  <span
                    className={`pointer-events-none absolute left-4 right-4 -bottom-1 h-[2px] rounded-full bg-gradient-to-r from-primary-500 via-sky-400 to-purple-500 transform origin-center transition-transform duration-300 ${
                      isCurrent ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              );
            })}

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />

            {/* Theme Toggle - BB8 Switch */}
            <ThemeSwitch
              checked={theme === 'dark'}
              onToggle={toggleTheme}
              size={6}
              className="translate-y-[4px]"
            />
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
            <div className="flex items-center justify-between px-3 py-3">
              <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                主题
              </span>
              <ThemeSwitch
                checked={theme === 'dark'}
                onToggle={handleMobileThemeToggle}
                size={7}
                className="translate-y-[4px]"
              />
            </div>
          </div>
          </div>
        </div>
      )}
    </nav>
  );
};