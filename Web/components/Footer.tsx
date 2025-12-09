import React from 'react';

export const Footer: React.FC = () => {
  const icp = {
    label: '湘ICP备2025128832号-2',
    href: 'https://beian.miit.gov.cn/'
  };

  return (
    <footer className="mt-16 border-t border-primary-200/60 dark:border-primary-700/40 bg-slate-50 dark:bg-slate-900/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex flex-col gap-2 text-center md:text-left">
          <a
            href={icp.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {icp.label}
          </a>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            © 2025 TianJQ摄影作品集. 保留所有权利. 代码版权归TianJQ所有
          </p>
        </div>

        <div className="flex flex-col gap-2 text-center md:text-right">
          <div className="flex items-center justify-center md:justify-end flex-wrap gap-2">
            <span className="uppercase tracking-wide text-xs font-semibold text-gray-500 dark:text-gray-400">个人其他网站：</span>
            <a
              href="https://www.jackjiapic.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
            >
              JackJiaPic
            </a>
          </div>
          <a
            href="https://github.com/Jehuge"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
          >
            GitHub：https://github.com/Jehuge
          </a>
        </div>
      </div>
    </footer>
  );
};
