import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotoWork, PhotoExif } from '../types';
import { fetchPhotos, fetchPhoto } from '../services/dataService';
import { LazyImage } from './LazyImage';
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

type ParsedExifData = {
  make: string;
  model: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  shootTime: string;
};

const parsePhotoMeta = (description?: string | null) => {
  if (!description) {
    return { exif: '——' };
  }

  // 如果 description 包含 | 分隔符，取第二部分作为 exif
  const parts = description.split('|').map(part => part.trim());
  return {
    exif: parts.length > 1 ? parts[1] : '——',
  };
};

const normalizeDateValue = (value?: string | null) => {
  if (!value) return null;
  // EXIF 日期格式通常为 YYYY:MM:DD HH:MM:SS，需要转换成合法日期
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

const formatPhotoShootDate = (photo: PhotoWork) => {
  const rawDate =
    photo.shoot_time ||
    (typeof photo.exif === 'object' && (photo.exif?.DateTimeOriginal || photo.exif?.CreateDate)) ||
    photo.created_at;

  const parsed = normalizeDateValue(rawDate);
  if (parsed) {
    return parsed.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  const fallback = new Date(rawDate);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleDateString('zh-CN');
  }

  return rawDate || '未知时间';
};

export const GalleryView: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<PhotoWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('全部');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWork | null>(null);
  const [exifData, setExifData] = useState<ParsedExifData | null>(null);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 18;
  const selectedMeta = selectedPhoto ? parsePhotoMeta(selectedPhoto.description) : { exif: '——' };
  const isVisible = usePageVisibility();

  // 根据路由参数加载照片详情（带最小加载时间与统一 Loader）
  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      if (id) {
        const photoId = parseInt(id, 10);
        if (!isNaN(photoId)) {
          const MIN_LOADING_MS = 900;
          const start = performance.now();
          setDetailLoading(true);

          try {
            // 如果照片已经在列表中，直接选择
            const photo = photos.find(p => p.id === photoId);
            if (photo) {
              if (!cancelled) {
                setSelectedPhoto(photo);
              }
            } else {
              // 如果照片不在当前列表中，通过 API 获取
              const singlePhoto = await fetchPhoto(photoId);
              if (!cancelled) {
                setSelectedPhoto(singlePhoto);
                // 如果照片不在当前列表中，也添加到列表中以便后续使用
                if (!photos.find(p => p.id === photoId)) {
                  setPhotos(prev => [singlePhoto, ...prev]);
                }
              }
            }
          } catch (error) {
            if (!cancelled) {
              console.error('Failed to fetch photo:', error);
              setError('照片加载失败，请稍后重试');
            }
          } finally {
            const elapsed = performance.now() - start;
            const remaining = MIN_LOADING_MS - elapsed;
            const finish = () => {
              if (!cancelled) {
                setDetailLoading(false);
              }
            };
            if (remaining > 0) {
              setTimeout(finish, remaining);
            } else {
              finish();
            }
          }
        }
      } else {
        setSelectedPhoto(null);
        setDetailLoading(false);
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [id, photos]);

  // 监听来自首页的图片选择事件（用于从首页跳转）
  useEffect(() => {
    const handleSelectPhoto = async (event: CustomEvent<{ photoId: number }>) => {
      const photoId = event.detail.photoId;
      navigate(`/gallery/${photoId}`);
    };

    window.addEventListener('gallerySelectPhoto', handleSelectPhoto as EventListener);
    return () => {
      window.removeEventListener('gallerySelectPhoto', handleSelectPhoto as EventListener);
    };
  }, [navigate]);

  useEffect(() => {
    if (!selectedPhoto) {
      setIsFullPreviewOpen(false);
      setExifData(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
      return;
    }

    const photo = selectedPhoto as PhotoWork & { exif?: PhotoExif };
    if (photo.exif && typeof photo.exif === 'object') {
      let shootTime = '';
      if (photo.exif.DateTimeOriginal) {
        shootTime = formatExifDate(photo.exif.DateTimeOriginal);
      } else if (photo.exif.CreateDate) {
        shootTime = formatExifDate(photo.exif.CreateDate);
      }

      setExifData({
        make: pickValue(photo.make) || pickValue(photo.exif.Make),
        model: pickValue(photo.model) || pickValue(photo.exif.Model),
        focalLength: pickValue(photo.focal_length) || pickValue(photo.exif.FocalLength),
        aperture:
          pickValue(photo.aperture) ||
          (photo.exif.FNumber !== undefined && photo.exif.FNumber !== null
            ? `f/${pickValue(photo.exif.FNumber)}`
            : ''),
        shutterSpeed: pickValue(photo.shutter_speed) || pickValue(photo.exif.ExposureTime),
        iso:
          pickValue(photo.iso) ||
          pickValue(photo.exif.ISO) ||
          pickValue(photo.exif.ISOSpeedRatings),
        shootTime,
      });
      return;
    }

    setExifData({
      make: pickValue(photo.make),
      model: pickValue(photo.model),
      focalLength: pickValue(photo.focal_length),
      aperture: pickValue(photo.aperture),
      shutterSpeed: pickValue(photo.shutter_speed),
      iso: pickValue(photo.iso),
      shootTime: pickValue(photo.shoot_time),
    });
  }, [selectedPhoto]);

  // 初始加载
  useEffect(() => {
    setLoading(true);
    setPhotos([]);
    setCurrentPage(0);
    setHasMore(true);
    const MIN_LOADING_MS = 900;
    const start = performance.now();

    fetchPhotos({ skip: 0, limit: PAGE_SIZE })
      .then(data => {
        setPhotos(data);
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load photos', err);
        setError('作品加载失败，请稍后再试');
      })
      .finally(() => {
        const elapsed = performance.now() - start;
        const remaining = MIN_LOADING_MS - elapsed;
        if (remaining > 0) {
          setTimeout(() => setLoading(false), remaining);
        } else {
          setLoading(false);
        }
      });
  }, []);

  // 无限滚动加载 - 添加页面可见性检测
  useEffect(() => {
    if (!hasMore || loading || loadingMore || !isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 只在页面可见时加载
        if (entries[0].isIntersecting && hasMore && !loadingMore && !document.hidden) {
          loadMorePhotos();
        }
      },
      { threshold: 0.1, rootMargin: '200px' } // 提前 200px 开始加载
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, loading, loadingMore, filter, isVisible]);

  const loadMorePhotos = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      const newPhotos = await fetchPhotos({ skip: nextPage * PAGE_SIZE, limit: PAGE_SIZE });
      if (newPhotos.length === 0) {
        setHasMore(false);
      } else {
        setPhotos(prev => [...prev, ...newPhotos]);
        setCurrentPage(nextPage);
        setHasMore(newPhotos.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load more photos', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const categories = useMemo(() => {
    const names = new Set(photos.map(photo => photo.category?.name?.trim() || '未分类'));
    return ['全部', ...Array.from(names)];
  }, [photos]);
  
  const displayPhotos = filter === '全部'
    ? photos 
    : photos.filter(p => (p.category?.name?.trim() || '未分类') === filter);

  const handleZoomChange = (nextZoom: number) => {
    const clamped = Math.max(1, Math.min(4, nextZoom));
    setZoom(clamped);
    if (clamped === 1) {
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleWheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!isFullPreviewOpen) {
      return;
    }
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.15 : 0.15;
    setZoom(prev => {
      const next = Math.max(1, Math.min(4, prev + delta));
      if (next === 1) {
        setOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const mouseMoveRef = useRef<number | null>(null);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom === 1) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    // 使用 requestAnimationFrame 节流，减少状态更新频率
    if (mouseMoveRef.current === null) {
      mouseMoveRef.current = requestAnimationFrame(() => {
        setOffset({
          x: event.clientX - dragStartRef.current.x,
          y: event.clientY - dragStartRef.current.y,
        });
        mouseMoveRef.current = null;
      });
    }
  };

  const stopDragging = () => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    // 清理未完成的动画帧
    if (mouseMoveRef.current !== null) {
      cancelAnimationFrame(mouseMoveRef.current);
      mouseMoveRef.current = null;
    }
  };

  const handleDoubleClick = () => {
    setZoom(prev => {
      const next = prev >= 3 ? 1 : prev + 1;
      if (next === 1) {
        setOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const closePreview = () => {
    setIsFullPreviewOpen(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

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

  if (detailLoading) {
    return <Loader />;
  }

  if (selectedPhoto) {
    const detailImageSrc = selectedPhoto.thumbnail_url || selectedPhoto.image_url;
    const detailAspectRatio = selectedPhoto.width && selectedPhoto.height
      ? `${selectedPhoto.width} / ${selectedPhoto.height}`
      : '16 / 9';

    return (
      <div className="w-full py-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto bg-slate-50 dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 lg:p-10">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            {/* 图片区域 - 左侧（保持在左） */}
            <div className="lg:flex-1 space-y-6 lg:sticky lg:top-24 w-full">
              <div
                className="relative w-full overflow-hidden rounded-2xl bg-black shadow-2xl"
                style={{ aspectRatio: detailAspectRatio }}
              >
                <LazyImage
                  src={detailImageSrc}
                  alt={selectedPhoto.title}
                  className="absolute inset-0"
                  imageClassName="w-full h-full object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFullPreviewOpen(true);
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-80 transition-opacity shadow-lg"
              >
                查看原图
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5h6m0 0v6m0-6L10 14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19l6 0 0-6" />
                </svg>
              </button>
            </div>

            {/* 信息区域 - 右侧 */}
            <div className="lg:w-96 xl:w-[28rem] space-y-6 lg:space-y-8 w-full">
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold tracking-wide text-gray-600 dark:text-gray-300">
                    {selectedPhoto.category?.name || '未分类'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(selectedPhoto.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white break-words leading-tight">
                  {selectedPhoto.title}
                </h2>
              </div>
              
              {selectedPhoto.description && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                    {selectedPhoto.description}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800/70 rounded-2xl p-6 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">
                    拍摄参数
                  </p>
                  {exifData ? (
                    <div className="grid grid-cols-2 gap-4 text-sm font-mono text-gray-700 dark:text-gray-200">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-1">相机</p>
                        <p>{[exifData.make, exifData.model].filter(Boolean).join(' ') || '——'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-1">焦距</p>
                        <p>{exifData.focalLength || '——'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-1">光圈</p>
                        <p>{exifData.aperture || '——'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-1">快门</p>
                        <p>{exifData.shutterSpeed || '——'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-1">ISO</p>
                        <p>{exifData.iso || '——'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-1">时间</p>
                        <p>{exifData.shootTime || '——'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-base text-gray-700 dark:text-gray-200 font-mono">{selectedMeta.exif}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>作品编号：#{selectedPhoto.id}</p>
                  <p className="mt-1">浏览次数：{selectedPhoto.view_count}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isFullPreviewOpen && selectedPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={closePreview}
          >
            <div
              className="relative max-w-5xl w-full max-h-[90vh] bg-gray-950/80 rounded-3xl border border-white/10 overflow-hidden shadow-2xl select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="关闭预览"
                onClick={closePreview}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/60 text-white hover:bg-black/80 w-10 h-10 flex items-center justify-center"
              >
                ✕
              </button>
              <div
                className={`h-[70vh] bg-black overflow-hidden ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                onWheel={handleWheelZoom}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
                onDoubleClick={handleDoubleClick}
              >
                <div className="w-full h-full flex items-center justify-center" style={{ touchAction: 'none' }}>
                  <img
                    src={selectedPhoto.image_url}
                    alt={selectedPhoto.title}
                    draggable={false}
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                      transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div className="p-4 text-sm text-white/80 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>{selectedPhoto.title}</span>
                  <span className="text-white/60">{selectedPhoto.category?.name || '未分类'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/60">
                  <span>滚轮缩放 / 双击切换</span>
                  <span>拖拽移动</span>
                  {zoom > 1 && (
                    <button
                      type="button"
                      onClick={() => handleZoomChange(1)}
                      className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20"
                    >
                      重置
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
        <div>
           <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 dark:text-white mb-2 tracking-tight">光影瞬间</h2>
           <p className="text-gray-500 dark:text-gray-400 text-lg">用镜头捕捉世界的切片</p>
        </div>
        
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                filter === cat
                  ? 'bg-cyber-accent text-white shadow-lg shadow-cyber-accent/30 transform scale-105'
                  : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 炫酷瀑布流布局 */}
      <div className="columns-1 md:columns-2 lg:columns-2 xl:columns-3 gap-4 md:gap-6">
        {displayPhotos.map((photo, index) => {
          const thumbSrc = photo.thumbnail_url || photo.image_url;
          const categoryLabel = photo.category?.name || '未分类';
          const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;
          const shootDate = formatPhotoShootDate(photo);
          
          // 为不同索引的图片设置不同的延迟，创造错落有致的动画效果
          const animationDelay = `${(index % 8) * 0.1}s`;

          return (
            <article 
              key={photo.id} 
              className="photo-card group relative break-inside-avoid mb-4 md:mb-6 rounded-xl md:rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyber-accent/20 animate-fade-in will-change-transform"
              style={{ animationDelay }}
              onClick={() => navigate(`/gallery/${photo.id}`)}
            >
              {/* 图片容器 - 无固定高度，使用自然比例 */}
              <div className="relative w-full overflow-hidden bg-gray-900 rounded-xl md:rounded-2xl">
                <LazyImage
                  src={thumbSrc}
                  alt={photo.title}
                  className="absolute inset-0"
                  imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* 动态渐变遮罩 - 移动端始终显示，桌面端悬停显示 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-all duration-500" />
                
                {/* 扫描线效果 */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scan" />
                </div>
                
                {/* 顶部标签 - 移动端始终显示，桌面端悬停显示 */}
                <div className="absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 flex items-start justify-between gap-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:transform md:translate-y-2 md:group-hover:translate-y-0">
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    <span className="px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] md:text-xs font-semibold border border-white/10">
                      {categoryLabel}
                    </span>
                    <span className="px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-cyber-accent/80 backdrop-blur-md text-white text-[10px] md:text-xs font-semibold">
                      {shootDate}
                    </span>
                  </div>
                </div>
                
                {/* 底部信息 - 移动端始终显示，桌面端悬停显示 */}
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:transform md:translate-y-4 md:group-hover:translate-y-0">
                  <h3 className="text-base md:text-xl font-bold text-white mb-1 md:mb-2 drop-shadow-lg line-clamp-2">
                    {photo.title}
                  </h3>
                  <div className="mt-2 md:mt-3 flex items-center gap-2 text-white/80 text-[10px] md:text-xs">
                    <span className="px-2 py-0.5 md:py-1 rounded bg-white/10 backdrop-blur-sm">
                      查看详情 →
                    </span>
                  </div>
                </div>
                
                {/* 光晕效果 */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyber-accent/20 rounded-full blur-3xl animate-pulse-slow" />
                </div>
              </div>
              
              {/* 悬停时的边框光效 */}
              <div className="absolute inset-0 rounded-2xl border-2 border-cyber-accent/0 group-hover:border-cyber-accent/50 transition-all duration-500 pointer-events-none" />
            </article>
          );
        })}
      </div>

      {/* 无限滚动触发器 */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loadingMore && (
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent" />
          )}
        </div>
      )}

      {!hasMore && displayPhotos.length > 0 && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          已加载全部作品
        </div>
      )}
    </div>
  );
};