import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PhotoWork, PhotoExif } from '../types';
import { fetchPhotos } from '../services/dataService';
import { LazyImage } from './LazyImage';

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
    return { location: '未标注地点', exif: '——' };
  }

  const [first, second] = description.split('|').map(part => part.trim());
  return {
    location: first || '未标注地点',
    exif: second || '——',
  };
};

const formatExifDate = (value?: string | null) => {
  if (!value) return '';
  const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
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

export const GalleryView: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoWork[]>([]);
  const [loading, setLoading] = useState(true);
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
  const selectedMeta = selectedPhoto ? parsePhotoMeta(selectedPhoto.description) : null;

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
      .finally(() => setLoading(false));
  }, []);

  // 无限滚动加载
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePhotos();
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
  }, [hasMore, loading, loadingMore, filter]);

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
    setOffset({
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    });
  };

  const stopDragging = () => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
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
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent" />
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

  if (selectedPhoto && selectedMeta) {
    const detailImageSrc = selectedPhoto.thumbnail_url || selectedPhoto.image_url;
    const detailAspectRatio = selectedPhoto.width && selectedPhoto.height
      ? `${selectedPhoto.width} / ${selectedPhoto.height}`
      : '16 / 9';

    return (
      <div className="max-w-7xl mx-auto py-12 px-4 md:px-6 space-y-8">
        <button
          onClick={() => setSelectedPhoto(null)}
          className="inline-flex items-center text-sm font-semibold text-primary-600 dark:text-primary-300 hover:text-primary-400 transition-colors"
        >
          ← 返回摄影集
        </button>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden p-6 lg:p-10">
          <div className="grid gap-8 lg:gap-12 lg:grid-cols-[3fr,2fr] items-start">
            <div className="space-y-6">
              <div
                className="relative w-full overflow-hidden rounded-2xl bg-black"
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
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-80 transition-opacity"
              >
                查看原图
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5h6m0 0v6m0-6L10 14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19l6 0 0-6" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold tracking-wide text-gray-600 dark:text-gray-300 w-fit">
                  {selectedPhoto.category?.name || '未分类'}
                </span>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white break-words">{selectedPhoto.title}</h2>
                <p className="text-gray-500 dark:text-gray-300 text-sm">
                  {new Date(selectedPhoto.created_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                {selectedPhoto.description || '这张作品还没有故事，敬请期待。'}
              </p>

              <div className="bg-gray-50 dark:bg-gray-800/70 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">
                    拍摄地点
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedMeta.location}</p>
                </div>
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
    <div className="max-w-7xl mx-auto py-12 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
           <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">光影瞬间</h2>
           <p className="text-gray-500 dark:text-gray-400">用镜头捕捉世界的切片</p>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                filter === cat
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg transform scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayPhotos.map(photo => {
          const meta = parsePhotoMeta(photo.description);
          const thumbSrc = photo.thumbnail_url || photo.image_url;
          const categoryLabel = photo.category?.name || '未分类';
          const aspectRatio = photo.width && photo.height ? `${photo.width} / ${photo.height}` : '4 / 3';

          return (
            <article 
              key={photo.id}
              className="group bg-white/70 dark:bg-gray-900/40 border border-gray-100/60 dark:border-gray-800 rounded-3xl shadow-sm hover:shadow-2xl transition-shadow duration-500 overflow-hidden flex flex-col cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div
                className="relative w-full overflow-hidden rounded-t-3xl bg-gray-900"
                style={{ aspectRatio }}
              >
                <LazyImage
                  src={thumbSrc}
                  alt={photo.title}
                  className="absolute inset-0"
                  imageClassName="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-3xl pointer-events-none" />
                <div className="absolute top-4 left-4 flex items-center gap-2 text-xs font-semibold text-white/80">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur">
                    {categoryLabel}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur">
                    {new Date(photo.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <span className="absolute bottom-4 right-4 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  查看详情 →
                </span>
              </div>

              <div className="p-6 flex flex-col gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{photo.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {meta.location}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {photo.description || '点击查看作品故事'}
                </p>
              </div>
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