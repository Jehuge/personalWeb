import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitch from '../ui/ThemeSwitch';
import CubeLogo from '../ui/CubeLogo';
import GitHubButton from '../ui/GitHubButton';

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
    { id: 'video', path: '/video', label: '视频' },
    { id: 'ai-gallery', path: '/ai-gallery', label: 'AI 图库' },
    { id: 'ai-demo', path: '/ai-demo', label: 'AI Demo' },
    { id: 'ai-project', path: '/ai-project', label: '个人项目' },
  ];

  // 判断是否在详情页（有 ID 参数）
  const isInDetail = /^\/(blog|gallery|video)\/\d+$/.test(location.pathname);
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
        {/* 顶部栏：浅色模式降低透明度，深色保持纯色 */}
        <div
          className={`site-navbar rounded-b-2xl px-4 sm:px-6 md:px-8 transition-colors duration-300 backdrop-blur-2xl ${
            theme === 'dark'
              ? 'bg-slate-900/40 shadow-lg shadow-black/10'
              : 'bg-white/40 shadow-[0_8px_20px_rgba(0,0,0,0.04)]'
          }`}
        >
        <div className="flex items-center h-12">
          {/* Left side: Back button or Logo */}
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-base font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {backLabel}
              </button>
            ) : (
              <Link to="/" className="flex-shrink-0 flex items-center cursor-pointer group">
                <CubeLogo size={28} className="mr-2" />
                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  TianJQ<span className="text-gray-600 dark:text-gray-400">.Space</span>
                </span>
              </Link>
            )}
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2 flex-1 justify-center">
            {navItems.map((item) => {
              const isCurrent = isActive(item.path);
              const shared =
                'relative px-3 py-1.5 rounded-2xl text-base font-display font-medium tracking-tight transition-all duration-300 ease-out overflow-hidden group active:scale-[0.97]';
              const activeClass =
                'bg-gray-100 text-gray-900 shadow-lg shadow-gray-500/20 ring-1 ring-white/70 dark:bg-gray-800 dark:text-white dark:shadow-gray-600/30 translate-y-0';
              const inactiveClass =
                'text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:-translate-y-[1px] hover:shadow-md hover:shadow-gray-500/10 dark:text-white/85 dark:bg-white/10 dark:hover:bg-white/20 dark:hover:shadow-[0_0_24px_rgba(107,114,128,0.3)]';
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`${shared} ${isCurrent ? activeClass : inactiveClass}`}
                >
                  <span
                    className={`relative z-10 transition-transform duration-300 ${
                      isCurrent ? 'scale-105' : 'group-hover:scale-105'
                    }`}
                  >
                    {item.label}
                  </span>
                  {/* 柔和的背景光晕 */}
                  <span
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-500/30 via-gray-400/15 to-gray-600/20 blur-xl transition-opacity duration-300 ${
                      isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'
                    }`}
                  />
                  {/* 底部滑动条指示器 */}
                  <span
                    className={`pointer-events-none absolute left-4 right-4 -bottom-1 h-[2px] rounded-full bg-gradient-to-r from-gray-500 via-gray-600 to-gray-500 transform origin-center transition-transform duration-300 ${
                      isCurrent ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              );
            })}

          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <GitHubButton />
              <ThemeSwitch
                checked={theme === 'dark'}
                onToggle={toggleTheme}
                size={5}
                className="translate-y-[2px]"
              />
            </div>
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
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed top-12 left-0 right-0 z-40 md:hidden mx-0 px-4">
          {/* Mobile dropdown：浅色模式保持柔和渐变，深色模式改为纯深色背景，和顶部栏一致 */}
          <div className={`backdrop-blur-2xl rounded-2xl overflow-hidden animate-slide-up shadow-xl shadow-gray-500/8 dark:shadow-black/40 border border-gray-200/70 dark:border-slate-700/80 transition-transform duration-300 ease-out ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-white/40'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const isCurrent = isActive(item.path);
              const shared =
                'block w-full text-left px-3 py-2 rounded-2xl text-base font-display font-medium tracking-tight transition-all duration-200 ease-out active:scale-[0.97]';
              const activeClass =
                'bg-gray-100 text-gray-900 shadow-lg shadow-gray-500/20 dark:bg-gray-800 dark:text-white';
              const inactiveClass =
                'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-white/85 dark:bg-white/10 dark:hover:bg-white/20';
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${shared} ${isCurrent ? activeClass : inactiveClass}`}
                >
                  <span
                    className={`inline-block transition-transform duration-200 ${
                      isCurrent ? 'scale-[1.03]' : 'group-hover:scale-[1.03]'
                    }`}
                  >
                    {item.label}
                  </span>
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
                size={6}
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