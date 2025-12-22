import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { PhotoWork, PhotoExif } from '../types';
import { fetchPhotos, fetchPhoto, fetchPhotoCategories } from '../services/dataService';
import { PhotoCategory } from '../types';
import Loader from '../components/ui/Loader';
import CategoryButton from '../components/ui/CategoryButton';
import { ZoomableImage } from '../components/image/ZoomableImage';
import PuzzleCaptcha from '../components/features/PuzzleCaptcha';
import { showPuzzleCaptcha } from '../components/features/showPuzzleCaptcha';
import { LazyImage } from '../components/image/LazyImage';
import { VoteButtons } from '../components/ui/VoteButtons';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [photos, setPhotos] = useState<PhotoWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('全部');
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWork | null>(null);
  const [exifData, setExifData] = useState<ParsedExifData | null>(null);
  const [showDownloadVerification, setShowDownloadVerification] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<{ url: string; filename: string } | null>(null);

  useEffect(() => {
    if (showDownloadVerification) {
      const t = setTimeout(() => {
        const node = document.querySelector('.captcha-container');
        if (!node) {
          // PuzzleCaptcha DOM not found after 1s
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [showDownloadVerification]);

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
  const handleDownloadRequest = async (url: string, filename: string) => {
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
    setShowDownloadVerification(false);
  };
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 15;
  const selectedMeta = selectedPhoto ? parsePhotoMeta(selectedPhoto.description) : { exif: '——' };
  const hasScrolledToTopRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<number, number>>({});
  const [columnImages, setColumnImages] = useState<PhotoWork[][]>([]);
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  });
  const imageColumnMapRef = useRef<Record<number, number>>({});
  const hasLoadedCategoriesRef = useRef(false);
  const hasLoadedPhotosRef = useRef(false);

  // 组件挂载时滚动到顶部（列表页和详情页都需要）
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  // 响应式列数，保持布局稳定
  useEffect(() => {
    if (id) return; // 详情页不需要列数
    const handleResize = () => {
      const width = window.innerWidth;
      const next =
        width >= 1280 ? 3 :
          width >= 768 ? 2 : 1;
      setColumnCount((prev) => (prev === next ? prev : next));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  // 根据路由参数加载照片详情
  const lastFetchedPhotoIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (id) {
      const photoId = parseInt(id, 10);
      if (!isNaN(photoId)) {
        // 如果已经为这个照片 ID 获取过详情，避免重复请求
        const photo = photos.find(p => p.id === photoId);
        if (photo && lastFetchedPhotoIdRef.current === photoId) {
          // 已经获取过，直接使用
          setSelectedPhoto(photo);
          setLoading(false);
        } else {
          // 需要调用 API 获取最新数据（包括更新的浏览次数）
          if (photos.length === 0) {
            setLoading(true);
          }
          lastFetchedPhotoIdRef.current = photoId;
          fetchPhoto(photoId)
            .then(singlePhoto => {
              setSelectedPhoto(singlePhoto);
              setLoading(false);
              // 更新列表中的数据，以便显示最新的浏览次数
              setPhotos(prev => {
                const existing = prev.find(p => p.id === photoId);
                if (existing) {
                  return prev.map(p => p.id === photoId ? singlePhoto : p);
                } else {
                  return [singlePhoto, ...prev];
                }
              });
            })
            .catch(error => {
              console.error('Failed to fetch photo:', error);
              setError('照片加载失败，请稍后重试');
              setLoading(false);
              // 如果获取失败，仍然使用列表中的数据
              if (photo) {
                setSelectedPhoto(photo);
              }
            });
        }
      }
    } else {
      setSelectedPhoto(null);
      lastFetchedPhotoIdRef.current = null;
    }
  }, [id, photos]);

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

  useEffect(() => {
    if (!selectedPhoto) {
      setExifData(null);
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

  // 加载分类列表
  useEffect(() => {
    // 如果已经加载过，直接返回（防止 StrictMode 导致的重复请求）
    if (hasLoadedCategoriesRef.current) {
      return;
    }
    hasLoadedCategoriesRef.current = true;

    fetchPhotoCategories()
      .then(data => {
        setCategories(data);
      })
      .catch(err => {
        console.error('Failed to load categories', err);
        // 请求失败时重置标志，允许重试
        hasLoadedCategoriesRef.current = false;
      });
  }, []);

  // 加载照片数据（支持追加），不分页跳转，类似 AI 图库的加载更多体验
  const loadPhotos = async (page: number, categoryFilter?: string, append = false) => {
    setError(null);
    const MIN_LOADING_MS = 500;
    const start = performance.now();
    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      // 重置列映射，确保切换分类时布局从顶部开始
      imageColumnMapRef.current = {};
    }

    try {
      // 根据筛选条件确定 category_id
      let categoryId: number | undefined;
      if (categoryFilter && categoryFilter !== '全部') {
        const category = categories.find(cat => cat.name === categoryFilter);
        if (category) {
          categoryId = category.id;
        }
      }

      const response = await fetchPhotos({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        category_id: categoryId
      });

      setPhotos((prev) => {
        if (!append || page === 0) return response.data;
        const existingIds = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...response.data.filter((p) => !existingIds.has(p.id))];
        return merged;
      });
      setHasMore((page + 1) * PAGE_SIZE < response.total && response.data.length > 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to load photos', err);
      setError('作品加载失败，请稍后再试');
      if (!append) {
        setPhotos([]);
        setHasMore(false);
      }
    } finally {
      const elapsed = performance.now() - start;
      const remaining = MIN_LOADING_MS - elapsed;
      const finish = () => {
        setLoading(false);
        setIsLoadingMore(false);
      };
      if (remaining > 0) {
        setTimeout(finish, remaining);
      } else {
        finish();
      }
    }
  };

  // 同步 URL category 参数到筛选状态
  useEffect(() => {
    const categoryParam = searchParams.get('category') || '全部';
    setFilter((prev) => (prev === categoryParam ? prev : categoryParam));
  }, [searchParams]);

  // 根据筛选加载列表（不分页，使用加载更多）
  useEffect(() => {
    // 如果筛选需要分类但分类还没加载，等待分类加载完成
    if (filter !== '全部' && categories.length === 0) return;

    // 防止 StrictMode 或重复的 useEffect 调用导致重复请求
    // 使用 filter 作为 key，只有在 filter 真正变化时才重新加载
    // 注意：不要把 categories.length 放入 loadKey，因为初始加载时 categories 从 0 变化会触发重复请求
    const loadKey = filter;
    const lastLoadKey = hasLoadedPhotosRef.current as any;

    if (lastLoadKey === loadKey) {
      return;
    }

    hasLoadedPhotosRef.current = loadKey as any;
    loadPhotos(0, filter);
  }, [filter, categories]);

  // 将照片分配到固定列，加载更多时不重排已加载项目
  useEffect(() => {
    if (!photos.length) {
      setColumnImages(Array.from({ length: columnCount }, () => []));
      imageColumnMapRef.current = {};
      return;
    }

    const columns = Array.from({ length: columnCount }, () => [] as PhotoWork[]);
    const heights = Array(columnCount).fill(0);
    const estimateHeight = (photo: PhotoWork) => {
      const ratio =
        imageAspectRatios[photo.id] ||
        (photo.width && photo.height ? photo.width / photo.height : undefined);
      if (ratio && ratio > 0) {
        return 1 / ratio; // 横图占比矮，竖图高
      }
      return 1;
    };

    for (const photo of photos) {
      let targetColumn = imageColumnMapRef.current[photo.id];
      if (targetColumn === undefined || targetColumn >= columnCount) {
        let minHeight = heights[0];
        targetColumn = 0;
        for (let i = 1; i < columnCount; i++) {
          if (heights[i] < minHeight) {
            minHeight = heights[i];
            targetColumn = i;
          }
        }
        imageColumnMapRef.current[photo.id] = targetColumn;
      }

      const estimatedHeight = estimateHeight(photo);
      heights[targetColumn] += estimatedHeight;
      columns[targetColumn].push(photo);
    }

    setColumnImages(columns);
  }, [photos, imageAspectRatios, columnCount]);

  // 构建分类按钮列表
  const categoryOptions = useMemo(() => {
    return ['全部', ...categories.map(cat => cat.name)];
  }, [categories]);

  // 直接使用加载的照片，因为已经在后端筛选过了
  const displayPhotos = photos;

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



  // 如果是详情页，显示详情视图或加载状态
  if (id) {
    if (loading || !selectedPhoto) {
      return <Loader />;
    }

    if (error) {
      return (
        <div className="max-w-2xl mx-auto p-10 text-center text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-2xl">
          {error}
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* 图片展示区域 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700">
              <div className="relative w-full" style={{ height: 'calc(100vh - 240px)', minHeight: '600px', maxHeight: '85vh' }}>
                <ZoomableImage
                  src={selectedPhoto.thumbnail_url || selectedPhoto.image_url}
                  alt={selectedPhoto.title}
                />
              </div>
            </div>
          </div>

          {/* 照片信息 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 lg:sticky lg:top-24">
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedPhoto.title}</h1>

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
                    handleDownloadRequest(selectedPhoto.image_url, filename);
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
                    {exifData ? (
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">相机</p>
                          <p>{[exifData.make, exifData.model].filter(Boolean).join(' ') || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">焦距</p>
                          <p>{exifData.focalLength || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">光圈</p>
                          <p>{exifData.aperture || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">快门</p>
                          <p>{exifData.shutterSpeed || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">ISO</p>
                          <p>{exifData.iso || '——'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">时间</p>
                          <p>{exifData.shootTime || '——'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                        {selectedPhoto.description ? parsePhotoMeta(selectedPhoto.description).exif : '——'}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-slate-700">
                    <p>作品编号：#{selectedPhoto.id}</p>
                    <p className="mt-1">浏览次数：{selectedPhoto.view_count || 0}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
                <VoteButtons contentType="photo" contentId={selectedPhoto.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 列表视图
  if (loading && photos.length === 0) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-10 text-center text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-2xl">
        {error}
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 mb-2 tracking-tight">光影瞬间</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">用镜头捕捉世界的切片</p>
        </div>

        <div className="flex gap-3 overflow-x-auto w-full md:w-auto scrollbar-hide">
          {categoryOptions.map(cat => (
            <CategoryButton
              key={cat}
              label={cat}
              active={filter === cat}
              onClick={() => {
                setFilter(cat);
                // 更新URL参数
                const params = new URLSearchParams(searchParams);
                params.set('category', cat);
                setSearchParams(params);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      </div>

      {/* 炫酷瀑布流布局（固定列，追加不打乱已加载项） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {columnImages.map((column, columnIndex) => (
          <div key={columnIndex} className="flex flex-col space-y-8 md:space-y-10">
            {column.map((photo) => {
              const thumbSrc = photo.thumbnail_url || photo.image_url;
              const categoryLabel = photo.category?.name || '未分类';
              const aspectRatio = photo.width && photo.height ? photo.width / photo.height : 4 / 3;
              const shootDate = formatPhotoShootDate(photo);

              return (
                <article
                  key={photo.id}
                  className="photo-card group relative break-inside-avoid rounded-xl md:rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
                  style={{
                    transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                    boxShadow: '0 10px 22px rgba(0,0,0,0.22), 0 0 12px rgba(255,255,255,0.12)',
                    background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 35%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                    border: '1px solid rgba(255,255,255,0.35)',
                    willChange: 'transform',
                  }}
                  onMouseMove={handlePhotoCardMove}
                  onMouseLeave={handlePhotoCardLeave}
                  onClick={() => {
                    navigate(`/gallery/${photo.id}`);
                  }}
                >
                  {/* 图片容器 - 保持原始比例 */}
                  <LazyImage
                    src={thumbSrc}
                    alt={photo.title}
                    imageId={photo.id}
                    autoAspectRatio={true}
                    defaultAspectRatio={aspectRatio || 4 / 3}
                    placeholderType="pulse"
                    imageClassName="w-full h-full object-contain"
                    className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-xl md:rounded-2xl"
                    onAspectRatioChange={(ratio) => {
                      setImageAspectRatios((prev) => ({ ...prev, [photo.id]: ratio }));
                    }}
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
                        <span
                          className="px-3 md:px-3.5 py-1.5 rounded-full bg-black/72 border border-white/45 text-white text-xs md:text-sm font-semibold shadow-[0_0_12px_rgba(0,0,0,0.3)] flex items-center gap-1"
                          style={{ boxShadow: '0 0 18px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.22)' }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                          {photo.like_count || 0}
                        </span>
                        <span
                          className="px-3 md:px-3.5 py-1.5 rounded-full bg-black/72 border border-white/45 text-white text-xs md:text-sm font-semibold shadow-[0_0_12px_rgba(0,0,0,0.3)] flex items-center gap-1"
                          style={{ boxShadow: '0 0 18px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.22)' }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                          {photo.dislike_count || 0}
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
                </article>
              );
            })}
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {displayPhotos.length > 0 && (
        <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
          {hasMore ? (
            <button
              onClick={() => loadPhotos(currentPage + 1, filter, true)}
              disabled={isLoadingMore || loading}
              className="px-5 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoadingMore ? '加载中...' : '加载更多'}
            </button>
          ) : (
            <span>已加载全部</span>
          )}
        </div>
      )}

      {displayPhotos.length === 0 && !loading && (
        <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
          暂无作品
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
    </div>
  );
};