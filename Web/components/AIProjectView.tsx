import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateColorPalette, ColorPalette } from '../services/geminiService';
import { AIDemo, AIProject } from '../types';
import { fetchAIDemos, fetchAIProjects } from '../services/dataService';

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
  const [moodInput, setMoodInput] = useState('');
  const [palette, setPalette] = useState<ColorPalette | null>(null);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsLoadingMore, setProjectsLoadingMore] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsHasMore, setProjectsHasMore] = useState(true);
  const [projectsPage, setProjectsPage] = useState(0);
  const projectsLoadMoreRef = useRef<HTMLDivElement>(null);
  const [demos, setDemos] = useState<AIDemo[]>([]);
  const [demosLoading, setDemosLoading] = useState(true);
  const [demosLoadingMore, setDemosLoadingMore] = useState(false);
  const [demosError, setDemosError] = useState<string | null>(null);
  const [demosHasMore, setDemosHasMore] = useState(true);
  const [demosPage, setDemosPage] = useState(0);
  const demosLoadMoreRef = useRef<HTMLDivElement>(null);
  const PROJECTS_PAGE_SIZE = 12;
  const DEMOS_PAGE_SIZE = 12;

  // 初始加载 AI Projects
  useEffect(() => {
    setProjectsLoading(true);
    setProjects([]);
    setProjectsPage(0);
    setProjectsHasMore(true);
    fetchAIProjects({ skip: 0, limit: PROJECTS_PAGE_SIZE })
      .then((data) => {
        setProjects(data);
        setProjectsHasMore(data.length === PROJECTS_PAGE_SIZE);
        setProjectsError(null);
      })
      .catch((err) => {
        console.error('Failed to load AI projects', err);
        setProjectsError('AI 项目暂时无法获取，请稍后再试。');
      })
      .finally(() => setProjectsLoading(false));
  }, []);

  // 初始加载 AI Demos
  useEffect(() => {
    setDemosLoading(true);
    setDemos([]);
    setDemosPage(0);
    setDemosHasMore(true);
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
      .finally(() => setDemosLoading(false));
  }, []);

  // AI Projects 无限滚动
  useEffect(() => {
    if (!projectsHasMore || projectsLoading || projectsLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && projectsHasMore && !projectsLoadingMore) {
          loadMoreProjects();
        }
      },
      { threshold: 0.1 }
    );

    if (projectsLoadMoreRef.current) {
      observer.observe(projectsLoadMoreRef.current);
    }

    return () => {
      if (projectsLoadMoreRef.current) {
        observer.unobserve(projectsLoadMoreRef.current);
      }
    };
  }, [projectsHasMore, projectsLoading, projectsLoadingMore]);

  // AI Demos 无限滚动
  useEffect(() => {
    if (!demosHasMore || demosLoading || demosLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && demosHasMore && !demosLoadingMore) {
          loadMoreDemos();
        }
      },
      { threshold: 0.1 }
    );

    if (demosLoadMoreRef.current) {
      observer.observe(demosLoadMoreRef.current);
    }

    return () => {
      if (demosLoadMoreRef.current) {
        observer.unobserve(demosLoadMoreRef.current);
      }
    };
  }, [demosHasMore, demosLoading, demosLoadingMore]);

  const loadMoreProjects = async () => {
    if (projectsLoadingMore || !projectsHasMore) return;
    
    setProjectsLoadingMore(true);
    const nextPage = projectsPage + 1;
    
    try {
      const newProjects = await fetchAIProjects({ skip: nextPage * PROJECTS_PAGE_SIZE, limit: PROJECTS_PAGE_SIZE });
      if (newProjects.length === 0) {
        setProjectsHasMore(false);
      } else {
        setProjects(prev => [...prev, ...newProjects]);
        setProjectsPage(nextPage);
        setProjectsHasMore(newProjects.length === PROJECTS_PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load more projects', err);
    } finally {
      setProjectsLoadingMore(false);
    }
  };

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

  const handleGenerate = async () => {
    if (!moodInput.trim() || paletteLoading) return;
    setPaletteLoading(true);
    try {
      const result = await generateColorPalette(moodInput);
      setPalette(result);
    } catch (e) {
      alert('生成失败，请重试');
    } finally {
      setPaletteLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4">
          AI 实验室
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          连接 Gemini 与自研 API，将灵感快速变成可交互的体验。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
        {/* Interactive Experiment Card */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2a8 8 0 100-16 8 8 0 000 16z"/></svg>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">AI 情感配色</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Gemini 2.5 Flash</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={moodInput}
                  onChange={(e) => setMoodInput(e.target.value)}
                  placeholder="输入心情或主题，例如：赛博朋克雨夜 / 初春的樱花"
                  className="flex-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                  onClick={handleGenerate}
                  disabled={paletteLoading || !moodInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
                >
                  {paletteLoading ? '生成中...' : '生成'}
                </button>
              </div>

              {palette && (
                <div className="animate-slide-up bg-white dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200">{palette.theme}</h4>
                    <span className="text-xs text-gray-400">AI Generated</span>
                  </div>
                  <div className="flex h-32 rounded-xl overflow-hidden shadow-lg mb-4">
                    {palette.colors.map((color, idx) => (
                      <button 
                        key={idx} 
                        type="button"
                        className="flex-1 flex items-end justify-center pb-2 transition-all hover:flex-[1.5] group/color cursor-pointer focus:outline-none"
                        style={{ backgroundColor: color }}
                        title={color}
                        onClick={() => navigator.clipboard.writeText(color)}
                      >
                        <span className="text-xs bg-black/30 text-white px-1 rounded opacity-0 group-hover/color:opacity-100 transition-opacity backdrop-blur-sm">
                          {color}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {palette.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spotlight */}
        <div className="space-y-6">
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
          <div className="glass-card p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 mb-2">Lab Notes</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              所有项目都由 FastAPI + Vite 驱动，通过统一的接口层完成鉴权、内容管理与部署。
            </p>
          </div>
        </div>
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
                className="glass-card rounded-3xl p-6 border border-gray-100 dark:border-gray-800 hover:border-primary-200/60 dark:hover:border-primary-500/40 transition-colors flex flex-col"
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
                    <button
                      onClick={() => window.open(targetUrl, '_blank')}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    >
                      打开 Demo
                    </button>
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

      <section>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">AI 项目集</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              全部数据实时来自 /api/ai-projects
            </p>
          </div>
          {projectsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
              正在同步
            </div>
          )}
        </div>

        {projectsError && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 text-sm text-red-500 mb-8">
            {projectsError}
          </div>
        )}

        {!projectsLoading && !projectsError && projects.length === 0 && (
          <div className="p-10 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-3xl">
            暂无数据，请先在后台创建项目。
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => {
            const techStack = parseTechStack(project.tech_stack);
            return (
              <article
                key={project.id}
                className="glass-card rounded-3xl p-6 border border-gray-100 dark:border-gray-800 hover:border-primary-300/60 dark:hover:border-primary-500/40 transition-colors flex flex-col"
              >
                {project.cover_image && (
                  <div className="relative mb-5 rounded-2xl overflow-hidden">
                    <img src={project.cover_image} alt={project.title} className="w-full h-48 object-cover" loading="lazy" />
                    <span className="absolute top-3 right-3 px-2 py-1 text-[10px] font-semibold rounded-full bg-black/40 text-white">
                      {project.is_featured ? 'FEATURED' : 'LIVE'}
                    </span>
                  </div>
                )}
                <div className="flex-1 flex flex-col">
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{project.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">
                    {project.description || '暂无简介'}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {techStack.slice(0, 5).map((stack) => (
                      <span key={stack} className="px-2.5 py-1 rounded-full text-[11px] bg-primary-500/10 text-primary-600 dark:text-primary-300">
                        {stack}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(project.updated_at || project.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* AI Projects 无限滚动触发器 */}
        {projectsHasMore && (
          <div ref={projectsLoadMoreRef} className="flex justify-center py-8">
            {projectsLoadingMore && (
              <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent" />
            )}
          </div>
        )}

        {!projectsHasMore && projects.length > 0 && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            已加载全部项目
          </div>
        )}
      </section>
    </div>
  );
};