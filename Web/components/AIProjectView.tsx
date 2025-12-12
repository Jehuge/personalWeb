import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIDemo, AIImage, AIProject } from '../types';
import { fetchAIDemos, fetchAIImages, fetchAIProjects } from '../services/dataService';
import PlayButton from './PlayButton';
import Loader from './Loader';

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
  const [activeTab, setActiveTab] = useState<'projects' | 'demos' | 'gallery'>('gallery');

  // Projects State
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Demos State
  const [demos, setDemos] = useState<AIDemo[]>([]);
  const [demosLoading, setDemosLoading] = useState(false);
  const [demosError, setDemosError] = useState<string | null>(null);
  const [demosHasMore, setDemosHasMore] = useState(false);
  const [demosPage, setDemosPage] = useState(0);

  // Images State
  const [images, setImages] = useState<AIImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesHasMore, setImagesHasMore] = useState(false);
  const [imagesPage, setImagesPage] = useState(0);
  const [selectedImage, setSelectedImage] = useState<AIImage | null>(null);
  const tiltRafRef = useRef<number | null>(null);

  const PAGE_SIZE = 12;

  // 计算是否显示初始加载动画
  // 计算是否显示初始加载动画
  const isInitialLoading =
    (activeTab === 'gallery' && imagesLoading) ||
    (activeTab === 'demos' && demosLoading) ||
    (activeTab === 'projects' && projectsLoading);

  // 初始加载 Projects
  useEffect(() => {
    if (activeTab === 'projects' && projects.length === 0 && !projectsLoading) {
      const loadProjects = async () => {
        const MIN_LOADING_MS = 900;
        const start = performance.now();
        setProjectsLoading(true);
        try {
          const data = await fetchAIProjects({ skip: 0, limit: 12 });
          setProjects(data);
        } catch (err) {
          console.error('Failed to load AI projects', err);
        } finally {
          const elapsed = performance.now() - start;
          const remaining = MIN_LOADING_MS - elapsed;
          if (remaining > 0) {
            setTimeout(() => setProjectsLoading(false), remaining);
          } else {
            setProjectsLoading(false);
          }
        }
      };
      loadProjects();
    }
  }, [activeTab]);

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

  // 加载 Images 数据
  const loadImages = async (page: number) => {
    const MIN_LOADING_MS = 900;
    const start = performance.now();
    setImagesLoading(true);
    try {
      const data = await fetchAIImages({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
      setImages(data);
      setImagesHasMore(data.length === PAGE_SIZE);
      setImagesPage(page);
    } catch (err) {
      console.error('Failed to load AI images', err);
      setImages([]);
      setImagesHasMore(false);
    } finally {
      const elapsed = performance.now() - start;
      const remaining = MIN_LOADING_MS - elapsed;
      if (remaining > 0) {
        setTimeout(() => setImagesLoading(false), remaining);
      } else {
        setImagesLoading(false);
      }
    }
  };

  // 初始加载 Demos
  useEffect(() => {
    if (activeTab === 'demos' && demos.length === 0 && !demosLoading) {
      loadDemos(0);
    }
  }, [activeTab]);

  // 初始加载 Images - 组件挂载时立即加载默认标签页
  useEffect(() => {
    if (activeTab === 'gallery' && images.length === 0 && !imagesLoading) {
      loadImages(0);
    }
  }, [activeTab]);

  // 组件首次挂载时立即加载默认标签页（gallery）的数据
  useEffect(() => {
    if (images.length === 0) {
      loadImages(0);
    }
  }, []);

  // 处理分页
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

  const handleImagesPreviousPage = () => {
    if (imagesPage > 0) {
      loadImages(imagesPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleImagesNextPage = () => {
    if (imagesHasMore) {
      loadImages(imagesPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 3D 玻璃卡片悬停效果 - 桌面端
  const handleCardEnter = (event: React.MouseEvent<HTMLElement>) => {
    const card = event.currentTarget;
    card.style.transition = 'transform 160ms ease-out, box-shadow 200ms ease';
    card.style.boxShadow = '0 16px 32px rgba(0,0,0,0.28), 0 0 18px rgba(255,255,255,0.16)';
  };

  const handleCardMove = (event: React.MouseEvent<HTMLElement>) => {
    if (window.innerWidth < 900) return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 26;
    const rotateX = -((y / rect.height) - 0.5) * 18;
    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    tiltRafRef.current = requestAnimationFrame(() => {
      card.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.08, 1.08, 1.08)`;
    });
  };

  const handleCardLeave = (event: React.MouseEvent<HTMLElement>) => {
    const card = event.currentTarget;
    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    card.style.transition = 'transform 220ms ease-out, box-shadow 260ms ease';
    card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2), 0 0 12px rgba(255,255,255,0.1)';
  };

  const featuredProject = useMemo(() => {
    return projects.find((p) => p.is_featured) || projects[0];
  }, [projects]);

  // 显示初始加载动画
  if (isInitialLoading) {
    return <Loader fullscreen />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-cyan-500 to-pink-500 mb-4">
          AI 实验室
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          探索 AI 的无限可能，从交互式 Demo 到 AI 生成艺术。
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-6 py-2 rounded-full transition-all duration-300 ${activeTab === 'gallery'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            图库
          </button>
          <button
            onClick={() => setActiveTab('demos')}
            className={`px-6 py-2 rounded-full transition-all duration-300 ${activeTab === 'demos'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            Demos
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-2 rounded-full transition-all duration-300 ${activeTab === 'projects'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            精选项目
          </button>
        </div>
      </div>

      {activeTab === 'projects' && (
        <section className="mb-16 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">精选项目</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                完整的 AI 应用项目与实验性探索。
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project) => (
              <div key={project.id} className="glass-card p-6 rounded-3xl border border-transparent hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h3>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${project.is_published ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-200 text-gray-500'}`}>
                    {project.is_published ? '已发布' : '草稿'}
                  </span>
                </div>
                <div className="mb-4 rounded-xl overflow-hidden h-48 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border border-dashed border-gray-200/80 dark:border-gray-700/80 flex items-center justify-center">
                  {project.cover_image ? (
                    <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-sm flex flex-col items-center gap-2">
                      <svg
                        className="w-10 h-10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="14" rx="2" ry="2" />
                        <path d="M3 13l4-4 3 3 4-4 5 5" />
                        <path d="M14 14h0.01" />
                      </svg>
                      <span>暂无封面</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">
                  {project.description || '暂无简介'}
                </p>
                <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    {project.view_count || 0} 次浏览
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {parseTechStack(project.tech_stack).slice(0, 4).map((stack) => (
                    <span key={stack} className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {stack}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 mt-auto">
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {projects.length === 0 && !projectsLoading && (
            <div className="p-10 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-3xl">
              暂无公开的个人项目，敬请期待。
            </div>
          )}
        </section>
      )}

      {activeTab === 'demos' && (
        <section className="mb-16 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">AI 实验 Demo</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                连接 各大 AI 模型与自研 API，将灵感快速变成可交互的体验。
              </p>
            </div>
            {demosLoading && demos.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                正在加载
              </div>
            )}
          </div>

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
      )}

      {activeTab === 'gallery' && (
        <section className="mb-16 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">AI 艺术图库</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                由 Stable Diffusion / Midjourney 等模型生成的艺术作品。
              </p>
            </div>
          </div>

          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {images.map((image) => {
              const tags = image.tags ? image.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
              return (
                <article
                  key={image.id}
                  className="break-inside-avoid group relative rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer mb-6 transition-all duration-300"
                  style={{
                    transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                    boxShadow: '0 10px 22px rgba(0,0,0,0.22), 0 0 12px rgba(255,255,255,0.12)',
                    background:
                      'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 35%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                    border: '1px solid rgba(255,255,255,0.35)',
                    willChange: 'transform',
                  }}
                  onMouseEnter={handleCardEnter}
                  onMouseMove={handleCardMove}
                  onMouseLeave={handleCardLeave}
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={image.thumbnail_url || image.image_url}
                      alt={image.title || 'AI Generated Image'}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-3 pb-4 pt-3 md:px-4 md:pb-5 md:pt-4">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate">
                      {image.title || '无标题'}
                    </h4>
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {image.view_count || 0} 次浏览
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.length > 0 ? (
                        tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="bg-white/70 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full text-xs border border-white/50 dark:border-gray-700/60 backdrop-blur-sm"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">#AIArt</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* 分页控件 */}
          {images.length > 0 && (
            <div className="flex items-center justify-center gap-4 py-8">
              <button
                onClick={handleImagesPreviousPage}
                disabled={imagesPage === 0 || imagesLoading}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${imagesPage === 0 || imagesLoading
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
              >
                上一页
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                第 {imagesPage + 1} 页
              </span>
              <button
                onClick={handleImagesNextPage}
                disabled={!imagesHasMore || imagesLoading}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!imagesHasMore || imagesLoading
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
              >
                下一页
              </button>
            </div>
          )}

          {images.length === 0 && !imagesLoading && (
            <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
              暂无图片
            </div>
          )}

          {/* Image Modal */}
          {selectedImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
              onClick={() => setSelectedImage(null)}
            >
              <div
                className="relative max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.title}
                    className="max-w-full max-h-[80vh] md:max-h-full object-contain"
                  />
                </div>
                <div className="w-full md:w-96 bg-gray-900 p-6 overflow-y-auto border-l border-gray-800">
                  <h3 className="text-xl font-bold text-white mb-4">{selectedImage.title || '无标题'}</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">浏览次数</label>
                      <p className="text-sm text-white mt-1">{selectedImage.view_count || 0} 次</p>
                    </div>
                    {selectedImage.prompt && (
                      <div>
                        <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">提示词 (Prompt)</label>
                        <p className="text-sm text-gray-300 mt-1 leading-relaxed">{selectedImage.prompt}</p>
                      </div>
                    )}

                    {selectedImage.negative_prompt && (
                      <div>
                        <label className="text-xs font-semibold text-red-400 uppercase tracking-wider">反向提示词 (Negative)</label>
                        <p className="text-sm text-gray-400 mt-1 leading-relaxed">{selectedImage.negative_prompt}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">模型</label>
                        <p className="text-sm text-white mt-1">{selectedImage.model_name || '未知'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">创建时间</label>
                        <p className="text-sm text-white mt-1">{new Date(selectedImage.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {selectedImage.parameters && (
                      <div>
                        <label className="text-xs font-semibold text-blue-400 uppercase tracking-wider">生成参数</label>
                        <pre className="mt-2 p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto">
                          {typeof selectedImage.parameters === 'string'
                            ? selectedImage.parameters
                            : JSON.stringify(selectedImage.parameters, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-4 right-4 md:hidden text-white/50 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
