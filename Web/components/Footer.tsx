import React from 'react';

export const Footer: React.FC = () => {
  const links = [
    { label: 'GitHub', href: '#' }
  ];

  return (
    <footer className="mt-16 border-t-2 border-primary-200/60 dark:border-primary-700/40 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 backdrop-blur-xl shadow-xl shadow-primary-500/5 dark:shadow-primary-500/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
        <p className="font-semibold text-gray-700 dark:text-gray-300">TianJQ.Space</p>
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
