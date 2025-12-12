import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PhotoWork, PhotoExif } from '../types';
import { fetchPhotos, fetchPhoto } from '../services/dataService';
import Loader from './Loader';
import CategoryButton from './CategoryButton';

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
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('全部');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWork | null>(null);
  const [exifData, setExifData] = useState<ParsedExifData | null>(null);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 15;
  const selectedMeta = selectedPhoto ? parsePhotoMeta(selectedPhoto.description) : { exif: '——' };
  // 使用 useRef 防止组件意外重新挂载导致的重复请求
  const hasLoadedRef = useRef(false);

  // 根据路由参数加载照片详情
  useEffect(() => {
    if (id) {
      const photoId = parseInt(id, 10);
      if (!isNaN(photoId)) {
        // 如果照片已经在列表中，直接选择
        const photo = photos.find(p => p.id === photoId);
        if (photo) {
          setSelectedPhoto(photo);
        } else {
          // 如果照片不在当前列表中，通过 API 获取
          fetchPhoto(photoId)
            .then(singlePhoto => {
              setSelectedPhoto(singlePhoto);
              // 如果照片不在当前列表中，也添加到列表中以便后续使用
              if (!photos.find(p => p.id === photoId)) {
                setPhotos(prev => [singlePhoto, ...prev]);
              }
            })
            .catch(error => {
              console.error('Failed to fetch photo:', error);
              setError('照片加载失败，请稍后重试');
            });
        }
      }
    } else {
      setSelectedPhoto(null);
    }
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

  // 加载照片数据
  const loadPhotos = async (page: number) => {
    setLoading(true);
    setError(null);
    const MIN_LOADING_MS = 900;
    const start = performance.now();

    try {
      const response = await fetchPhotos({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
      setPhotos(response.data);
      setTotalCount(response.total);
      setHasMore((page + 1) * PAGE_SIZE < response.total);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to load photos', err);
      setError('作品加载失败，请稍后再试');
      setPhotos([]);
      setHasMore(false);
      setTotalCount(0);
      // 如果是初始加载失败，重置标志允许重试
      if (page === 0) {
        hasLoadedRef.current = false;
      }
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
    // 如果已经加载过，直接返回（防止 StrictMode 或组件重新挂载导致的重复请求）
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;
    loadPhotos(0);
  }, []);

  // 处理分页
  const handlePreviousPage = () => {
    if (currentPage > 0) {
      loadPhotos(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      loadPhotos(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // 3D 玻璃卡片悬停效果（摄影列表）- 仅桌面，使用 rAF 降低卡顿
  const tiltRafRef = useRef<number | null>(null);
  const handlePhotoCardMove = (event: React.MouseEvent<HTMLElement>) => {
    if (window.innerWidth < 900) return; // 移动端不做倾斜
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 28;  // 增大左右倾斜幅度
    const rotateX = -((y / rect.height) - 0.5) * 20; // 增大上下倾斜幅度
    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    tiltRafRef.current = requestAnimationFrame(() => {
      card.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.08, 1.08, 1.08)`;
      card.style.transition = 'transform 180ms ease-out, box-shadow 220ms ease';
      card.style.boxShadow = '0 16px 32px rgba(0,0,0,0.32), 0 0 18px rgba(255,255,255,0.18)';
    });
  };

  const handlePhotoCardLeave = (event: React.MouseEvent<HTMLElement>) => {
    const card = event.currentTarget;
    if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current);
    card.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    card.style.transition = 'transform 220ms ease-out, box-shadow 260ms ease';
    card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.24), 0 0 14px rgba(255,255,255,0.12)';
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
            <div className="lg:flex-1 space-y-6 lg:sticky lg:top-24 w-full max-w-full">
              <div
                className="relative w-full overflow-hidden rounded-2xl bg-black shadow-2xl flex items-center justify-center"
                style={{ 
                  minHeight: '300px',
                  maxHeight: 'calc(100vh - 200px)',
                  maxWidth: '100%',
                  padding: '1rem'
                }}
              >
                <img
                  src={detailImageSrc}
                  alt={selectedPhoto.title}
                  className="object-contain"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 250px)',
                    width: 'auto',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain',
                    opacity: 1
                  }}
                  decoding="async"
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
        
        <div className="flex gap-3 overflow-x-auto w-full md:w-auto scrollbar-hide">
          {categories.map(cat => (
            <CategoryButton
              key={cat}
              label={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
            />
          ))}
        </div>
      </div>

      {/* 炫酷瀑布流布局 */}
      <div className="columns-1 md:columns-2 lg:columns-2 xl:columns-3 gap-6 md:gap-8">
        {displayPhotos.map((photo, index) => {
          const thumbSrc = photo.thumbnail_url || photo.image_url;
          const categoryLabel = photo.category?.name || '未分类';
          const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;
          const shootDate = formatPhotoShootDate(photo);
          
          return (
            <article 
              key={photo.id} 
              className="photo-card group relative break-inside-avoid mb-6 md:mb-8 rounded-xl md:rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
              style={{ 
                transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                boxShadow: '0 10px 22px rgba(0,0,0,0.22), 0 0 12px rgba(255,255,255,0.12)',
                background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 35%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.35)',
                willChange: 'transform',
              }}
              onMouseMove={handlePhotoCardMove}
              onMouseLeave={handlePhotoCardLeave}
              onClick={() => navigate(`/gallery/${photo.id}`)}
            >
              {/* 图片容器 - 无固定高度，使用自然比例 */}
              <div className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-xl md:rounded-2xl">
                <img
                  src={thumbSrc}
                  alt={photo.title}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  style={{ display: 'block', opacity: 1 }}
                  decoding="async"
                />
                
                {/* 悬停信息层 - 不遮挡全图，标题/时间上方，其他下方 */}
                <div className="absolute inset-0 pointer-events-none flex">
                  <div
                    className="relative flex flex-col justify-between w-full h-full px-3 py-3 md:px-4 md:py-4 opacity-0 group-hover:opacity-100"
                    style={{ transition: 'opacity 260ms ease-out' }}
                  >
                    {/* 顶部一行：标题 + 时间 */}
                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                      {[photo.title, shootDate].map((text, idx) => (
                        <span
                          key={`top-${idx}`}
                          className="px-3 md:px-3.5 py-1.5 rounded-full bg-black/72 border border-white/45 text-white text-xs md:text-sm font-semibold shadow-[0_0_12px_rgba(0,0,0,0.3)]"
                          style={{ boxShadow: '0 0 18px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.22)' }}
                        >
                          {text}
                        </span>
                      ))}
                      <span
                        className="px-3 md:px-3.5 py-1.5 rounded-full bg-black/72 border border-white/45 text-white text-xs md:text-sm font-semibold shadow-[0_0_12px_rgba(0,0,0,0.3)] flex items-center gap-1"
                        style={{ boxShadow: '0 0 18px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.22)' }}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {photo.view_count || 0}
                      </span>
                    </div>

                    {/* 底部一行：标签 + CTA */}
                    <div className="flex items-center gap-2.5 md:gap-3 flex-wrap">
                      <span
                        className="px-3 md:px-3.5 py-1.5 rounded-full bg-black/72 text-white border border-white/45 text-xs md:text-sm font-semibold shadow-[0_0_12px_rgba(0,0,0,0.3)]"
                        style={{ boxShadow: '0 0 18px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.22)' }}
                      >
                        {categoryLabel}
                      </span>
                      <span
                        className="px-4.5 md:px-5 py-1.5 md:py-2 rounded-full bg-black/82 text-white text-xs md:text-sm font-semibold tracking-wide inline-flex items-center gap-2 border border-white/45 shadow-[0_8px_20px_rgba(0,0,0,0.32)]"
                        style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.22)' }}
                      >
                        前往 →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* 分页控件 */}
      {displayPhotos.length > 0 && (
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
            第 {currentPage + 1} 页 / 共 {Math.ceil(totalCount / PAGE_SIZE)} 页
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

      {displayPhotos.length === 0 && !loading && (
        <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
          暂无作品
        </div>
      )}
    </div>
  );
};