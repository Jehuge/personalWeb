import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { BlogPost } from '../types';
import { fetchPosts, fetchBlog } from '../services/dataService';
import { LazyImage } from './LazyImage';
import Loader from './Loader';

interface Heading {
  id: string;
  text: string;
  level: number;
}

const estimateReadTime = (content: string) => {
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
    // 固定顶部栏高度约 80px，加上一些间距
    const offset = 100;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

// 性能优化：节流函数
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - timeSinceLastCall);
    }
  };
};

// 使用 requestAnimationFrame 的节流
const rafThrottle = <T extends (...args: any[]) => any>(
  func: T
): ((...args: Parameters<T>) => void) => {
  let rafId: number | null = null;
  
  return (...args: Parameters<T>) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      func(...args);
      rafId = null;
    });
  };
};

// 优化的 Markdown 内容组件 - 分块渲染
const OptimizedMarkdownContent = memo<{ content: string; onRenderComplete?: () => void }>(({ content, onRenderComplete }) => {
  const [renderedChunks, setRenderedChunks] = useState<string[]>([]);
  const [isRendering, setIsRendering] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<number | null>(null);
  
  // 将内容按段落分割成块 - 增加块大小以减少渲染频率
  const chunks = useMemo(() => {
    if (!content) return [];
    // 按双换行符分割（段落）
    const paragraphs = content.split(/\n\n+/);
    const result: string[] = [];
    let currentChunk = '';
    
    // 每 5 个段落组成一个块，减少渲染频率（从 3 增加到 5）
    // 对于短文章，直接一次性渲染
    if (paragraphs.length <= 5) {
      return [content];
    }
    
    for (let i = 0; i < paragraphs.length; i++) {
      currentChunk += paragraphs[i] + '\n\n';
      if ((i + 1) % 5 === 0 || i === paragraphs.length - 1) {
        result.push(currentChunk.trim());
        currentChunk = '';
      }
    }
    
    return result.length > 0 ? result : [content];
  }, [content]);
  
  // 分块渲染逻辑
  useEffect(() => {
    setIsRendering(true);
    setRenderedChunks([]);
    
    let currentIndex = 0;
    const totalChunks = chunks.length;
    
    const renderNextChunk = () => {
      if (currentIndex >= totalChunks) {
        setIsRendering(false);
        // 所有块渲染完成后，通知父组件
        if (onRenderComplete) {
          // 延迟一点确保 DOM 已更新
          setTimeout(() => {
            onRenderComplete();
          }, 100);
        }
        return;
      }
      
      setRenderedChunks(prev => [...prev, chunks[currentIndex]]);
      currentIndex++;
      
      // 使用 requestIdleCallback 在浏览器空闲时渲染下一块
      // 增加延迟时间以减少渲染频率，降低功耗
      if ('requestIdleCallback' in window) {
        renderTaskRef.current = (window as any).requestIdleCallback(renderNextChunk, { timeout: 200 });
      } else {
        // 降级方案：增加延迟到 50ms，减少渲染频率
        renderTaskRef.current = setTimeout(renderNextChunk, 50) as unknown as number;
      }
    };
    
    // 立即渲染第一块
    if (totalChunks > 0) {
      renderNextChunk();
    } else {
      setIsRendering(false);
    }
    
    return () => {
      if (renderTaskRef.current !== null) {
        if ('requestIdleCallback' in window) {
          (window as any).cancelIdleCallback(renderTaskRef.current);
        } else {
          clearTimeout(renderTaskRef.current);
        }
      }
    };
  }, [chunks, onRenderComplete]);
  
  return (
    <div ref={containerRef} className="markdown-content max-w-none leading-relaxed text-gray-700 dark:text-gray-200">
      {renderedChunks.map((chunk, index) => (
        <ReactMarkdown
          key={index}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSlug]}
        >
          {chunk}
        </ReactMarkdown>
      ))}
      {isRendering && (
        <div className="flex items-center justify-center py-4 text-sm text-gray-400">
          <div className="animate-spin h-4 w-4 border-2 border-primary-500 rounded-full border-t-transparent mr-2" />
          加载中...
        </div>
      )}
    </div>
  );
});

OptimizedMarkdownContent.displayName = 'OptimizedMarkdownContent';

