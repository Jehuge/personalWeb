import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlogPost, PhotoWork, AIDemo, AIImage, AIProject, PhotoExif } from '../types';
import { fetchHomeOverview, fetchAIImage, fetchPhoto } from '../services/dataService';
import { LazyImage } from '../components/image/LazyImage';
import { useTheme } from '../components/context/ThemeContext';
import Loader from '../components/ui/Loader';
import { ZoomableImage } from '../components/image/ZoomableImage';
import PuzzleCaptcha from '../components/features/PuzzleCaptcha';
import { showPuzzleCaptcha } from '../components/features/showPuzzleCaptcha';
import { GlobeAnimation } from '../components/animation/GlobeAnimation';
import PhotoGallery from '../components/image/PhotoGallery';
import ImageGallery from '../components/image/ImageGallery';

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
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWork | null>(null);
  const [photoExifData, setPhotoExifData] = useState<ParsedExifData | null>(null);
  const [showAiImageDownloadVerification, setShowAiImageDownloadVerification] = useState(false);
  const [showPhotoDownloadVerification, setShowPhotoDownloadVerification] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ url: string; filename: string } | null>(null);

  useEffect(() => {
    if (showAiImageDownloadVerification || showPhotoDownloadVerification) {
      const t = setTimeout(() => {
        const node = document.querySelector('.captcha-container');
        if (!node) {
          // PuzzleCaptcha DOM not found after 1s
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [showAiImageDownloadVerification, showPhotoDownloadVerification]);

  // 下载图片函数
  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 处理下载请求（先显示验证）
  const handleDownloadRequest = async (url: string, filename: string, type: 'ai' | 'photo') => {
    setPendingDownload({ url, filename });
    try {
      await showPuzzleCaptcha({ title: '下载验证' });
      downloadImage(url, filename);
      setPendingDownload(null);
    } catch (err) {
      setPendingDownload(null);
    }
  };

  // 验证通过后执行下载
  const handleDownloadAfterVerify = () => {
    if (pendingDownload) {
      downloadImage(pendingDownload.url, pendingDownload.filename);
      setPendingDownload(null);
    }
    setShowAiImageDownloadVerification(false);
    setShowPhotoDownloadVerification(false);
  };
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
  // 跟踪最近获取过详情的照片和 AI 图片 ID，避免重复调用 API
  const lastFetchedPhotoIdRef = useRef<number | null>(null);
  const lastFetchedAiImageIdRef = useRef<number | null>(null);

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
        setFeaturedPhotos(pickRandomItems(allPhotos, 10));
        setFeaturedAiImages(pickRandomItems(allAiImages, 10));
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

  // 当弹出框打开时禁用背景滚动
  useEffect(() => {
    if (selectedAiImage || selectedPhoto || showAiImageDownloadVerification || showPhotoDownloadVerification) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // 恢复滚动
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [selectedAiImage, selectedPhoto, showAiImageDownloadVerification, showPhotoDownloadVerification]);

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
    <div className="min-h-screen font-sans selection:bg-gray-500/30 selection:text-white overflow-x-hidden bg-slate-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-slate-100">

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 md:pt-28">
        {/* 地球动画背景 - 更大更长，位置偏下 */}
        <div className="absolute inset-0 z-0 opacity-60 dark:opacity-40 flex items-center justify-center">
          <div
            className="w-[140%] h-[140%] min-w-[1600px] min-h-[1000px] translate-y-[3%]"
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)', // 启用硬件加速
              backfaceVisibility: 'hidden', // 优化渲染性能
            }}
          >
            <GlobeAnimation
              autoPlay={true}
              showControls={false}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Abstract Background Elements - 优化：减少 blur 半径 */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-400/10 dark:bg-gray-600/20 rounded-full blur-[64px] dark:blur-[80px] animate-pulse-slow will-change-transform"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-500/5 dark:bg-gray-500/10 rounded-full blur-[64px] dark:blur-[80px] animate-pulse-slow will-change-transform" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 text-center">
          <div className="px-6 sm:px-8">
            {/* 标题背景 */}
            <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-2xl bg-white/3 dark:bg-slate-900/3 backdrop-blur-[1px] mb-8 inline-block">
              <h1 className="text-5xl md:text-8xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-orange-500 via-cyan-500 via-emerald-500 to-blue-600 drop-shadow-2xl">
                探索数字前沿
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-orange-500 via-cyan-500 via-emerald-500 to-blue-600">DIGITAL FRONTIER</span>
              </h1>
            </div>

            {/* 描述文字背景 */}
            <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-white/2 dark:bg-slate-900/2 backdrop-blur-[1px] mb-10 inline-block">
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-700 dark:text-slate-300 leading-relaxed font-medium drop-shadow-xl">
                这里记录着我的技术思考、摄影作品和 AI 实验
                <br />
                用代码和镜头探索无限可能
              </p>
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 max-w-6xl mx-auto mb-10">
              <div ref={blogCount.ref} className="text-center group py-2 md:py-3 rounded-xl bg-white/4 dark:bg-slate-900/4 backdrop-blur-[2px] w-full max-w-[150px] md:max-w-[180px] mx-auto">
                <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500 mb-2 tracking-tighter leading-none inline-block">
                  {blogCount.count}+
                </div>
                <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">博客</div>
              </div>
              <div ref={photoCount.ref} className="text-center group py-2 md:py-3 rounded-xl bg-white/4 dark:bg-slate-900/4 backdrop-blur-[2px] w-full max-w-[150px] md:max-w-[180px] mx-auto">
                <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 mb-2 tracking-tighter leading-none inline-block">
                  {photoCount.count}+
                </div>
                <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">摄影作品</div>
              </div>
              <div ref={aiImageCount.ref} className="text-center group py-2 md:py-3 rounded-xl bg-white/4 dark:bg-slate-900/4 backdrop-blur-[2px] w-full max-w-[150px] md:max-w-[180px] mx-auto">
                <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500 mb-2 tracking-tighter leading-none inline-block">
                  {aiImageCount.count}+
                </div>
                <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">AI 图库</div>
              </div>
              <div ref={aiDemoCount.ref} className="text-center group py-2 md:py-3 rounded-xl bg-white/4 dark:bg-slate-900/4 backdrop-blur-[2px] w-full max-w-[150px] md:max-w-[180px] mx-auto">
                <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-500 mb-2 tracking-tighter leading-none inline-block">
                  {aiDemoCount.count}+
                </div>
                <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">AI Demo</div>
              </div>
              <div ref={aiProjectCount.ref} className="text-center group py-2 md:py-3 rounded-xl bg-white/4 dark:bg-slate-900/4 backdrop-blur-[2px] w-full max-w-[150px] md:max-w-[180px] mx-auto">
                <div className="text-3xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 mb-2 tracking-tighter leading-none inline-block">
                  {aiProjectCount.count}+
                </div>
                <div className="text-gray-600 dark:text-slate-400 text-xs md:text-sm">个人项目</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
              <button
                onClick={() => navigate('/blog')}
                className="px-4 md:px-6 py-2 md:py-2.5 rounded-full border border-white/25 dark:border-white/15 bg-white/8 dark:bg-white/5 backdrop-blur-[2px] text-xs md:text-sm font-medium text-gray-700 dark:text-white hover:border-blue-400/60 hover:bg-blue-50/70 dark:hover:bg-blue-400/10 hover:text-blue-600 dark:hover:text-blue-300 transition-all"
              >
                探索博客
              </button>
              <button
                onClick={() => navigate('/gallery')}
                className="px-4 md:px-6 py-2 md:py-2.5 rounded-full border border-white/25 dark:border-white/15 bg-white/8 dark:bg-white/5 backdrop-blur-[2px] text-xs md:text-sm font-medium text-gray-700 dark:text-white hover:border-teal-400/60 hover:bg-teal-50/70 dark:hover:bg-teal-400/10 hover:text-teal-600 dark:hover:text-teal-300 transition-all"
              >
                浏览摄影
              </button>
              <button
                onClick={() => navigate('/ai-gallery')}
                className="px-4 md:px-6 py-2 md:py-2.5 rounded-full border border-white/25 dark:border-white/15 bg-white/8 dark:bg-white/5 backdrop-blur-[2px] text-xs md:text-sm font-medium text-gray-700 dark:text-white hover:border-orange-400/60 hover:bg-orange-50/70 dark:hover:bg-orange-400/10 hover:text-orange-600 dark:hover:text-orange-300 transition-all"
              >
                AI 图库
              </button>
              <button
                onClick={() => navigate('/ai-demo')}
                className="px-4 md:px-6 py-2 md:py-2.5 rounded-full border border-white/25 dark:border-white/15 bg-white/8 dark:bg-white/5 backdrop-blur-[2px] text-xs md:text-sm font-medium text-gray-700 dark:text-white hover:border-cyan-400/60 hover:bg-cyan-50/70 dark:hover:bg-cyan-400/10 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all"
              >
                AI Demo
              </button>
              <button
                onClick={() => navigate('/ai-project')}
                className="px-4 md:px-6 py-2 md:py-2.5 rounded-full border border-white/25 dark:border-white/15 bg-white/8 dark:bg-white/5 backdrop-blur-[2px] text-xs md:text-sm font-medium text-gray-700 dark:text-white hover:border-emerald-400/60 hover:bg-emerald-50/70 dark:hover:bg-emerald-400/10 hover:text-emerald-600 dark:hover:text-emerald-300 transition-all"
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
      <section className="py-12 md:py-16 bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">

          {/* 博客板块 */}
          {featuredBlogs.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100/50 dark:bg-blue-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">博客</h2>
                <button
                  onClick={() => navigate('/blog')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {featuredBlogs.map((post) => (
                  <article
                    key={post.id}
                    className="group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all cursor-pointer"
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
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100/50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                            {post.category.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
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
                <div className="p-2 bg-teal-100/50 dark:bg-teal-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">摄影作品</h2>
                <button
                  onClick={() => navigate('/gallery')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <PhotoGallery
                photos={featuredPhotos}
                onPhotoClick={(photo) => {
                  // 每次点击都调用 API 更新浏览次数，但如果刚刚获取过同一个照片，避免重复请求
                  if (lastFetchedPhotoIdRef.current === photo.id) {
                    // 刚刚获取过，直接使用
                    setSelectedPhoto(photo);
                    setPhotoExifData(parsePhotoExif(photo));
                  } else {
                    // 调用 API 获取最新数据（包括更新的浏览次数）
                    lastFetchedPhotoIdRef.current = photo.id;
                    fetchPhoto(photo.id)
                      .then(p => {
                        setSelectedPhoto(p);
                        setPhotoExifData(parsePhotoExif(p));
                        // 更新列表中的数据，以便显示最新的浏览次数
                        setPhotos(prev => prev.map(ph => ph.id === photo.id ? p : ph));
                        setFeaturedPhotos(prev => prev.map(ph => ph.id === photo.id ? p : ph));
                      })
                      .catch(err => {
                        console.error('Failed to fetch photo details:', err);
                        // 如果获取失败，仍然显示原照片
                        setSelectedPhoto(photo);
                        setPhotoExifData(parsePhotoExif(photo));
                      });
                  }
                }}
              />
            </div>
          )}

          {/* AI 图库板块 */}
          {featuredAiImages.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100/50 dark:bg-orange-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">AI 图库</h2>
                <button
                  onClick={() => navigate('/ai-gallery')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <ImageGallery
                items={featuredAiImages}
                layoutIdPrefix="ai-image"
                onItemClick={(image) => {
                  // 每次点击都调用 API 更新浏览次数，但如果刚刚获取过同一张图片，避免重复请求
                  if (lastFetchedAiImageIdRef.current === image.id) {
                    // 刚刚获取过，直接使用
                    setSelectedAiImage(image);
                  } else {
                    // 调用 API 获取最新数据（包括更新的浏览次数）
                    lastFetchedAiImageIdRef.current = image.id;
                    fetchAIImage(image.id)
                      .then(img => {
                        setSelectedAiImage(img);
                        // 更新列表中的数据，以便显示最新的浏览次数
                        setAiImages(prev => prev.map(im => im.id === image.id ? img : im));
                        setFeaturedAiImages(prev => prev.map(im => im.id === image.id ? img : im));
                      })
                      .catch(err => {
                        console.error('Failed to fetch image:', err);
                        // 如果获取失败，仍然显示原图片
                        setSelectedAiImage(image);
                      });
                  }
                }}
              />
            </div>
          )}

          {/* AI Demo 板块 */}
          {featuredAiDemos.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyan-100/50 dark:bg-cyan-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">AI Demo</h2>
                <button
                  onClick={() => navigate('/ai-demo')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
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
                      className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-cyan-500/50 dark:hover:border-cyan-400/50 transition-all cursor-pointer"
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
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
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
                <div className="p-2 bg-emerald-100/50 dark:bg-emerald-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">个人项目</h2>
                <button
                  onClick={() => navigate('/ai-project')}
                  className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  查看更多 →
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {featuredAiProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-emerald-500/50 dark:hover:border-emerald-400/50 transition-all cursor-pointer"
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
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
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
              }}
              className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 rounded-full shadow-lg"
              aria-label="关闭"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <ZoomableImage
              src={selectedAiImage.thumbnail_url || selectedAiImage.image_url}
              alt={selectedAiImage.title || 'AI Image'}
            />
            <div className="w-full md:w-96 bg-white dark:bg-slate-800 p-6 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pr-8">{selectedAiImage.title || '无标题'}</h3>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    const filename = `${selectedAiImage.title || 'ai-image'}-${selectedAiImage.id}.jpg`;
                    handleDownloadRequest(selectedAiImage.image_url, filename, 'ai');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white transition-all shadow-md hover:shadow-lg"
                >
                  下载原图
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">浏览次数</label>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedAiImage.view_count || 0} 次</p>
                </div>
                {selectedAiImage.prompt && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1">提示词 (Prompt)</label>
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
                setPhotoExifData(null);
              }}
              className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 rounded-full shadow-lg"
              aria-label="关闭"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <ZoomableImage
              src={selectedPhoto.thumbnail_url || selectedPhoto.image_url}
              alt={selectedPhoto.title}
            />
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

                <button
                  type="button"
                  onClick={() => {
                    const filename = `${selectedPhoto.title || 'photo'}-${selectedPhoto.id}.jpg`;
                    handleDownloadRequest(selectedPhoto.image_url, filename, 'photo');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white transition-all shadow-md hover:shadow-lg"
                >
                  下载原图
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

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

      {/* AI 图片下载验证 */}
      {showAiImageDownloadVerification && (
        <PuzzleCaptcha
          title="下载验证"
          description="请拖动滑块完成拼图验证后下载原图"
          onSuccess={handleDownloadAfterVerify}
          onClose={() => {
            setShowAiImageDownloadVerification(false);
            setPendingDownload(null);
          }}
        />
      )}

      {/* 摄影图片下载验证 */}
      {showPhotoDownloadVerification && (
        <PuzzleCaptcha
          title="下载验证"
          description="请拖动滑块完成拼图验证后下载原图"
          onSuccess={handleDownloadAfterVerify}
          onClose={() => {
            setShowPhotoDownloadVerification(false);
            setPendingDownload(null);
          }}
        />
      )}

    </div>
  );
};
