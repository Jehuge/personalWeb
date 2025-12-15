import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlogPost, PhotoWork, AIDemo, AIImage, AIProject, PhotoExif } from '../types';
import { fetchHomeOverview, fetchAIImage, fetchPhoto } from '../services/dataService';
import { LazyImage } from './LazyImage';
import { useTheme } from './ThemeContext';
import Loader from './Loader';

// 摄影图片 EXIF 数据处理辅助函数
type ParsedExifData = {
  make: string;
  model: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  shootTime: string;
};

const normalizeDateValue = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatExifDate = (value?: string | null) => {
  if (!value) return '';
  const date = normalizeDateValue(value);
  if (!date) return value;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const pickValue = (value?: string | number | null) => {
  if (value === undefined || value === null) return '';
  return typeof value === 'number' ? value.toString() : value;
};

const parsePhotoExif = (photo: PhotoWork): ParsedExifData | null => {
  const photoWithExif = photo as PhotoWork & { exif?: PhotoExif };
  if (photoWithExif.exif && typeof photoWithExif.exif === 'object') {
    let shootTime = '';
    if (photoWithExif.exif.DateTimeOriginal) {
      shootTime = formatExifDate(photoWithExif.exif.DateTimeOriginal);
    } else if (photoWithExif.exif.CreateDate) {
      shootTime = formatExifDate(photoWithExif.exif.CreateDate);
    }

    return {
      make: pickValue(photo.make) || pickValue(photoWithExif.exif.Make),
      model: pickValue(photo.model) || pickValue(photoWithExif.exif.Model),
      focalLength: pickValue(photo.focal_length) || pickValue(photoWithExif.exif.FocalLength),
      aperture:
        pickValue(photo.aperture) ||
        (photoWithExif.exif.FNumber !== undefined && photoWithExif.exif.FNumber !== null
          ? `f/${pickValue(photoWithExif.exif.FNumber)}`
          : ''),
      shutterSpeed: pickValue(photo.shutter_speed) || pickValue(photoWithExif.exif.ExposureTime),
      iso:
        pickValue(photo.iso) ||
        pickValue(photoWithExif.exif.ISO) ||
        pickValue(photoWithExif.exif.ISOSpeedRatings),
      shootTime,
    };
  }

  if (photo.make || photo.model || photo.focal_length || photo.aperture || photo.shutter_speed || photo.iso) {
    return {
      make: pickValue(photo.make),
      model: pickValue(photo.model),
      focalLength: pickValue(photo.focal_length),
      aperture: pickValue(photo.aperture),
      shutterSpeed: pickValue(photo.shutter_speed),
      iso: pickValue(photo.iso),
      shootTime: pickValue(photo.shoot_time),
    };
  }

  return null;
};

// 从列表中随机取出若干元素（不修改原数组）
const pickRandomItems = <T,>(items: T[], count: number): T[] => {
  if (items.length <= count) return items;
  const indices = items.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const picked = indices.slice(0, count);
  return picked.map((i) => items[i]);
};

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
    let lastCount = start;
    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const newCount = Math.floor(start + (end - start) * easeOutQuart);
      
      // 只在值真正改变时更新状态，减少重新渲染
      if (newCount !== lastCount) {
        setCount(newCount);
        lastCount = newCount;
      }

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
  const [aiImages, setAiImages] = useState<AIImage[]>([]);
  const [aiDemos, setAiDemos] = useState<AIDemo[]>([]);
  const [aiProjects, setAiProjects] = useState<AIProject[]>([]);
  // 首页展示用的随机子集
  const [featuredBlogs, setFeaturedBlogs] = useState<BlogPost[]>([]);
  const [featuredPhotos, setFeaturedPhotos] = useState<PhotoWork[]>([]);
  const [featuredAiImages, setFeaturedAiImages] = useState<AIImage[]>([]);
  const [featuredAiDemos, setFeaturedAiDemos] = useState<AIDemo[]>([]);
  const [featuredAiProjects, setFeaturedAiProjects] = useState<AIProject[]>([]);
  const [selectedAiImage, setSelectedAiImage] = useState<AIImage | null>(null);
  const [showOriginalAiImage, setShowOriginalAiImage] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWork | null>(null);
  const [showOriginalPhoto, setShowOriginalPhoto] = useState(false);
  const [photoExifData, setPhotoExifData] = useState<ParsedExifData | null>(null);
  const [stats, setStats] = useState({ 
    blog_count: 0, 
    photo_count: 0, 
    ai_image_count: 0,
    ai_demo_count: 0,
    ai_project_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  const blogCount = useCountUp(stats.blog_count, 1500);
  const photoCount = useCountUp(stats.photo_count, 1500);
  const aiImageCount = useCountUp(stats.ai_image_count, 1500);
  const aiDemoCount = useCountUp(stats.ai_demo_count, 1500);
  const aiProjectCount = useCountUp(stats.ai_project_count, 1500);

  // 使用 useRef 防止 StrictMode 导致的重复请求
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    // 如果已经加载过，直接返回（防止 StrictMode 重复调用）
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;

    const loadData = async () => {
      const MIN_LOADING_MS = 900;
      const start = performance.now();

      try {
        const data = await fetchHomeOverview();
        const allBlogs: BlogPost[] = data.blogs || [];
        const allPhotos: PhotoWork[] = data.photos || [];
        const allAiImages: AIImage[] = data.ai_images || [];
        const allAiDemos: AIDemo[] = data.ai_demos || [];
        const allAiProjects: AIProject[] = data.ai_projects || [];

        setBlogs(allBlogs);
        setPhotos(allPhotos);
        setAiImages(allAiImages);
        setAiDemos(allAiDemos);
        setAiProjects(allAiProjects);

        // 随机挑选首页展示内容：每个板块显示2-3个
        setFeaturedBlogs(pickRandomItems(allBlogs, 2));
        setFeaturedPhotos(pickRandomItems(allPhotos, 6));
        setFeaturedAiImages(pickRandomItems(allAiImages, 6));
        setFeaturedAiDemos(pickRandomItems(allAiDemos, 2));
        setFeaturedAiProjects(pickRandomItems(allAiProjects, 2));
        setStats(data.stats || { 
          blog_count: 0, 
          photo_count: 0, 
          ai_image_count: 0,
          ai_demo_count: 0,
          ai_project_count: 0
        });
      } catch (err) {
        console.error('Failed to load homepage data', err);
        // 请求失败时重置标志，允许重试
        hasLoadedRef.current = false;
      } finally {
        const elapsed = performance.now() - start;
        const remaining = MIN_LOADING_MS - elapsed;
        if (remaining > 0) {
          setTimeout(() => setLoading(false), remaining);
        } else {
          setLoading(false);
        }
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    // 节流滚动事件，减少性能开销
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
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
      <Loader fullscreen />
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-cyber-accent/30 selection:text-white overflow-x-hidden bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Abstract Background Elements - 优化：减少 blur 半径 */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-glow/10 dark:bg-cyber-glow/20 rounded-full blur-[64px] dark:blur-[80px] animate-pulse-slow will-change-transform"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-accent/5 dark:bg-cyber-accent/10 rounded-full blur-[64px] dark:blur-[80px] animate-pulse-slow will-change-transform" style={{ animationDelay: '2s' }}></div>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 max-w-6xl mx-auto mb-10">
            <div ref={blogCount.ref} className="text-center group">
              <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent to-cyber-glow mb-2">
                {blogCount.count}+
              </div>
              <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">博客</div>
            </div>
            <div ref={photoCount.ref} className="text-center group">
              <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-glow to-cyber-accent mb-2">
                {photoCount.count}+
              </div>
              <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">摄影作品</div>
            </div>
            <div ref={aiImageCount.ref} className="text-center group">
              <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-2">
                {aiImageCount.count}+
              </div>
              <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">AI 图库</div>
            </div>
            <div ref={aiDemoCount.ref} className="text-center group">
              <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 mb-2">
                {aiDemoCount.count}+
              </div>
              <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">AI Demo</div>
            </div>
            <div ref={aiProjectCount.ref} className="text-center group">
              <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent to-primary-600 dark:to-primary-400 mb-2">
                {aiProjectCount.count}+
              </div>
              <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">个人项目</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <button
              onClick={() => navigate('/blog')}
              className="px-6 md:px-8 py-2.5 md:py-3 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-cyber-accent/50 dark:hover:border-cyber-accent/50 hover:text-cyber-accent dark:hover:text-cyber-accent transition-all text-xs md:text-sm font-medium text-gray-700 dark:text-white"
            >
              探索博客
            </button>
            <button
              onClick={() => navigate('/gallery')}
              className="px-6 md:px-8 py-2.5 md:py-3 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-cyber-accent/50 dark:hover:border-cyber-accent/50 hover:text-cyber-accent dark:hover:text-cyber-accent transition-all text-xs md:text-sm font-medium text-gray-700 dark:text-white"
            >
              浏览摄影
            </button>
            <button
              onClick={() => navigate('/ai-gallery')}
              className="px-6 md:px-8 py-2.5 md:py-3 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-purple-500/50 dark:hover:border-purple-500/50 hover:text-purple-500 dark:hover:text-purple-500 transition-all text-xs md:text-sm font-medium text-gray-700 dark:text-white"
            >
              AI 图库
            </button>
            <button
              onClick={() => navigate('/ai-demo')}
              className="px-6 md:px-8 py-2.5 md:py-3 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:text-blue-500 dark:hover:text-blue-500 transition-all text-xs md:text-sm font-medium text-gray-700 dark:text-white"
            >
              AI Demo
            </button>
            <button
              onClick={() => navigate('/ai-project')}
              className="px-6 md:px-8 py-2.5 md:py-3 rounded-full border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-cyber-accent/50 dark:hover:border-cyber-accent/50 hover:text-cyber-accent dark:hover:text-cyber-accent transition-all text-xs md:text-sm font-medium text-gray-700 dark:text-white"
            >
              个人项目
            </button>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-400 dark:text-slate-500 will-change-transform">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          </div>
        </div>
      </section>

      {/* Featured Content Sections - 5 Compact Sections */}
      <section className="py-12 md:py-16 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
          
          {/* 博客板块 */}
          {featuredBlogs.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-500/10 dark:bg-primary-500/10 rounded-lg">
                  <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">博客</h2>
                <button
                  onClick={() => navigate('/blog')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {featuredBlogs.map((post) => (
                  <article 
                    key={post.id} 
                    className="group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/blog/${post.id}`)}
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {post.tags.slice(0, 2).map(tag => (
                          <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                            #{tag.name}
                          </span>
                        ))}
                        {post.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500">
                            {post.category.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                        {post.title}
                    </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {post.excerpt || post.content.slice(0, 100) + '...'}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        <span>{formatDate(post.published_at || post.created_at)}</span>
                        <span>•</span>
                        <span>{post.view_count || 0} 次浏览</span>
                      </div>
                  </div>
                  </article>
                ))}
            </div>
            </div>
      )}

          {/* 摄影作品板块 */}
      {featuredPhotos.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyber-glow/10 dark:bg-cyber-glow/10 rounded-lg">
                  <svg className="w-5 h-5 text-cyber-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">摄影作品</h2>
                <button
                  onClick={() => navigate('/gallery')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-cyber-glow transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {featuredPhotos.map((photo) => (
                <div 
                  key={photo.id} 
                    className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-white dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700/60 hover:border-cyber-glow/50 dark:hover:border-cyber-glow/50 transition-all"
                    onClick={() => {
                      // 如果照片信息完整，直接显示；否则获取详情
                      if (photo.image_url && photo.title !== undefined) {
                        setSelectedPhoto(photo);
                        setShowOriginalPhoto(false); // 重置为显示缩略图
                        setPhotoExifData(parsePhotoExif(photo));
                      } else {
                        fetchPhoto(photo.id)
                          .then(p => {
                            setSelectedPhoto(p);
                            setShowOriginalPhoto(false); // 重置为显示缩略图
                            setPhotoExifData(parsePhotoExif(p));
                          })
                          .catch(err => console.error('Failed to fetch photo details:', err));
                      }
                    }}
                >
                  <img 
                    src={photo.thumbnail_url || photo.image_url} 
                    alt={photo.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1">
                        {photo.title}
                      </h3>
                        <div className="flex items-center gap-2 text-xs text-white/80">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{photo.view_count || 0}</span>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* AI 图库板块 */}
          {featuredAiImages.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 dark:bg-purple-500/10 rounded-lg">
                  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">AI 图库</h2>
                <button
                  onClick={() => navigate('/ai-gallery')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-purple-500 transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {featuredAiImages.map((image) => (
                  <div 
                    key={image.id} 
                    className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-white dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700/60 hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all"
                    onClick={() => {
                      // 如果图片信息完整，直接显示；否则获取详情
                      if (image.image_url && image.title !== undefined) {
                        setSelectedAiImage(image);
                        setShowOriginalAiImage(false); // 重置为显示缩略图
                      } else {
                        fetchAIImage(image.id)
                          .then(img => {
                            setSelectedAiImage(img);
                            setShowOriginalAiImage(false); // 重置为显示缩略图
                          })
                          .catch(err => console.error('Failed to fetch image:', err));
                      }
                    }}
                  >
                    <img 
                      src={image.thumbnail_url || image.image_url} 
                      alt={image.title || 'AI Image'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        {image.title && (
                          <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1">
                            {image.title}
                          </h3>
                        )}
                        <div className="flex items-center gap-2 text-xs text-white/80">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{image.view_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Demo 板块 */}
          {featuredAiDemos.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 dark:bg-blue-500/10 rounded-lg">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">AI Demo</h2>
                <button
                  onClick={() => navigate('/ai-demo')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {featuredAiDemos.map((demo) => {
                  const demoUrl = resolveDemoUrl(demo);
                  return (
                    <div 
                      key={demo.id} 
                      className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all cursor-pointer"
                      onClick={() => window.open(demoUrl, '_blank')}
                    >
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-800 dark:to-slate-900">
                        {demo.cover_image ? (
                          <img 
                            src={demo.cover_image} 
                            alt={demo.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono text-white">
                          AI
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                          {demo.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {demo.description || '暂无描述'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{demo.view_count || 0} 次浏览</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 个人项目板块 */}
          {featuredAiProjects.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyber-accent/10 dark:bg-cyber-accent/10 rounded-lg">
                  <svg className="w-5 h-5 text-cyber-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">个人项目</h2>
                <button
                  onClick={() => navigate('/ai-project')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-cyber-accent transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {featuredAiProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-cyber-accent/50 dark:hover:border-cyber-accent/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/ai-project?projectId=${project.id}`)}
                  >
                    <div className="aspect-video overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-800 dark:to-slate-900">
                      {project.cover_image ? (
                        <img 
                          src={project.cover_image} 
                          alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-cyber-accent dark:group-hover:text-cyber-accent transition-colors line-clamp-1">
                        {project.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {project.description || '暂无描述'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{project.view_count || 0} 次浏览</span>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* AI 图片弹出框 */}
      {selectedAiImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => {
            setSelectedAiImage(null);
            setShowOriginalAiImage(false);
          }}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* 关闭按钮 - 统一放在右上角 */}
            <button
              onClick={() => {
                setSelectedAiImage(null);
                setShowOriginalAiImage(false);
              }}
              className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 rounded-full shadow-lg"
              aria-label="关闭"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex-1 bg-gray-100 dark:bg-black flex items-center justify-center relative overflow-hidden">
              <img
                src={showOriginalAiImage ? selectedAiImage.image_url : (selectedAiImage.thumbnail_url || selectedAiImage.image_url)}
                alt={selectedAiImage.title || 'AI Image'}
                className="max-w-full max-h-[80vh] md:max-h-full object-contain"
              />
              {!showOriginalAiImage && (
                <button
                  type="button"
                  onClick={() => setShowOriginalAiImage(true)}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-opacity"
                >
                  查看原图
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5h6m0 0v6m0-6L10 14" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19l6 0 0-6" />
                  </svg>
                </button>
              )}
            </div>
            <div className="w-full md:w-96 bg-white dark:bg-slate-800 p-6 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pr-8">{selectedAiImage.title || '无标题'}</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">浏览次数</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedAiImage.view_count || 0} 次</p>
                </div>
                {selectedAiImage.prompt && (
                  <div>
                    <label className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider block mb-1">提示词 (Prompt)</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedAiImage.prompt}</p>
                  </div>
                )}

                {selectedAiImage.negative_prompt && (
                  <div>
                    <label className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">反向提示词 (Negative)</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selectedAiImage.negative_prompt}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">模型</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedAiImage.model_name || '未知'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">创建时间</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(selectedAiImage.created_at).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>

                {selectedAiImage.parameters && (
                  <div>
                    <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">生成参数</label>
                    <pre className="mt-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto border border-gray-200 dark:border-slate-700">
                      {typeof selectedAiImage.parameters === 'string'
                        ? selectedAiImage.parameters
                        : JSON.stringify(selectedAiImage.parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 摄影图片弹出框 */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => {
            setSelectedPhoto(null);
            setShowOriginalPhoto(false);
            setPhotoExifData(null);
          }}
        >
          <div
            className="relative max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* 关闭按钮 - 统一放在右上角 */}
            <button
              onClick={() => {
                setSelectedPhoto(null);
                setShowOriginalPhoto(false);
                setPhotoExifData(null);
              }}
              className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 rounded-full shadow-lg"
              aria-label="关闭"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex-1 bg-gray-100 dark:bg-black flex items-center justify-center relative overflow-hidden">
              <img
                src={showOriginalPhoto ? selectedPhoto.image_url : (selectedPhoto.thumbnail_url || selectedPhoto.image_url)}
                alt={selectedPhoto.title}
                className="max-w-full max-h-[80vh] md:max-h-full object-contain"
              />
              {!showOriginalPhoto && (
                <button
                  type="button"
                  onClick={() => setShowOriginalPhoto(true)}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-opacity"
                >
                  查看原图
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5h6m0 0v6m0-6L10 14" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19l6 0 0-6" />
                  </svg>
                </button>
              )}
            </div>
            <div className="w-full md:w-96 bg-white dark:bg-slate-800 p-6 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {selectedPhoto.category?.name || '未分类'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(selectedPhoto.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white pr-8">{selectedPhoto.title}</h3>
                
                {selectedPhoto.description && (
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {selectedPhoto.description.split('|')[0].trim()}
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                      拍摄参数
                    </label>
                    {photoExifData ? (
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">相机</p>
                          <p>{[photoExifData.make, photoExifData.model].filter(Boolean).join(' ') || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">焦距</p>
                          <p>{photoExifData.focalLength || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">光圈</p>
                          <p>{photoExifData.aperture || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">快门</p>
                          <p>{photoExifData.shutterSpeed || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">ISO</p>
                          <p>{photoExifData.iso || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">时间</p>
                          <p>{photoExifData.shootTime || '——'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">——</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-slate-700">
                    <p>作品编号：#{selectedPhoto.id}</p>
                    <p className="mt-1">浏览次数：{selectedPhoto.view_count || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
