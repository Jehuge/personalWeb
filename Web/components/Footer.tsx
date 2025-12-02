import React from 'react';

export const Footer: React.FC = () => {
  const links = [
    { label: 'GitHub', href: '#' }
  ];

  return (
    <footer className="site-footer mt-16 border-t border-gray-200/70 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-900 backdrop-blur-xl shadow-inner shadow-primary-500/5 dark:shadow-black/40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-slate-400">
        <p className="font-semibold text-gray-700 dark:text-slate-200">TianJQ.Space</p>
        <div className="flex items-center gap-4">
          {links.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
