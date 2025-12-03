import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIDemo, AIImage, AIProject } from '../types';
import { fetchAIDemos, fetchAIImages, fetchAIProjects } from '../services/dataService';
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
  const [activeTab, setActiveTab] = useState<'projects' | 'demos' | 'gallery'>('projects');
  
  // Projects State
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  // Demos State
  const [demos, setDemos] = useState<AIDemo[]>([]);
  const [demosLoading, setDemosLoading] = useState(true);
  const [demosLoadingMore, setDemosLoadingMore] = useState(false);
  const [demosError, setDemosError] = useState<string | null>(null);
  const [demosHasMore, setDemosHasMore] = useState(true);
  const [demosPage, setDemosPage] = useState(0);
  const demosLoadMoreRef = useRef<HTMLDivElement>(null);

  // Images State
  const [images, setImages] = useState<AIImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesLoadingMore, setImagesLoadingMore] = useState(false);
  const [imagesHasMore, setImagesHasMore] = useState(true);
  const [imagesPage, setImagesPage] = useState(0);
  const imagesLoadMoreRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<AIImage | null>(null);

  const PAGE_SIZE = 12;
  const isVisible = usePageVisibility();

  // 初始加载 Projects
  useEffect(() => {
    if (activeTab === 'projects' && projects.length === 0) {
      setProjectsLoading(true);
      fetchAIProjects({ skip: 0, limit: 12 })
        .then((data) => setProjects(data))
        .catch((err) => console.error('Failed to load AI projects', err))
        .finally(() => setProjectsLoading(false));
    }
  }, [activeTab]);

  // 初始加载 Demos
  useEffect(() => {
    if (activeTab === 'demos' && demos.length === 0) {
      setDemosLoading(true);
      fetchAIDemos({ skip: 0, limit: PAGE_SIZE })
        .then((data) => {
          setDemos(data);
          setDemosHasMore(data.length === PAGE_SIZE);
        })
        .catch((err) => {
          console.error('Failed to load AI demos', err);
          setDemosError('AI Demo 列表暂时不可用。');
        })
        .finally(() => setDemosLoading(false));
    }
  }, [activeTab]);

  // 初始加载 Images
  useEffect(() => {
    if (activeTab === 'gallery' && images.length === 0) {
      setImagesLoading(true);
      fetchAIImages({ skip: 0, limit: PAGE_SIZE })
        .then((data) => {
          setImages(data);
          setImagesHasMore(data.length === PAGE_SIZE);
        })
        .catch((err) => console.error('Failed to load AI images', err))
        .finally(() => setImagesLoading(false));
    }
  }, [activeTab]);

  // Demos 无限滚动
  useEffect(() => {
    if (activeTab !== 'demos' || !demosHasMore || demosLoading || demosLoadingMore || !isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && demosHasMore && !demosLoadingMore && !document.hidden) {
          loadMoreDemos();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (demosLoadMoreRef.current) observer.observe(demosLoadMoreRef.current);
    return () => {
      if (demosLoadMoreRef.current) observer.unobserve(demosLoadMoreRef.current);
    };
  }, [demosHasMore, demosLoading, demosLoadingMore, isVisible, activeTab]);

  // Images 无限滚动
  useEffect(() => {
    if (activeTab !== 'gallery' || !imagesHasMore || imagesLoading || imagesLoadingMore || !isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && imagesHasMore && !imagesLoadingMore && !document.hidden) {
          loadMoreImages();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (imagesLoadMoreRef.current) observer.observe(imagesLoadMoreRef.current);
    return () => {
      if (imagesLoadMoreRef.current) observer.unobserve(imagesLoadMoreRef.current);
    };
  }, [imagesHasMore, imagesLoading, imagesLoadingMore, isVisible, activeTab]);

  const loadMoreDemos = async () => {
    if (demosLoadingMore || !demosHasMore) return;
    setDemosLoadingMore(true);
    const nextPage = demosPage + 1;
    try {
      const newDemos = await fetchAIDemos({ skip: nextPage * PAGE_SIZE, limit: PAGE_SIZE });
      if (newDemos.length === 0) {
        setDemosHasMore(false);
      } else {
        setDemos(prev => [...prev, ...newDemos]);
        setDemosPage(nextPage);
        setDemosHasMore(newDemos.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load more demos', err);
    } finally {
      setDemosLoadingMore(false);
    }
  };

  const loadMoreImages = async () => {
    if (imagesLoadingMore || !imagesHasMore) return;
    setImagesLoadingMore(true);
    const nextPage = imagesPage + 1;
    try {
      const newImages = await fetchAIImages({ skip: nextPage * PAGE_SIZE, limit: PAGE_SIZE });
      if (newImages.length === 0) {
        setImagesHasMore(false);
      } else {
        setImages(prev => [...prev, ...newImages]);
        setImagesPage(nextPage);
        setImagesHasMore(newImages.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load more images', err);
    } finally {
      setImagesLoadingMore(false);
    }
  };

  const featuredProject = useMemo(() => {
    return projects.find((p) => p.is_featured) || projects[0];
  }, [projects]);

  if (projectsLoading && activeTab === 'projects') {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-4">
          AI 实验室
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          探索 AI 的无限可能，从交互式 Demo 到 AI 生成艺术。
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
           <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-2 rounded-full transition-all duration-300 ${
              activeTab === 'projects'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            精选项目
          </button>
          <button
            onClick={() => setActiveTab('demos')}
            className={`px-6 py-2 rounded-full transition-all duration-300 ${
              activeTab === 'demos'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Demos
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-6 py-2 rounded-full transition-all duration-300 ${
              activeTab === 'gallery'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            图库
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
                {project.cover_image && (
                    <div className="mb-4 rounded-xl overflow-hidden h-48">
                        <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover" />
                    </div>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">
                  {project.description || '暂无简介'}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {parseTechStack(project.tech_stack).slice(0, 4).map((stack) => (
                    <span key={stack} className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {stack}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 mt-auto">
                  {project.demo_url && (
                    <a
                      href={project.demo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 transition-transform hover:scale-105"
                    >
                      在线体验
                    </a>
                  )}
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
              暂无公开的 AI 项目，敬请期待。
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
                连接 Gemini 与自研 API，将灵感快速变成可交互的体验。
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

          {demosHasMore && (
            <div ref={demosLoadMoreRef} className="flex justify-center py-8">
              {demosLoadingMore && (
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
              )}
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
                <div
                  key={image.id}
                  className="break-inside-avoid group bg-white dark:bg-gray-800 rounded-3xl p-3 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer mb-6"
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="relative overflow-hidden rounded-2xl mb-4 bg-gray-100 dark:bg-gray-700">
                    <img
                      src={image.thumbnail_url || image.image_url}
                      alt={image.title || 'AI Generated Image'}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                      <span className="bg-white/90 text-gray-900 px-4 py-2 rounded-full text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        View Details
                      </span>
                    </div>
                  </div>
                  <div className="px-1">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate">
                      {image.title || '无标题'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {tags.length > 0 ? (
                        tags.slice(0, 3).map((tag, index) => (
                          <span 
                            key={index}
                            className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">#AIArt</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {imagesHasMore && (
            <div ref={imagesLoadMoreRef} className="flex justify-center py-8">
              {imagesLoadingMore && (
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent" />
              )}
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
                     {selectedImage.prompt && (
                       <div>
                         <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider">提示词 (Prompt)</label>
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