export const BlogView: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  // 目录相关的 hooks
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [tocExpanded, setTocExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const tocNavRef = useRef<HTMLElement>(null);
  const tocContainerRef = useRef<HTMLElement>(null);
  const [tocTop, setTocTop] = useState(100);
  
  // 缓存 DOM 查询结果
  const headingElementsCacheRef = useRef<Map<string, HTMLElement>>(new Map());
  
  const PAGE_SIZE = 12;

  // 根据路由参数加载博客详情
  useEffect(() => {
    if (id) {
      const blogId = parseInt(id, 10);
      if (!isNaN(blogId)) {
        const post = posts.find(p => p.id === blogId);
        if (post) {
          setSelectedPost(post);
        } else {
          fetchBlog(blogId)
            .then(singleBlog => {
              setSelectedPost(singleBlog);
              if (!posts.find(p => p.id === blogId)) {
                setPosts(prev => [singleBlog, ...prev]);
              }
            })
            .catch(error => {
              console.error('Failed to fetch blog:', error);
              setError('博客加载失败，请稍后重试');
            });
        }
      }
    } else {
      setSelectedPost(null);
    }
  }, [id, posts]);

  // 监听来自首页的博客选择事件
  useEffect(() => {
    const handleSelectBlog = async (event: CustomEvent<{ blogId: number }>) => {
      const blogId = event.detail.blogId;
      navigate(`/blog/${blogId}`);
    };

    window.addEventListener('blogSelectPost', handleSelectBlog as EventListener);
    return () => {
      window.removeEventListener('blogSelectPost', handleSelectBlog as EventListener);
    };
  }, [navigate]);

  // 加载博客数据
  const loadPosts = async (page: number) => {
    setLoading(true);
    setError(null);
    const MIN_LOADING_MS = 900;
    const start = performance.now();

    try {
      const data = await fetchPosts({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
      setPosts(data);
      setHasMore(data.length === PAGE_SIZE);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to load blogs', err);
      setError('内容加载失败，请稍后重试');
      setPosts([]);
      setHasMore(false);
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

  // 初始加载
  useEffect(() => {
    loadPosts(0);
  }, []);

  // 处理分页
  const handlePreviousPage = () => {
    if (currentPage > 0) {
      loadPosts(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      loadPosts(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const categories = useMemo(() => {
    const names = new Set(posts.map(post => post.category?.name?.trim() || '未分类'));
    return ['全部', ...Array.from(names)];
  }, [posts]);

  const filteredPosts = selectedCategory === '全部'
    ? posts
    : posts.filter(p => (p.category?.name?.trim() || '未分类') === selectedCategory);

  // 标题提取触发标志
  const [shouldExtractHeadings, setShouldExtractHeadings] = useState(false);
  const renderCompleteRef = useRef(false);

  // 当 Markdown 渲染完成时触发标题提取
  const handleMarkdownRenderComplete = useCallback(() => {
    renderCompleteRef.current = true;
    setShouldExtractHeadings(true);
  }, []);

  // 当文章变化时，重置标志
  useEffect(() => {
    if (selectedPost) {
      renderCompleteRef.current = false;
      setShouldExtractHeadings(false);
      setHeadings([]);
    }
  }, [selectedPost?.id]);

  // 优化的标题提取 - 监听渲染完成标志
  useEffect(() => {
    if (!selectedPost) {
      setHeadings([]);
      setShouldExtractHeadings(false);
      return;
    }

    if (!shouldExtractHeadings) {
      return;
    }

    const extractHeadings = () => {
      const extractedHeadings = extractHeadingsFromDOM();
      setHeadings(extractedHeadings);
      
      // 缓存标题元素
      headingElementsCacheRef.current.clear();
      extractedHeadings.forEach(heading => {
        const element = document.getElementById(heading.id);
        if (element) {
          headingElementsCacheRef.current.set(heading.id, element);
        }
      });
      
      // 重置标志
      setShouldExtractHeadings(false);
    };

    // 使用 MutationObserver 监听 DOM 变化，确保所有标题都已渲染
    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (contentRef.current) {
      // 先延迟一点，确保所有块都已渲染
      timeoutId = setTimeout(() => {
        extractHeadings();
        
        // 如果还没提取到，使用 MutationObserver 继续监听
        if (contentRef.current) {
          observer = new MutationObserver(() => {
            const headings = extractHeadingsFromDOM();
            if (headings.length > 0) {
              setHeadings(headings);
              headingElementsCacheRef.current.clear();
              headings.forEach(heading => {
                const element = document.getElementById(heading.id);
                if (element) {
                  headingElementsCacheRef.current.set(heading.id, element);
                }
              });
              setShouldExtractHeadings(false);
              observer?.disconnect();
            }
          });

          observer.observe(contentRef.current, {
            childList: true,
            subtree: true,
          });

          // 最多监听 3 秒
          setTimeout(() => {
            observer?.disconnect();
            setShouldExtractHeadings(false);
          }, 3000);
        }
      }, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (observer) observer.disconnect();
    };
  }, [selectedPost, shouldExtractHeadings]);

  // 优化的滚动监听 - 使用节流，减少更新频率以降低功耗
  useEffect(() => {
    if (headings.length === 0) {
      setActiveHeading('');
      return;
    }

    // 使用更激进的节流 - 每 200ms 最多更新一次
    const handleScroll = throttle(() => {
      // 固定顶部栏高度约 80px，加上一些偏移量
      const scrollPosition = window.scrollY + 100;

      // 从后往前查找，找到第一个位置小于等于滚动位置的标题
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        let element = headingElementsCacheRef.current.get(heading.id);
        
        if (!element) {
          element = document.getElementById(heading.id);
          if (element) {
            headingElementsCacheRef.current.set(heading.id, element);
          }
        }
        
        if (element) {
          const offsetTop = element.offsetTop;
          if (scrollPosition >= offsetTop) {
            setActiveHeading(heading.id);
            return;
          }
        }
      }
      
      // 如果没有找到，设置为第一个标题
      if (headings.length > 0) {
        setActiveHeading(headings[0].id);
      }
    }, 200); // 增加到 200ms，减少更新频率

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 初始检查

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  // 目录自动滚动到当前激活的标题 - 使用节流减少滚动频率
  const lastScrollTimeRef = useRef<number>(0);
  useEffect(() => {
    if (!activeHeading || !tocNavRef.current) return;

    // 限制滚动频率 - 至少间隔 500ms 才滚动一次
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 500) {
      return;
    }

    const nav = tocNavRef.current;
    const activeButton = nav.querySelector(`[data-heading-id="${activeHeading}"]`) as HTMLElement;
    
    if (!activeButton) return;

    const navRect = nav.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    // 只有在按钮完全不可见时才滚动
    if (buttonRect.top < navRect.top || buttonRect.bottom > navRect.bottom) {
      lastScrollTimeRef.current = now;
      if (buttonRect.top < navRect.top) {
        nav.scrollTo({
          top: activeButton.offsetTop - nav.offsetTop - 20,
          behavior: 'smooth'
        });
      } else if (buttonRect.bottom > navRect.bottom) {
        nav.scrollTo({
          top: activeButton.offsetTop - nav.offsetTop - nav.clientHeight + activeButton.offsetHeight + 20,
          behavior: 'smooth'
        });
      }
    }
  }, [activeHeading]);

  // 优化的目录位置检测 - 顶部栏现在是固定的，所以目录位置也是固定的
  useEffect(() => {
    if (!selectedPost) return;

    const handleScroll = throttle(() => {
      // 固定顶部栏高度约 80px，目录从 100px 开始
      let newTop = 100;

      const viewportHeight = window.innerHeight;
      const footer = document.querySelector('footer');
      const footerRect = footer?.getBoundingClientRect();
      
      // 目录高度
      const estimatedTocHeight = 480;
      
      // 如果 footer 进入视口，调整目录位置避免重叠
      if (footerRect && footerRect.top < viewportHeight) {
        // 确保目录完全在footer上方，留出20px间距
        const maxTop = footerRect.top - estimatedTocHeight - 20;
        if (newTop > maxTop) {
          newTop = Math.max(100, maxTop);
        }
      }
      
      // 确保目录不会超出视口，同时考虑footer高度
      const footerHeight = footerRect ? footerRect.height : 0;
      const availableHeight = viewportHeight - newTop - footerHeight - 20;
      if (availableHeight < estimatedTocHeight) {
        newTop = Math.max(100, viewportHeight - estimatedTocHeight - footerHeight - 20);
      }

      setTocTop(newTop);
    }, 300); // 增加到 300ms，进一步减少更新频率

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedPost]);

  if (loading) {
    return <Loader />;
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
          {/* 目录侧边栏占位 - 始终显示，避免内容占用目录空间 */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="w-full" />
          </aside>

          {/* 文章内容 */}
          <article className="flex-1 min-w-0 bg-white dark:bg-[#0b1425] rounded-3xl shadow-xl overflow-hidden border border-gray-200/60 dark:border-slate-700/80 backdrop-blur-2xl transition-colors">
            {selectedPost.cover_image && (
              <LazyImage
                src={selectedPost.cover_image}
                alt={selectedPost.title}
                className="w-full h-auto object-cover"
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

              <div ref={contentRef}>
                <OptimizedMarkdownContent 
                  content={selectedPost.content} 
                  onRenderComplete={handleMarkdownRenderComplete}
                />
              </div>
            </div>
          </article>
        </div>

        {/* 固定目录 - 始终显示容器，避免突然出现 */}
        {selectedPost && (
          <>
            {/* 移动端目录 */}
            <div className="lg:hidden fixed bottom-28 right-8 z-40">
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
                <div className="absolute bottom-16 right-0 w-72 glass-card rounded-2xl border border-gray-200/60 dark:border-gray-800/80 p-4 shadow-xl flex flex-col animate-fade-in" style={{ maxHeight: '50vh' }}>
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
                  <nav className="space-y-1 overflow-y-auto flex-1 min-h-0 toc-scroll" style={{ maxHeight: 'calc(50vh - 80px)' }}>
                    {headings.length > 0 ? (
                      headings.map((heading) => (
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
                      ))
                    ) : (
                      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                        <div className="animate-spin h-4 w-4 border-2 border-primary-500 rounded-full border-t-transparent mr-2" />
                        加载目录中...
                      </div>
                    )}
                  </nav>
                </div>
              )}
            </div>

            {/* 桌面端固定目录 */}
            <aside 
              ref={tocContainerRef}
              className="hidden lg:block fixed z-40 w-64 toc-fixed animate-fade-in" 
              style={{ 
                top: `${tocTop}px`,
                transition: 'top 0.2s ease-out, opacity 0.3s ease-out',
                opacity: headings.length > 0 ? 1 : 0.7,
              }}
            >
              <div className="glass-card rounded-2xl border border-gray-200/60 dark:border-gray-800/80 p-5 backdrop-blur-sm shadow-xl flex flex-col" style={{ maxHeight: '480px' }}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  目录
                </h2>
                <nav 
                  ref={tocNavRef}
                  className="space-y-1 overflow-y-auto flex-1 min-h-0 toc-scroll" 
                  style={{ maxHeight: '420px' }}
                >
                  {headings.length > 0 ? (
                    headings.map((heading) => (
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
                    ))
                  ) : (
                    <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                      <div className="animate-spin h-4 w-4 border-2 border-primary-500 rounded-full border-t-transparent mr-2" />
                      加载目录中...
                    </div>
                  )}
                </nav>
              </div>
            </aside>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="mb-16 text-center md:text-left space-y-6">
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
                  : 'bg-slate-50/90 dark:bg-slate-800/60 text-gray-600 dark:text-gray-300 border border-gray-200/70 dark:border-slate-700 hover:border-primary-300'
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
              className="blog-card group flex flex-col bg-slate-50/90 dark:bg-slate-900/80 rounded-3xl border border-gray-200/70 dark:border-slate-700/80 overflow-hidden shadow-md hover:shadow-2xl hover:shadow-cyber-accent/20 transition-shadow duration-300 backdrop-blur w-full max-w-[420px] justify-self-center"
            >
              <button
                type="button"
                onClick={() => navigate(`/blog/${post.id}`)}
                className="text-left flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <div className="relative h-56 bg-gradient-to-br from-primary-500/20 to-cyan-500/30">
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

      {/* 分页控件 */}
      {filteredPosts.length > 0 && (
        <div className="flex items-center justify-center gap-4 py-8">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 0 || loading}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentPage === 0 || loading
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            上一页
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            第 {currentPage + 1} 页
          </span>
          <button
            onClick={handleNextPage}
            disabled={!hasMore || loading}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              !hasMore || loading
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            下一页
          </button>
        </div>
      )}

      {filteredPosts.length === 0 && !loading && (
        <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
          暂无内容
        </div>
      )}
    </div>
  );
};

