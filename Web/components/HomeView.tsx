import React, { useEffect, useRef, useState } from 'react';
import { BlogPost, PhotoWork, AIProject } from '../types';
import { fetchHomeOverview } from '../services/dataService';
import { LazyImage } from './LazyImage';

type HomeViewProps = {
  onNavigate: (tab: 'blog' | 'gallery' | 'ai') => void;
};

// 数字计数动画 Hook
const useCountUp = (end: number, duration: number = 2000, start: number = 0) => {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(start + (end - start) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, start, duration]);

  return { count, ref };
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '刚刚';
  try {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [photos, setPhotos] = useState<PhotoWork[]>([]);
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [stats, setStats] = useState({ blog_count: 0, photo_count: 0, project_count: 0 });
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [hoveredBlog, setHoveredBlog] = useState<number | null>(null);

  const blogCount = useCountUp(stats.blog_count, 1500);
  const photoCount = useCountUp(stats.photo_count, 1500);
  const projectCount = useCountUp(stats.project_count, 1500);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchHomeOverview();
        setBlogs(data.blogs);
        setPhotos(data.photos);
        setProjects(data.projects);
        setStats(data.stats);
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroParallax = scrollY * 0.5;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-500/30 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 动态背景粒子效果 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-emerald-50/20 to-amber-50/20 dark:from-blue-950/20 dark:via-emerald-950/15 dark:to-amber-950/15"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/20 dark:bg-blue-800/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-200/20 dark:bg-emerald-800/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pb-20 space-y-24">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative pt-20 md:pt-32 pb-16 overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              transform: `translateY(${heroParallax}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/15 via-emerald-400/15 to-amber-400/15 dark:from-blue-600/10 dark:via-emerald-600/10 dark:to-amber-600/10 blur-3xl"></div>
          </div>

          <div className="relative z-10 text-center space-y-8">
            <div className="inline-block">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 via-blue-700 to-emerald-700 dark:from-slate-100 dark:via-blue-400 dark:to-emerald-400 animate-gradient">
                欢迎来到我的世界
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              这里记录着我的技术思考、摄影作品和 AI 实验
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <button
                onClick={() => onNavigate('blog')}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 dark:hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <span className="relative z-10">探索博客</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-emerald-600 dark:from-blue-600 dark:to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              <button
                onClick={() => onNavigate('gallery')}
                className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105"
              >
                浏览摄影
              </button>
              <button
                onClick={() => onNavigate('ai')}
                className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 hover:scale-105"
              >
                AI 实验室
              </button>
            </div>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto">
            <div ref={blogCount.ref} className="text-center group">
              <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 mb-2">
                {blogCount.count}+
              </div>
              <div className="text-gray-600 dark:text-gray-400">技术文章</div>
            </div>
            <div ref={photoCount.ref} className="text-center group">
              <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-400 dark:to-emerald-500 mb-2">
                {photoCount.count}+
              </div>
              <div className="text-gray-600 dark:text-gray-400">摄影作品</div>
            </div>
            <div ref={projectCount.ref} className="text-center group">
              <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-500 mb-2">
                {projectCount.count}+
              </div>
              <div className="text-gray-600 dark:text-gray-400">AI 项目</div>
            </div>
          </div>
        </section>

        {/* 最新博客 - 优化后的展示方式 */}
        {blogs.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  最新文章
                </h2>
                <p className="text-gray-600 dark:text-gray-400">探索我的技术思考</p>
              </div>
              <button
                onClick={() => onNavigate('blog')}
                className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
              >
                查看更多
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            {/* 博客网格布局 */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog, idx) => (
                <article
                  key={blog.id}
                  className="group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  onClick={() => onNavigate('blog')}
                  style={{
                    animationDelay: `${idx * 100}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                  }}
                >
                  {/* 封面图 */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                    {blog.cover_image ? (
                      <LazyImage
                        src={blog.cover_image}
                        alt={blog.title}
                        className="absolute inset-0"
                        imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📝</div>
                          <div className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                            {blog.category?.name || '未分类'}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold rounded-full">
                        {blog.category?.name || '未分类'}
                      </span>
                    </div>
                    {idx === 0 && (
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                          ✨ 最新
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(blog.published_at || blog.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {blog.view_count}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {blog.excerpt || blog.content.slice(0, 120) + '...'}
                    </p>
                    {blog.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {blog.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-md"
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        约 {Math.ceil((blog.content?.length || 0) / 500)} 分钟阅读
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm group-hover:gap-2 inline-flex items-center gap-1">
                        阅读全文
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 随机摄影作品 - 瀑布流风格 */}
        {photos.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  随机摄影
                </h2>
                <p className="text-gray-600 dark:text-gray-400">用镜头捕捉的瞬间</p>
              </div>
              <button
                onClick={() => onNavigate('gallery')}
                className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
              >
                查看更多
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {photos.map((photo, idx) => {
                const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 1.33;
                const height = Math.random() * 200 + 250; // 随机高度，模拟瀑布流
                return (
                  <article
                    key={photo.id}
                    className="group relative break-inside-avoid mb-6 overflow-hidden rounded-2xl bg-gray-900 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer"
                    style={{
                      height: `${height}px`,
                      animationDelay: `${idx * 100}ms`,
                      animation: 'fadeInUp 0.6s ease-out forwards',
                    }}
                    onClick={() => onNavigate('gallery')}
                  >
                    <LazyImage
                      src={photo.thumbnail_url || photo.image_url}
                      alt={photo.title}
                      className="absolute inset-0"
                      imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="text-xl font-bold text-white mb-2">{photo.title}</h3>
                      <p className="text-sm text-white/80 line-clamp-2 mb-3">
                        {photo.description || '点击查看详情'}
                      </p>
                      {photo.category && (
                        <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full backdrop-blur">
                          {photo.category.name}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* AI 项目 - 卡片网格 + 简介 */}
        {projects.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                  AI 项目
                </h2>
                <p className="text-gray-600 dark:text-gray-400">探索 AI 的可能性</p>
              </div>
              <button
                onClick={() => onNavigate('ai')}
                className="hidden md:flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
              >
                查看更多
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {projects.map((project, idx) => (
                <article
                  key={project.id}
                  className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                  style={{
                    animationDelay: `${idx * 100}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                  }}
                >
                  <div className="relative h-64 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                    {project.cover_image ? (
                      <LazyImage
                        src={project.cover_image}
                        alt={project.title}
                        className="absolute inset-0"
                        imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-semibold text-2xl">
                        <div className="text-center">
                          <div className="text-6xl mb-4">🤖</div>
                          <div>AI Project</div>
                        </div>
                      </div>
                    )}
                    {project.is_featured && (
                      <div className="absolute top-4 right-4">
                        <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                          ⭐ Featured
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-8 space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                        {project.description || '暂无描述'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => onNavigate('ai')}
                        className="text-emerald-600 dark:text-emerald-400 font-semibold hover:gap-2 inline-flex items-center gap-1 group-hover:gap-2 transition-all"
                      >
                        查看详情
                        <span>→</span>
                      </button>
                      {project.demo_url && (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30 dark:shadow-emerald-500/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          在线体验 →
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};
