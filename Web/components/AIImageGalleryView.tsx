import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AIImage } from '../types';
import { fetchAIImages } from '../services/dataService';
import Loader from './Loader';

export const AIImageGalleryView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [images, setImages] = useState<AIImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesHasMore, setImagesHasMore] = useState(false);
  const [imagesPage, setImagesPage] = useState(0);
  const [imagesTotalCount, setImagesTotalCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<AIImage | null>(null);
  const [nsfwAccessCode, setNsfwAccessCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [imageLoadedMap, setImageLoadedMap] = useState<Record<number, boolean>>({});
  const [imageAspectMap, setImageAspectMap] = useState<Record<number, number>>({});
  const tiltRafRef = useRef<number | null>(null);
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

  const PAGE_SIZE = 15;

  // 加载 Images 数据
  const loadImages = async (page: number, accessCode?: string) => {
    const MIN_LOADING_MS = 900;
    const start = performance.now();
    setImagesLoading(true);
    try {
      const response = await fetchAIImages({ 
        skip: page * PAGE_SIZE, 
        limit: PAGE_SIZE,
        nsfw_access_code: accessCode || nsfwAccessCode || undefined
      });
      setImages(response.data);
      setImagesTotalCount(response.total);
      setImagesHasMore((page + 1) * PAGE_SIZE < response.total);
      setImagesPage(page);
    } catch (err) {
      console.error('Failed to load AI images', err);
      setImages([]);
      setImagesHasMore(false);
      setImagesTotalCount(0);
      // 如果是初始加载失败，重置标志允许重试
      if (page === 0) {
        hasLoadedRef.current = false;
      }
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

  // 根据 URL page 参数加载
  useEffect(() => {
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const nextPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    if (hasLoadedRef.current && imagesPage === nextPage - 1) return;
    hasLoadedRef.current = true;
    loadImages(nextPage - 1);
  }, [searchParams]);

  const handleGoPage = (pageNumber: number) => {
    const totalPages = Math.max(1, Math.ceil(imagesTotalCount / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, pageNumber), totalPages);
    setSearchParams({ page: String(safePage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNsfwAccessCode(inputCode);
    loadImages(0, inputCode);
  };

  if (imagesLoading) {
    return <Loader fullscreen />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 via-accent-500 to-primary-300 mb-4">
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
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors text-sm"
          >
            确认
          </button>
        </form>
      </div>

      <section className="mb-16 animate-fade-in">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {images.map((image) => {
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
                {(() => {
                  const ratio = imageAspectMap[image.id];
                  return (
                    <div
                      className="relative overflow-hidden bg-gray-100 dark:bg-gray-700"
                      style={ratio ? { aspectRatio: ratio } : { aspectRatio: '16 / 9' }}
                    >
                      {!imageLoadedMap[image.id] && (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse" />
                      )}
                      <img
                        src={image.thumbnail_url || image.image_url}
                        alt={image.title || 'AI Generated Image'}
                        className="absolute inset-0 w-full h-full object-contain block"
                        loading="lazy"
                        onLoad={(e) => {
                          const { naturalWidth, naturalHeight } = e.currentTarget;
                          if (naturalWidth && naturalHeight) {
                            const nextRatio = Number((naturalWidth / naturalHeight).toFixed(4));
                            setImageAspectMap((prev) => ({ ...prev, [image.id]: nextRatio }));
                          }
                          setImageLoadedMap((prev) => ({ ...prev, [image.id]: true }));
                        }}
                      />
                    </div>
                  );
                })()}
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

        {/* 分页控件 */}
        {images.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 py-8">
            <button
              onClick={() => handleGoPage(imagesPage)}
              disabled={imagesPage === 0 || imagesLoading}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${imagesPage === 0 || imagesLoading
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
            >
              上一页
            </button>
            {Array.from({ length: Math.max(1, Math.ceil(imagesTotalCount / PAGE_SIZE)) }, (_, idx) => idx + 1).map((pageNum) => {
              const isActive = pageNum === imagesPage + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => handleGoPage(pageNum)}
                  className={`min-w-[36px] px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                  disabled={imagesLoading}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handleGoPage(imagesPage + 2)}
              disabled={!imagesHasMore || imagesLoading}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!imagesHasMore || imagesLoading
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
                      <label className="text-xs font-semibold text-accent-500 uppercase tracking-wider">提示词 (Prompt)</label>
                      <p className="text-sm text-gray-300 mt-1 leading-relaxed">{selectedImage.prompt}</p>
                    </div>
                  )}

                  {selectedImage.negative_prompt && (
                    <div>
                      <label className="text-xs font-semibold text-primary-200 uppercase tracking-wider">反向提示词 (Negative)</label>
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
    </div>
  );
};

