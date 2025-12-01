import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlogPost, PhotoWork, AIDemo } from '../types';
import { fetchHomeOverview } from '../services/dataService';
import { LazyImage } from './LazyImage';
import { useTheme } from './ThemeContext';

// 解析 AI Demo 的 URL
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

// 数字计数动画 Hook
const useCountUp = (end: number, duration: number = 2000, start: number = 0) => {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // 检查元素是否一开始就在视口中
    const checkInitialVisibility = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
        if (isInViewport && !isVisible) {
          setIsVisible(true);
          return true;
        }
      }
      return false;
    };

    // 先检查初始可见性
    if (checkInitialVisibility()) {
      return; // 如果已经在视口中，不需要设置 observer
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
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

  // 如果end值已经更新且大于0，但元素在视口中，强制触发动画
  useEffect(() => {
    if (end > 0 && ref.current && !isVisible) {
      const rect = ref.current.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (isInViewport) {
        setIsVisible(true);
      }
    }
  }, [end, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      // 如果不可见，但end值已经更新，直接设置最终值
      if (end > 0) {
        setCount(end);
      }
      return;
    }

    // 取消之前的动画
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    // 当end值变化时，重置count为start，然后开始动画
    setCount(start);
    
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const newCount = Math.floor(start + (end - start) * easeOutQuart);
      setCount(newCount);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setCount(end); // 确保最终值是准确的
      }
    };
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
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

