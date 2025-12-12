import React, { useEffect, useRef, useState } from 'react';
import { AIDemo } from '../types';
import { fetchAIDemos } from '../services/dataService';
import PlayButton from './PlayButton';
import Loader from './Loader';

const parseDemoTags = (tags?: string | null) => {
  if (!tags) return [];
  return tags
    .split(/[,，\s]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const resolveDemoUrl = (demo: AIDemo) => {
  if (demo.external_url) return demo.external_url;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const cleanBundle = (demo.bundle_path || demo.slug || '')
    .replace(/^\/+/, '')
    .replace(/^aiLab\//, '')
    .replace(/\/+$/, '');
  const entryFile = (demo.entry_file || 'index.html').replace(/^\/+/, '');
  const pathSegments = ['aiLab', cleanBundle || demo.slug, entryFile].filter(Boolean);
  const path = pathSegments.join('/');
  const url = `${base}/${path}`.replace(/\/{2,}/g, '/');
  return url.startsWith('http') ? url : url.startsWith('/') ? url : `/${url}`;
};

export const AIDemoView: React.FC = () => {
  const [demos, setDemos] = useState<AIDemo[]>([]);
  const [demosLoading, setDemosLoading] = useState(true);
  const [demosError, setDemosError] = useState<string | null>(null);
  const [demosHasMore, setDemosHasMore] = useState(false);
  const [demosPage, setDemosPage] = useState(0);
  
  // 使用 useRef 防止组件意外重新挂载导致的重复请求
  const hasLoadedRef = useRef(false);

  const PAGE_SIZE = 12;

  // 加载 Demos 数据
  const loadDemos = async (page: number) => {
    const MIN_LOADING_MS = 900;
    const start = performance.now();
    setDemosLoading(true);
    setDemosError(null);
    try {
      const data = await fetchAIDemos({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
      setDemos(data);
      setDemosHasMore(data.length === PAGE_SIZE);
      setDemosPage(page);
    } catch (err: any) {
      console.error('Failed to load AI demos', err);
      setDemosError('AI Demo 列表暂时不可用。');
      setDemos([]);
      setDemosHasMore(false);
      // 如果是初始加载失败，重置标志允许重试
      if (page === 0) {
        hasLoadedRef.current = false;
      }
    } finally {
      const elapsed = performance.now() - start;
      const remaining = MIN_LOADING_MS - elapsed;
      if (remaining > 0) {
        setTimeout(() => setDemosLoading(false), remaining);
      } else {
        setDemosLoading(false);
      }
    }
  };

  // 初始加载
  useEffect(() => {
    // 如果已经加载过，直接返回（防止 StrictMode 或组件重新挂载导致的重复请求）
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;
    loadDemos(0);
  }, []);

  const handleDemosPreviousPage = () => {
    if (demosPage > 0) {
      loadDemos(demosPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDemosNextPage = () => {
    if (demosHasMore) {
      loadDemos(demosPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (demosLoading) {
    return <Loader fullscreen />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 via-accent-500 to-primary-300 mb-4">
          AI 实验 Demo
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          连接各大 AI 模型与自研 API，将灵感快速变成可交互的体验。
        </p>
      </div>

      <section className="mb-16 animate-fade-in">
        {demosError && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-sm text-red-500 mb-8">
            {demosError}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {demos.map((demo) => {
            const tags = parseDemoTags(demo.tags);
            const targetUrl = resolveDemoUrl(demo);
            return (
              <article
                key={demo.id}
                className="group relative glass-card rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700/80 hover:border-blue-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                  {demo.cover_image ? (
                    <img src={demo.cover_image} alt={demo.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">🤖</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 px-2 py-1 text-[10px] font-semibold rounded-full bg-black/40 text-white backdrop-blur-sm">
                    {demo.category || 'AI Lab'}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span>{demo.is_featured ? '✨ 精选' : '实验'}</span>
                    <span>•</span>
                    <span>{new Date(demo.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      {demo.view_count || 0}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-500 transition-colors">
                    {demo.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {demo.description || '暂无简介'}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <PlayButton onClick={() => window.open(targetUrl, '_blank')} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* 分页控件 */}
        {demos.length > 0 && (
          <div className="flex items-center justify-center gap-4 py-8">
            <button
              onClick={handleDemosPreviousPage}
              disabled={demosPage === 0 || demosLoading}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${demosPage === 0 || demosLoading
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
            >
              上一页
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              第 {demosPage + 1} 页
            </span>
            <button
              onClick={handleDemosNextPage}
              disabled={!demosHasMore || demosLoading}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!demosHasMore || demosLoading
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
            >
              下一页
            </button>
          </div>
        )}

        {demos.length === 0 && !demosLoading && (
          <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
            暂无 Demo
          </div>
        )}
      </section>
    </div>
  );
};

