import React from 'react';

export const Footer: React.FC = () => {
  const links = [
    { label: 'GitHub', href: '#' },
    { label: 'Twitter', href: '#' },
    { label: 'Instagram', href: '#' },
  ];

  return (
    <footer className="mt-16 border-t border-white/40 dark:border-white/10 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
        <p>TianJQ.Space</p>
        <div className="flex items-center gap-4">
          {links.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