export const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [photos, setPhotos] = useState<PhotoWork[]>([]);
  const [projects, setProjects] = useState<AIDemo[]>([]);
  const [stats, setStats] = useState({ blog_count: 0, photo_count: 0, project_count: 0 });
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

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
        setStats(data.stats || { blog_count: 0, photo_count: 0, project_count: 0 });
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
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-cyber-dark">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyber-accent/30 dark:border-cyber-accent/30 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyber-accent dark:border-cyber-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-cyber-accent/30 selection:text-white overflow-x-hidden bg-gray-50 dark:bg-cyber-dark text-gray-900 dark:text-white">
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-glow/10 dark:bg-cyber-glow/20 rounded-full blur-[128px] animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-accent/5 dark:bg-cyber-accent/10 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 text-center">
          <div className="px-6 sm:px-8">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-cyber-accent/30 dark:border-cyber-accent/30 bg-cyber-accent/10 dark:bg-cyber-accent/5 text-cyber-accent dark:text-cyber-accent text-xs font-semibold tracking-widest uppercase">
            System Online
          </div>
          <h1 className="text-5xl md:text-8xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-slate-200 dark:to-slate-500 mb-8">
            探索数字前沿
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent to-cyber-glow">DIGITAL FRONTIER</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 dark:text-slate-400 mb-10 leading-relaxed">
            这里记录着我的技术思考、摄影作品和 AI 实验
            <br />
            用代码和镜头探索无限可能
          </p>
          
          {/* 统计数据 */}
          <div className="grid grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto mb-10">
            <div ref={blogCount.ref} className="text-center group">
              <div className="text-4xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent to-cyber-glow mb-2">
                {blogCount.count}+
              </div>
              <div className="text-gray-600 dark:text-slate-400 text-sm md:text-base">技术文章</div>
            </div>
            <div ref={photoCount.ref} className="text-center group">
              <div className="text-4xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-glow to-cyber-accent mb-2">
                {photoCount.count}+
              </div>
              <div className="text-gray-600 dark:text-slate-400 text-sm md:text-base">摄影作品</div>
            </div>
            <div ref={projectCount.ref} className="text-center group">
              <div className="text-4xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent to-emerald-400 dark:to-emerald-400 mb-2">
                {projectCount.count}+
              </div>
              <div className="text-gray-600 dark:text-slate-400 text-sm md:text-base">AI 项目</div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/blog')}
              className="px-8 py-3 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-cyber-accent/50 dark:hover:border-cyber-accent/50 hover:text-cyber-accent dark:hover:text-cyber-accent transition-all text-sm font-medium text-gray-700 dark:text-white"
            >
              探索博客
            </button>
            <button
              onClick={() => navigate('/gallery')}
              className="px-8 py-3 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-cyber-accent/50 dark:hover:border-cyber-accent/50 hover:text-cyber-accent dark:hover:text-cyber-accent transition-all text-sm font-medium text-gray-700 dark:text-white"
            >
              浏览摄影
            </button>
            <button
              onClick={() => navigate('/ai')}
              className="px-8 py-3 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-cyber-accent/50 dark:hover:border-cyber-accent/50 hover:text-cyber-accent dark:hover:text-cyber-accent transition-all text-sm font-medium text-gray-700 dark:text-white"
            >
              AI 实验室
            </button>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-400 dark:text-slate-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          </div>
        </div>
      </section>

      {/* AI & Tech Projects Section */}
      {projects.length > 0 && (
        <section id="projects" className="py-24 bg-white dark:bg-slate-950 relative">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="px-6 sm:px-8">
            <div className="flex items-center gap-4 mb-16">
              <div className="p-3 bg-cyber-accent/10 dark:bg-cyber-accent/10 rounded-xl">
                <svg className="w-6 h-6 text-cyber-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white">AI & Tech Projects</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {projects.map((project) => {
                const projectUrl = resolveDemoUrl(project);
                return (
                <div 
                  key={project.id} 
                  className="group relative bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden hover:border-cyber-accent/50 dark:hover:border-cyber-accent/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] dark:hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] cursor-pointer"
                  onClick={() => window.open(projectUrl, '_blank')}
                >
                  <div className="aspect-video overflow-hidden">
                    {project.cover_image ? (
                      <img 
                        src={project.cover_image} 
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-black/60 dark:bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-mono text-white border border-white/10">
                      AI
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-cyber-accent transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mb-4 line-clamp-3">
                      {project.description || '暂无描述'}
                    </p>
                    {project.category && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        <span className="text-xs font-mono text-cyber-accent bg-cyber-accent/10 dark:bg-cyber-accent/5 px-2 py-1 rounded">
                          {project.category}
                        </span>
                      </div>
                    )}
                    <a 
                      href={projectUrl} 
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-white hover:text-cyber-accent transition-colors"
                    >
                      View Project
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
                );
              })}
            </div>
            </div>
          </div>
        </section>
      )}

      {/* Photography Section */}
      {photos.length > 0 && (
        <section id="photography" className="py-24 bg-gray-100 dark:bg-cyber-dark relative">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="px-6 sm:px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyber-glow/10 dark:bg-cyber-glow/10 rounded-xl">
                  <svg className="w-6 h-6 text-cyber-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white">Visual Archives</h2>
              </div>
              <p className="text-gray-600 dark:text-slate-400 max-w-md text-right md:text-right text-left">
                用镜头捕捉的瞬间，记录生活的美好
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo, index) => {
                // 计算图片的宽高比
                const aspectRatio = photo.width && photo.height 
                  ? photo.width / photo.height 
                  : 4 / 3; // 默认比例
                
                return (
                  <div 
                    key={photo.id} 
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer ${index === 0 || index === 3 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                    onClick={() => navigate(`/gallery/${photo.id}`)}
                    style={{
                      aspectRatio: aspectRatio.toString()
                    }}
                  >
                    <img 
                      src={photo.thumbnail_url || photo.image_url} 
                      alt={photo.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      {photo.category && (
                        <span className="text-cyber-glow text-xs font-mono mb-1">{photo.category.name}</span>
                      )}
                      <h3 className="text-white font-bold">{photo.title}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </section>
      )}

      {/* Blog Section */}
      {blogs.length > 0 && (
        <section id="blog" className="py-24 bg-white dark:bg-slate-950 relative border-t border-gray-200 dark:border-white/5">
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <div className="flex items-center gap-4 mb-16 justify-center">
              <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-xl">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 dark:text-white">Transmission Logs</h2>
            </div>

            <div className="space-y-6">
              {blogs.map((post) => (
                <article 
                  key={post.id} 
                  className="group relative bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-900 border border-gray-200 dark:border-white/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/blog/${post.id}`)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag.id} className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-900">
                          #{tag.name}
                        </span>
                      ))}
                      {post.category && (
                        <span className="text-xs font-mono text-gray-600 dark:text-slate-400 bg-gray-200 dark:bg-slate-800/50 px-2 py-0.5 rounded-full border border-gray-300 dark:border-slate-700">
                          {post.category.name}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-slate-500 font-mono">
                      {formatDate(post.published_at || post.created_at)} • 约 {Math.ceil((post.content?.length || 0) / 500)} 分钟阅读
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400 mb-6 leading-relaxed line-clamp-2">
                    {post.excerpt || post.content.slice(0, 150) + '...'}
                  </p>
                  
                  <div className="inline-flex items-center text-emerald-600 dark:text-emerald-500 font-medium hover:text-emerald-700 dark:hover:text-emerald-400">
                    <span>阅读全文</span>
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};
