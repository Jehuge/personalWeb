import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { BlogPost } from '../types';
import { fetchPosts } from '../services/dataService';
import { LazyImage } from './LazyImage';

interface Heading {
  id: string;
  text: string;
  level: number;
}

const estimateReadTime = (content: string) => {
  // 与首页保持一致：按字符数计算，每 500 字符 = 1 分钟
  return Math.max(1, Math.ceil((content?.length || 0) / 500));
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

// 从 DOM 中提取标题（在 Markdown 渲染后）
const extractHeadingsFromDOM = (): Heading[] => {
  const headings: Heading[] = [];
  const headingElements = document.querySelectorAll('.markdown-content h1[id], .markdown-content h2[id], .markdown-content h3[id], .markdown-content h4[id], .markdown-content h5[id], .markdown-content h6[id]');
  
  headingElements.forEach((element) => {
    const level = parseInt(element.tagName.charAt(1));
    const id = element.id;
    const text = element.textContent || '';
    headings.push({ id, text, level });
  });
  
  return headings;
};

// 平滑滚动到指定元素
const scrollToHeading = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    const offset = 100; // 顶部偏移量
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

interface BlogViewProps {
  onDetailChange?: (isInDetail: boolean) => void;
  onBackRequest?: () => void;
}

export const BlogView: React.FC<BlogViewProps> = ({ onDetailChange, onBackRequest }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // 目录相关的 hooks（必须在顶层）
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [tocExpanded, setTocExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const tocNavRef = useRef<HTMLElement>(null);
  const tocContainerRef = useRef<HTMLElement>(null);
  const [tocTop, setTocTop] = useState(100); // 目录的 top 位置
  const PAGE_SIZE = 12;

  // 初始加载
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setCurrentPage(0);
    setHasMore(true);
    fetchPosts({ skip: 0, limit: PAGE_SIZE })
      .then(data => {
        setPosts(data);
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load blogs', err);
        setError('内容加载失败，请稍后重试');
      })
      .finally(() => setLoading(false));
  }, []);

  // 无限滚动加载
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, loading, loadingMore, selectedCategory]);

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      const newPosts = await fetchPosts({ skip: nextPage * PAGE_SIZE, limit: PAGE_SIZE });
      if (newPosts.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setCurrentPage(nextPage);
        setHasMore(newPosts.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load more blogs', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const categories = useMemo(() => {
    const names = new Set(posts.map(post => post.category?.name?.trim() || '未分类'));
    return ['全部', ...Array.from(names)];
  }, [posts]);

  const filteredPosts = selectedCategory === '全部'
    ? posts
    : posts.filter(p => (p.category?.name?.trim() || '未分类') === selectedCategory);

  // 通知父组件是否在详情页（必须在所有条件返回之前）
  useEffect(() => {
    if (onDetailChange) {
      onDetailChange(!!selectedPost);
    }
  }, [selectedPost, onDetailChange]);

  // 监听返回请求（通过自定义事件）
  useEffect(() => {
    const handleGoBack = () => {
      if (selectedPost) {
        setSelectedPost(null);
      }
    };
    
    window.addEventListener('blogViewGoBack', handleGoBack);
    return () => {
      window.removeEventListener('blogViewGoBack', handleGoBack);
    };
  }, [selectedPost]);

  // 在内容渲染后提取标题（只在有选中文章时执行）
  useEffect(() => {
    if (!selectedPost) {
      setHeadings([]);
      return;
    }

    // 使用 setTimeout 确保 DOM 已更新
    const timer = setTimeout(() => {
      const extractedHeadings = extractHeadingsFromDOM();
      setHeadings(extractedHeadings);
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedPost]);

  // 监听滚动，高亮当前阅读位置（只在有标题时执行）
  useEffect(() => {
    if (headings.length === 0) {
      setActiveHeading('');
      return;
    }

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // 偏移量

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        const element = document.getElementById(heading.id);
        if (element) {
          const offsetTop = element.offsetTop;
          if (scrollPosition >= offsetTop) {
            setActiveHeading(heading.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始检查

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  // 目录自动滚动到当前激活的标题
  useEffect(() => {
    if (!activeHeading || !tocNavRef.current) return;

    const nav = tocNavRef.current;
    // 通过 data-heading-id 属性找到激活的按钮
    const activeButton = nav.querySelector(`[data-heading-id="${activeHeading}"]`) as HTMLElement;
    
    if (!activeButton) return;

    const navRect = nav.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    // 如果激活的按钮不在可视区域内，则滚动
    if (buttonRect.top < navRect.top) {
      // 按钮在可视区域上方，向上滚动
      nav.scrollTo({
        top: activeButton.offsetTop - nav.offsetTop - 20,
        behavior: 'smooth'
      });
    } else if (buttonRect.bottom > navRect.bottom) {
      // 按钮在可视区域下方，向下滚动
      nav.scrollTo({
        top: activeButton.offsetTop - nav.offsetTop - nav.clientHeight + activeButton.offsetHeight + 20,
        behavior: 'smooth'
      });
    }
  }, [activeHeading]);

  // 检测导航栏可见性，动态调整目录位置
  useEffect(() => {
    if (!selectedPost) return;

    const handleScroll = () => {
      // 查找导航栏元素
      const navbar = document.querySelector('nav');
      if (!navbar) return;

      const navbarRect = navbar.getBoundingClientRect();
      const isNavbarVisible = navbarRect.bottom > 0;

      // 计算目录应该的位置
      let newTop = 100; // 默认位置（导航栏可见时）
      
      if (!isNavbarVisible) {
        // 导航栏不可见时，目录往上移
        newTop = 20; // 更靠近顶部
      }

      // 确保目录不会超出视口底部或遮挡 Footer
      const viewportHeight = window.innerHeight;
      const footer = document.querySelector('footer');
      const footerRect = footer?.getBoundingClientRect();
      
      // 估算目录高度（标题 + 内容区域）
      const estimatedTocHeight = 400; // 可以根据实际情况调整
      
      // 如果底部栏可见，确保目录不遮挡
      if (footerRect && footerRect.top < viewportHeight) {
        const maxTop = footerRect.top - estimatedTocHeight - 20;
        if (newTop > maxTop) {
          newTop = Math.max(20, maxTop);
        }
      }
      
      // 确保目录不会超出视口底部
      if (newTop + estimatedTocHeight > viewportHeight - 20) {
        newTop = Math.max(20, viewportHeight - estimatedTocHeight - 20);
      }

      setTocTop(newTop);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始检查

    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedPost]);

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-10 text-center text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-2xl">
        {error}
      </div>
    );
  }

  if (selectedPost) {
    const displayDate = formatDate(selectedPost.published_at || selectedPost.created_at);
    const readTime = estimateReadTime(selectedPost.content);

    return (
      <div className="max-w-7xl mx-auto pt-4 pb-12 px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 目录侧边栏占位 - 保持布局 */}
          {headings.length > 0 && (
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="w-full" />
            </aside>
          )}

          {/* 文章内容 */}
          <article className="flex-1 min-w-0 bg-white/95 dark:bg-gray-900/80 rounded-3xl shadow-xl overflow-hidden border border-gray-100/60 dark:border-gray-800/80 backdrop-blur-2xl">
            {selectedPost.cover_image && (
              <img
                src={selectedPost.cover_image}
                alt={selectedPost.title}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            )}

            <div className="p-10 space-y-6">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-200 text-xs font-bold">
                  {selectedPost.category?.name || '未分类'}
                </span>
                <span>{displayDate}</span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {readTime} min read
                </span>
              </div>

              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{selectedPost.title}</h1>

              <div className="flex flex-wrap gap-3">
                {selectedPost.tags.map(tag => (
                  <span key={tag.id} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-3 py-1 rounded-full">
                    #{tag.name}
                  </span>
                ))}
              </div>

              <div ref={contentRef} className="markdown-content max-w-none leading-relaxed text-gray-700 dark:text-gray-200">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSlug]}
                >
                  {selectedPost.content}
                </ReactMarkdown>
              </div>
            </div>
          </article>
        </div>

        {/* 固定目录 - 始终在视口中可见 */}
        {headings.length > 0 && (
          <>
            {/* 移动端目录 */}
            <div className="lg:hidden fixed bottom-4 right-4 z-40">
              <button
                onClick={() => setTocExpanded(!tocExpanded)}
                className="p-3 glass-card rounded-full shadow-lg hover:shadow-xl transition-all"
                aria-label="目录"
              >
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {tocExpanded && (
                <div className="absolute bottom-16 right-0 w-72 glass-card rounded-2xl border border-gray-200/60 dark:border-gray-800/80 p-4 shadow-xl flex flex-col" style={{ maxHeight: '60vh' }}>
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      目录
                    </h2>
                    <button
                      onClick={() => setTocExpanded(false)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <nav className="space-y-1 overflow-y-auto flex-1 min-h-0 toc-scroll" style={{ maxHeight: 'calc(60vh - 80px)' }}>
                    {headings.map((heading) => (
                      <button
                        key={heading.id}
                        data-heading-id={heading.id}
                        onClick={() => {
                          scrollToHeading(heading.id);
                          setTocExpanded(false);
                        }}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                          activeHeading === heading.id
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 font-semibold'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                        }`}
                        style={{ paddingLeft: `${(heading.level - 1) * 0.75 + 0.75}rem` }}
                      >
                        <span className="truncate block">{heading.text}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </div>

            {/* 桌面端固定目录 - 左侧与导航栏对齐，动态调整位置 */}
            <aside 
              ref={tocContainerRef}
              className="hidden lg:block fixed z-40 w-64 toc-fixed" 
              style={{ 
                top: `${tocTop}px`,
                transition: 'top 0.2s ease-out',
              }}
            >
              <div className="glass-card rounded-2xl border border-gray-200/60 dark:border-gray-800/80 p-5 backdrop-blur-sm shadow-xl flex flex-col" style={{ maxHeight: `calc(100vh - ${tocTop + 40}px)` }}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  目录
                </h2>
                <nav 
                  ref={tocNavRef}
                  className="space-y-1 overflow-y-auto flex-1 min-h-0 toc-scroll" 
                  style={{ maxHeight: 'calc(100vh - 200px)' }}
                >
                  {headings.map((heading) => (
                    <button
                      key={heading.id}
                      data-heading-id={heading.id}
                      onClick={() => scrollToHeading(heading.id)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                        activeHeading === heading.id
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                      }`}
                      style={{ paddingLeft: `${(heading.level - 1) * 0.75 + 0.75}rem` }}
                    >
                      <span className="truncate block">{heading.text}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 md:px-6">
      <div className="mb-12 text-center md:text-left space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 text-xs font-semibold tracking-[0.3em] uppercase">
          Blog
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
          思维碎片
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
          聚焦系统设计、AI 工具链与摄影视角下的产品感。分类按钮会即时过滤，不再跳跃布局。
        </p>
        <div className="flex gap-2 flex-wrap justify-center md:justify-start">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-white/90 dark:bg-gray-900/60 text-gray-600 dark:text-gray-300 border border-gray-200/70 dark:border-gray-700 hover:border-primary-300'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPosts.map(post => {
          const categoryLabel = post.category?.name || '未分类';
          const displayDate = formatDate(post.published_at || post.created_at);
          const snippet = post.excerpt || `${post.content.slice(0, 140)}...`;
          const readTime = estimateReadTime(post.content);
          const coverImage = post.cover_image || undefined;

          return (
            <article
              key={post.id}
              className="group flex flex-col bg-white/90 dark:bg-gray-900/70 rounded-3xl border border-gray-100/70 dark:border-gray-800 overflow-hidden shadow-md hover:shadow-2xl transition-all backdrop-blur w-full max-w-[420px] justify-self-center"
            >
              <button
                type="button"
                onClick={() => setSelectedPost(post)}
                className="text-left flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <div className="relative h-56 bg-gradient-to-br from-primary-500/20 to-purple-500/30">
                  {coverImage ? (
                    <LazyImage
                      src={coverImage}
                      alt={post.title}
                      className="h-56 w-full"
                    />
                  ) : (
                    <div className="h-56 w-full flex items-center justify-center text-primary-500 font-semibold text-lg">
                      {categoryLabel}
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-3 py-1 bg-black/50 text-white rounded-full backdrop-blur">
                      {categoryLabel}
                    </span>
                    <span className="px-3 py-1 bg-white/70 text-gray-800 rounded-full">
                      {displayDate}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary-500 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed line-clamp-3 flex-1">
                    {snippet}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {readTime} min read
                    </span>
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">阅读全文 →</span>
                  </div>
                </div>
              </button>

              {post.tags.length > 0 && (
                <div className="px-6 pb-6 flex flex-wrap gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                  {post.tags.map(tag => (
                    <span key={tag.id} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/80 px-3 py-1 rounded-full">
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* 无限滚动触发器 */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loadingMore && (
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent" />
          )}
        </div>
      )}

      {!hasMore && filteredPosts.length > 0 && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          已加载全部内容
        </div>
      )}
    </div>
  );
};