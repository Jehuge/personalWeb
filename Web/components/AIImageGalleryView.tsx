import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { AIImage } from '../types';
import { fetchAIImages, fetchAIImage } from '../services/dataService';
import Loader from './Loader';
import { ZoomableImage } from './ZoomableImage';
import PuzzleCaptcha from './PuzzleCaptcha';
import { LazyImage } from './LazyImage';

export const AIImageGalleryView: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [images, setImages] = useState<AIImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesHasMore, setImagesHasMore] = useState(false);
  const [imagesPage, setImagesPage] = useState(0);
  const [imagesTotalCount, setImagesTotalCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<AIImage | null>(null);
  const [showDownloadVerification, setShowDownloadVerification] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ url: string; filename: string } | null>(null);

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
  const handleDownloadRequest = (url: string, filename: string) => {
    setPendingDownload({ url, filename });
    setShowDownloadVerification(true);
  };

  // 验证通过后执行下载
  const handleDownloadAfterVerify = () => {
    if (pendingDownload) {
      downloadImage(pendingDownload.url, pendingDownload.filename);
      setPendingDownload(null);
    }
    setShowDownloadVerification(false);
  };
  const [fwAccessCode, setFwAccessCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [imageAspectMap, setImageAspectMap] = useState<Record<number, number>>({});
  const [columnImages, setColumnImages] = useState<AIImage[][]>([]);
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  });
  const imageColumnMapRef = useRef<Record<number, number>>({});
  const tiltRafRef = useRef<number | null>(null);
  const hasScrolledToTopRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
  
  // 使用 useRef 防止组件意外重新挂载导致的重复请求
  const hasLoadedRef = useRef(false);

  const PAGE_SIZE = 10;

  // 响应式列数，保持布局稳定
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const next =
        width >= 1024 ? 3 :
        width >= 768 ? 2 : 1;
      setColumnCount((prev) => (prev === next ? prev : next));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 加载 Images 数据
  const loadImages = async (page: number, accessCode?: string, append = false) => {
    const MIN_LOADING_MS = 400;
    const start = performance.now();
    if (append) {
      setIsLoadingMore(true);
    } else {
      setImagesLoading(true);
    }
    try {
      const response = await fetchAIImages({ 
        skip: page * PAGE_SIZE, 
        limit: PAGE_SIZE,
        fw_access_code: accessCode || fwAccessCode || undefined
      });
      setImages((prev) => {
        if (!append || page === 0) return response.data;
        const existingIds = new Set(prev.map((img) => img.id));
        const merged = [...prev, ...response.data.filter((img: AIImage) => !existingIds.has(img.id))];
        return merged;
      });
      setImagesTotalCount(response.total);
      setImagesHasMore((page + 1) * PAGE_SIZE < response.total && response.data.length > 0);
      setImagesPage(page);
    } catch (err) {
      console.error('Failed to load AI images', err);
      if (!append) {
        setImages([]);
        setImagesHasMore(false);
        setImagesTotalCount(0);
      }
      // 如果是初始加载失败，重置标志允许重试
      if (page === 0) {
        hasLoadedRef.current = false;
      }
    } finally {
      const elapsed = performance.now() - start;
      const remaining = MIN_LOADING_MS - elapsed;
      const finish = () => {
        setImagesLoading(false);
        setIsLoadingMore(false);
      };
      if (remaining > 0) {
        setTimeout(finish, remaining);
      } else {
        finish();
      }
    }
  };

  // 组件挂载时滚动到顶部（列表页和详情页都需要）
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);


  // 初始加载
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadImages(0);
  }, []);

  // 将图片分配到固定列，避免“加载更多”时已加载图片跳动
  useEffect(() => {
    if (!images.length) {
      setColumnImages(Array.from({ length: columnCount }, () => []));
      imageColumnMapRef.current = {};
      return;
    }

    const columns = Array.from({ length: columnCount }, () => [] as AIImage[]);
    const heights = Array(columnCount).fill(0);
    const estimateHeight = (img: AIImage) => {
      const ratio = imageAspectMap[img.id];
      if (ratio && ratio > 0) {
        return 1 / ratio; // 横图更矮，竖图更高
      }
      return 1; // 未知比例时给一个稳定占位
    };

    for (const img of images) {
      let targetColumn = imageColumnMapRef.current[img.id];
      if (targetColumn === undefined || targetColumn >= columnCount) {
        // 新图片或列数变化时，放入当前最矮的列
        let minHeight = heights[0];
        targetColumn = 0;
        for (let i = 1; i < columnCount; i++) {
          if (heights[i] < minHeight) {
            minHeight = heights[i];
            targetColumn = i;
          }
        }
        imageColumnMapRef.current[img.id] = targetColumn;
      }

      const estimatedHeight = estimateHeight(img);
      heights[targetColumn] += estimatedHeight;
      columns[targetColumn].push(img);
    }

    setColumnImages(columns);
  }, [images, imageAspectMap, columnCount]);

  // 根据路由参数加载图片详情
  const lastFetchedImageIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (id) {
      const imageId = parseInt(id, 10);
      if (!isNaN(imageId)) {
        // 如果已经为这个图片 ID 获取过详情，避免重复请求
        const image = images.find(img => img.id === imageId);
        if (image && lastFetchedImageIdRef.current === imageId) {
          // 已经获取过，直接使用
          setSelectedImage(image);
          setImagesLoading(false);
        } else {
          // 需要调用 API 获取最新数据（包括更新的浏览次数）
          if (images.length === 0) {
            setImagesLoading(true);
          }
          lastFetchedImageIdRef.current = imageId;
          fetchAIImage(imageId)
            .then(img => {
              setSelectedImage(img);
              setImagesLoading(false);
              // 更新列表中的数据，以便显示最新的浏览次数
              setImages(prev => {
                const existing = prev.find(im => im.id === imageId);
                if (existing) {
                  return prev.map(im => im.id === imageId ? img : im);
                } else {
                  return [img, ...prev];
                }
              });
            })
            .catch(err => {
              console.error('Failed to fetch image:', err);
              setImagesLoading(false);
              // 如果获取失败，仍然使用列表中的数据
              if (image) {
                setSelectedImage(image);
              }
            });
        }
      }
    } else {
      setSelectedImage(null);
      lastFetchedImageIdRef.current = null;
    }
  }, [id, images]);

  // 当下载验证弹出框打开时禁用背景滚动
  useEffect(() => {
    if (showDownloadVerification) {
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
  }, [showDownloadVerification]);

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFwAccessCode(inputCode);
    loadImages(0, inputCode);
  };


  // 如果是详情页，显示详情视图或加载状态
  if (id) {
    if (imagesLoading || !selectedImage) {
      return <Loader fullscreen />;
    }

    return (
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* 图片展示区域 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700">
              <div className="relative w-full" style={{ height: 'calc(100vh - 240px)', minHeight: '600px', maxHeight: '85vh' }}>
                <ZoomableImage
                  src={selectedImage.thumbnail_url || selectedImage.image_url}
                  alt={selectedImage.title || 'AI Image'}
                />
              </div>
            </div>
          </div>

          {/* 图片信息 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 lg:sticky lg:top-24">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{selectedImage.title || '无标题'}</h3>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    const filename = `${selectedImage.title || 'ai-image'}-${selectedImage.id}.jpg`;
                    handleDownloadRequest(selectedImage.image_url, filename);
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
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedImage.view_count || 0} 次</p>
                </div>
                {selectedImage.prompt && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-1">提示词 (Prompt)</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedImage.prompt}</p>
                  </div>
                )}

                {selectedImage.negative_prompt && (
                  <div>
                    <label className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">反向提示词 (Negative)</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selectedImage.negative_prompt}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">模型</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedImage.model_name || '未知'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">创建时间</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(selectedImage.created_at).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>

                {selectedImage.parameters && (
                  <div>
                    <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">生成参数</label>
                    <pre className="mt-2 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto border border-gray-200 dark:border-slate-700">
                      {typeof selectedImage.parameters === 'string'
                        ? selectedImage.parameters
                        : JSON.stringify(selectedImage.parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 列表视图
  if (imagesLoading) {
    return <Loader fullscreen />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 mb-4">
          AI 艺术图库
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6">
          由 Stable Diffusion / Midjourney 等模型生成的艺术作品。
        </p>
        <form onSubmit={handleAccessCodeSubmit} className="flex items-center justify-center gap-2 max-w-md mx-auto">
          <input
            type="password"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="输入"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium transition-colors text-sm"
          >
            确认
          </button>
        </form>
      </div>

      <section className="mb-16 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {columnImages.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col space-y-8 md:space-y-10">
              {column.map((image) => {
                return (
                  <article
                    key={image.id}
                    className="break-inside-avoid group relative rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer transition-all duration-300"
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
                    onClick={() => {
                      navigate(`/ai-gallery/${image.id}`);
                    }}
                  >
                    <LazyImage
                      src={image.thumbnail_url || image.image_url}
                      alt={image.title || 'AI Generated Image'}
                      imageId={image.id}
                      autoAspectRatio={true}
                      defaultAspectRatio={16 / 9}
                      placeholderType="pulse"
                      imageClassName="w-full h-full object-contain"
                      className="overflow-hidden bg-gray-100 dark:bg-gray-700"
                      onAspectRatioChange={(ratio) => {
                        const nextRatio = Number(ratio.toFixed(4));
                        setImageAspectMap((prev) => ({ ...prev, [image.id]: nextRatio }));
                      }}
                    />
                    <div className="px-3 pt-0.5 pb-0.5 md:px-4 md:pt-1 md:pb-1 min-h-[46px] flex flex-col justify-between gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-normal text-gray-900 dark:text-white truncate flex-1 leading-tight">
                          {image.title || '无标题'}
                        </h4>
                        <div className="flex flex-col items-end gap-1 min-w-[120px]">
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            点击查看 Prompt
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            {image.view_count || 0} 次浏览
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>

        {/* 加载更多按钮 */}
        <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
          {imagesHasMore ? (
            <button
              onClick={() => loadImages(imagesPage + 1, undefined, true)}
              disabled={isLoadingMore || imagesLoading}
              className="px-5 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? '加载中...' : '加载更多'}
            </button>
          ) : (
            <span>已加载全部</span>
          )}
        </div>

        {images.length === 0 && !imagesLoading && (
          <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
            暂无图片
          </div>
        )}


        {/* 下载验证 */}
        {showDownloadVerification && (
          <PuzzleCaptcha
            title="下载验证"
            description="请拖动滑块完成拼图验证后下载原图"
            onSuccess={handleDownloadAfterVerify}
            onClose={() => {
              setShowDownloadVerification(false);
              setPendingDownload(null);
            }}
          />
        )}
      </section>
    </div>
  );
};

