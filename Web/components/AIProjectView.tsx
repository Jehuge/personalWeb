import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIDemo, AIProject } from '../types';
import { fetchAIDemos, fetchAIProjects } from '../services/dataService';
import PlayButton from './PlayButton';
import Loader from './Loader';

// 检查页面是否可见
const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return isVisible;
};

const parseTechStack = (stack?: string | null) => {
  if (!stack) return [];
  try {
    const maybeJson = JSON.parse(stack);
    if (Array.isArray(maybeJson)) {
      return maybeJson.map((item) => String(item));
    }
  } catch {
    // not JSON, fall back to comma split
  }
  return stack
    .split(/[,，·\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

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

export const AIProjectView: React.FC = () => {
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [demos, setDemos] = useState<AIDemo[]>([]);
  const [demosLoading, setDemosLoading] = useState(true);
  const [demosLoadingMore, setDemosLoadingMore] = useState(false);
  const [demosError, setDemosError] = useState<string | null>(null);
  const [demosHasMore, setDemosHasMore] = useState(true);
  const [demosPage, setDemosPage] = useState(0);
  const demosLoadMoreRef = useRef<HTMLDivElement>(null);
  const DEMOS_PAGE_SIZE = 12;
  const isVisible = usePageVisibility();

  // 初始加载 AI Projects（仅用于 Spotlight，只加载少量数据）
  useEffect(() => {
    setProjectsLoading(true);
    const MIN_LOADING_MS = 900;
    const start = performance.now();

    fetchAIProjects({ skip: 0, limit: 5 })
      .then((data) => {
        setProjects(data);
      })
      .catch((err) => {
        console.error('Failed to load AI projects', err);
      })
      .finally(() => {
        const elapsed = performance.now() - start;
        const remaining = MIN_LOADING_MS - elapsed;
        if (remaining > 0) {
          setTimeout(() => setProjectsLoading(false), remaining);
        } else {
          setProjectsLoading(false);
        }
      });
  }, []);

  // 初始加载 AI Demos
  useEffect(() => {
    setDemosLoading(true);
    setDemos([]);
    setDemosPage(0);
    setDemosHasMore(true);
    const MIN_LOADING_MS = 900;
    const start = performance.now();

    fetchAIDemos({ skip: 0, limit: DEMOS_PAGE_SIZE })
      .then((data) => {
        setDemos(data);
        setDemosHasMore(data.length === DEMOS_PAGE_SIZE);
        setDemosError(null);
      })
      .catch((err) => {
        console.error('Failed to load AI demos', err);
        setDemosError('AI Demo 列表暂时不可用。');
      })
      .finally(() => {
        const elapsed = performance.now() - start;
        const remaining = MIN_LOADING_MS - elapsed;
        if (remaining > 0) {
          setTimeout(() => setDemosLoading(false), remaining);
        } else {
          setDemosLoading(false);
        }
      });
  }, []);

  // AI Demos 无限滚动 - 添加页面可见性检测
  useEffect(() => {
    if (!demosHasMore || demosLoading || demosLoadingMore || !isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 只在页面可见时加载
        if (entries[0].isIntersecting && demosHasMore && !demosLoadingMore && !document.hidden) {
          loadMoreDemos();
        }
      },
      { threshold: 0.1, rootMargin: '200px' } // 提前 200px 开始加载
    );

    if (demosLoadMoreRef.current) {
      observer.observe(demosLoadMoreRef.current);
    }

    return () => {
      if (demosLoadMoreRef.current) {
        observer.unobserve(demosLoadMoreRef.current);
      }
    };
  }, [demosHasMore, demosLoading, demosLoadingMore, isVisible]);

  const loadMoreDemos = async () => {
    if (demosLoadingMore || !demosHasMore) return;
    
    setDemosLoadingMore(true);
    const nextPage = demosPage + 1;
    
    try {
      const newDemos = await fetchAIDemos({ skip: nextPage * DEMOS_PAGE_SIZE, limit: DEMOS_PAGE_SIZE });
      if (newDemos.length === 0) {
        setDemosHasMore(false);
      } else {
        setDemos(prev => [...prev, ...newDemos]);
        setDemosPage(nextPage);
        setDemosHasMore(newDemos.length === DEMOS_PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load more demos', err);
    } finally {
      setDemosLoadingMore(false);
    }
  };

  const featuredProject = useMemo(() => {
    return projects.find((p) => p.is_featured) || projects[0];
  }, [projects]);

  if (projectsLoading && demosLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4">
          AI 实验室
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          连接 Gemini 与自研 API，将灵感快速变成可交互的体验。
        </p>
      </div>

      <section className="mb-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">AI Lab Demo Gallery</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              所有入口由后台统一配置，静态源来自 Web/public/aiLab。
            </p>
          </div>
          {demosLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
              正在同步
            </div>
          )}
        </div>
        {demosError && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-sm text-red-500 mb-8">
            {demosError}
          </div>
        )}
        {!demosLoading && !demosError && demos.length === 0 && (
          <div className="p-10 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-3xl">
            Demo 列表为空，请先在后台创建并发布。
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {demos.map((demo) => {
            const tags = parseDemoTags(demo.tags);
            const targetUrl = resolveDemoUrl(demo);
            return (
              <article
                key={demo.id}
                className="ai-demo-card glass-card rounded-3xl p-6 border border-gray-100 dark:border-slate-700/80 hover:border-primary-200/60 dark:hover:border-primary-500/40 transition-colors duration-200 flex flex-col"
              >
                {demo.cover_image && (
                  <div className="relative mb-5 rounded-2xl overflow-hidden">
                    <img src={demo.cover_image} alt={demo.title} className="w-full h-48 object-cover" loading="lazy" />
                    <span className="absolute top-3 right-3 px-2 py-1 text-[10px] font-semibold rounded-full bg-black/40 text-white">
                      {demo.category || 'AI Lab'}
                    </span>
                  </div>
                )}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <span>{demo.is_featured ? '精选实验' : '快速实验'}</span>
                    <span>·</span>
                    <span>/{demo.bundle_path || demo.slug}/{demo.entry_file || 'index.html'}</span>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{demo.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">
                    {demo.description || '暂无简介'}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-3">
                    <div className="flex-1">
                      <PlayButton onClick={() => window.open(targetUrl, '_blank')} />
                    </div>
                    {demo.external_url && (
                      <a
                        href={demo.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        外部入口
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* AI Demos 无限滚动触发器 */}
        {demosHasMore && (
          <div ref={demosLoadMoreRef} className="flex justify-center py-8">
            {demosLoadingMore && (
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent" />
            )}
          </div>
        )}

        {!demosHasMore && demos.length > 0 && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            已加载全部 Demo
          </div>
        )}
      </section>

      {/* Spotlight */}
      <section className="mb-16">
        <div className="max-w-md space-y-6">
          {featuredProject ? (
            <div className="glass-card p-6 rounded-3xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Spotlight</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{featuredProject.title}</h3>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-semibold rounded-full">
                  {featuredProject.is_published ? 'Live' : 'Draft'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">
                {featuredProject.description || '暂无简介'}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {parseTechStack(featuredProject.tech_stack).slice(0, 4).map((stack) => (
                  <span key={stack} className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {stack}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                {featuredProject.demo_url && (
                  <a
                    href={featuredProject.demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  >
                    在线体验
                  </a>
                )}
                {featuredProject.github_url && (
                  <a
                    href={featuredProject.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    GitHub
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 rounded-3xl text-sm text-gray-500 dark:text-gray-400">
              暂无公开的 AI 项目，敬请期待。
            </div>
          )}
        </div>
      </section>
    </div>
  );
};