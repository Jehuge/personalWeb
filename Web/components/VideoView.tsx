import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Video, VideoCategory } from '../types';
import { fetchVideos, fetchVideo, fetchVideoCategories } from '../services/dataService';
import Loader from './Loader';
import CategoryButton from './CategoryButton';

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const VideoView: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('全部');
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'thumbnail' | '480p' | '720p' | 'original'>('720p');
  const PAGE_SIZE = 15;
  const hasScrolledToTopRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const lastFetchedVideoIdRef = useRef<number | null>(null);
  const [videoLoadedMap, setVideoLoadedMap] = useState<Record<number, boolean>>({});
  const [coverLoadedMap, setCoverLoadedMap] = useState<Record<number, boolean>>({});
  const [videoProgressMap, setVideoProgressMap] = useState<Record<number, number>>({});
  const [hoveredVideoId, setHoveredVideoId] = useState<number | null>(null);
  const [videoSrcMap, setVideoSrcMap] = useState<Record<number, string | null>>({});
  const hoverTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});
  const [columnVideos, setColumnVideos] = useState<Video[][]>([]);
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  });
  const videoColumnMapRef = useRef<Record<number, number>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasLoadedCategoriesRef = useRef(false);
  const hasLoadedVideosRef = useRef(false);

  // 组件挂载时滚动到顶部（只执行一次，且只在列表页时）
  useEffect(() => {
    if (!id && !hasScrolledToTopRef.current) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      hasScrolledToTopRef.current = true;
    }
  }, [id]);

  // 响应式列数
  useEffect(() => {
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
  }, []);

  // 根据路由参数加载视频详情
  useEffect(() => {
    if (id) {
      const videoId = parseInt(id, 10);
      if (!isNaN(videoId)) {
        // 如果已经为这个视频 ID 获取过详情，避免重复请求
        const video = videos.find(v => v.id === videoId);
        if (video && lastFetchedVideoIdRef.current === videoId) {
          // 已经获取过，直接使用
          setSelectedVideo(video);
          setLoading(false);
        } else {
          // 需要调用 API 获取最新数据（包括更新的浏览次数）
          if (videos.length === 0) {
            setLoading(true);
          }
          lastFetchedVideoIdRef.current = videoId;
          fetchVideo(videoId)
            .then(singleVideo => {
              setSelectedVideo(singleVideo);
              setLoading(false);
              // 更新列表中的数据，以便显示最新的浏览次数
              setVideos(prev => {
                const existing = prev.find(v => v.id === videoId);
                if (existing) {
                  return prev.map(v => v.id === videoId ? singleVideo : v);
                } else {
                  return [singleVideo, ...prev];
                }
              });
            })
            .catch(error => {
              console.error('Failed to fetch video:', error);
              setError('视频加载失败，请稍后重试');
              setLoading(false);
              // 如果获取失败，仍然使用列表中的数据
              if (video) {
                setSelectedVideo(video);
              }
            });
        }
      }
    } else {
      setSelectedVideo(null);
      lastFetchedVideoIdRef.current = null;
    }
  }, [id, videos]);

  // 当切换视频质量时，更新视频源
  useEffect(() => {
    if (videoRef.current && selectedVideo) {
      const currentTime = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;
      
      let newSrc = '';
      if (videoQuality === 'thumbnail' && selectedVideo.thumbnail_video_url) {
        newSrc = selectedVideo.thumbnail_video_url;
      } else if (videoQuality === '480p' && selectedVideo.video_url_480p) {
        newSrc = selectedVideo.video_url_480p;
      } else if (videoQuality === '720p' && selectedVideo.video_url_720p) {
        newSrc = selectedVideo.video_url_720p;
      } else {
        newSrc = selectedVideo.video_url;  // 原画
      }
      
      if (videoRef.current.src !== newSrc) {
        videoRef.current.src = newSrc;
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) {
          videoRef.current.play().catch(() => {});
        }
      }
    }
  }, [videoQuality, selectedVideo]);

  // 监听悬停状态，确保视频在悬停时播放（使用 ref 避免依赖对象导致无限循环）
  const hoveredVideoIdRef = useRef<number | null>(null);
  const videoSrcMapRef = useRef<Record<number, string | null>>({});
  const videoLoadedMapRef = useRef<Record<number, boolean>>({});
  
  useEffect(() => {
    hoveredVideoIdRef.current = hoveredVideoId;
  }, [hoveredVideoId]);
  
  useEffect(() => {
    videoSrcMapRef.current = videoSrcMap;
  }, [videoSrcMap]);
  
  useEffect(() => {
    videoLoadedMapRef.current = videoLoadedMap;
  }, [videoLoadedMap]);
  
  // 监听悬停状态变化，播放已加载的视频
  useEffect(() => {
    if (hoveredVideoId !== null) {
      const videoId = hoveredVideoId;
      const videoEl = videoRefsMap.current[videoId];
      if (videoEl && videoSrcMap[videoId] && videoLoadedMap[videoId]) {
        // 如果视频已经加载且处于暂停状态，则播放
        if (videoEl.paused && videoEl.readyState >= 2) {
          videoEl.play().catch(() => {});
        }
      }
    }
  }, [hoveredVideoId]); // 只依赖 hoveredVideoId，避免无限循环

  // 加载分类列表
  useEffect(() => {
    // 如果已经加载过，直接返回（防止 StrictMode 导致的重复请求）
    if (hasLoadedCategoriesRef.current) {
      return;
    }
    hasLoadedCategoriesRef.current = true;

    fetchVideoCategories()
      .then(data => {
        setCategories(data);
      })
      .catch(err => {
        console.error('Failed to load categories', err);
        // 请求失败时重置标志，允许重试
        hasLoadedCategoriesRef.current = false;
      });
  }, []);

  // 加载视频数据
  const loadVideos = async (page: number, categoryFilter?: string, append = false) => {
    setError(null);
    const MIN_LOADING_MS = 500;
    const start = performance.now();
    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      videoColumnMapRef.current = {};
    }

    try {
      let categoryId: number | undefined;
      if (categoryFilter && categoryFilter !== '全部') {
        const category = categories.find(cat => cat.name === categoryFilter);
        if (category) {
          categoryId = category.id;
        }
      }

      const response = await fetchVideos({ 
        skip: page * PAGE_SIZE, 
        limit: PAGE_SIZE,
        category_id: categoryId
      });

      setVideos((prev) => {
        if (!append || page === 0) return response.data;
        const existingIds = new Set(prev.map((v) => v.id));
        const merged = [...prev, ...response.data.filter((v) => !existingIds.has(v.id))];
        return merged;
      });
      setHasMore((page + 1) * PAGE_SIZE < response.total && response.data.length > 0);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to load videos', err);
      setError('视频加载失败，请稍后再试');
      if (!append) {
        setVideos([]);
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

  // 根据筛选加载列表
  useEffect(() => {
    if (id) {
      // 详情页不处理列表加载
      hasLoadedVideosRef.current = false;
      return;
    }
    // 如果筛选需要分类但分类还没加载，等待分类加载完成
    if (filter !== '全部' && categories.length === 0) return;

    // 防止 StrictMode 或重复的 useEffect 调用导致重复请求
    // 使用 filter 作为 key，只有在 filter 真正变化时才重新加载
    // 注意：不要把 categories.length 放入 loadKey，因为初始加载时 categories 从 0 变化会触发重复请求
    const loadKey = filter;
    const lastLoadKey = hasLoadedVideosRef.current as any;
    
    if (lastLoadKey === loadKey) {
      return;
    }
    
    hasLoadedVideosRef.current = loadKey as any;
    loadVideos(0, filter);
  }, [filter, categories, id]);

  // 将视频分配到固定列
  useEffect(() => {
    if (!videos.length) {
      setColumnVideos(Array.from({ length: columnCount }, () => []));
      videoColumnMapRef.current = {};
      return;
    }

    const columns = Array.from({ length: columnCount }, () => [] as Video[]);
    const heights = Array(columnCount).fill(0);
    const estimateHeight = (video: Video) => {
      const ratio = video.width && video.height ? video.width / video.height : 16 / 9;
      return 1 / ratio;
    };

    for (const video of videos) {
      let targetColumn = videoColumnMapRef.current[video.id];
      if (targetColumn === undefined || targetColumn >= columnCount) {
        let minHeight = heights[0];
        targetColumn = 0;
        for (let i = 1; i < columnCount; i++) {
          if (heights[i] < minHeight) {
            minHeight = heights[i];
            targetColumn = i;
          }
        }
        videoColumnMapRef.current[video.id] = targetColumn;
      }

      const estimatedHeight = estimateHeight(video);
      heights[targetColumn] += estimatedHeight;
      columns[targetColumn].push(video);
    }

    setColumnVideos(columns);
  }, [videos, columnCount]);

  // 构建分类按钮列表
  const categoryOptions = useMemo(() => {
    return ['全部', ...categories.map(cat => cat.name)];
  }, [categories]);

  const displayVideos = videos;

  // 视频悬停自动播放的 ref 映射
  const videoRefsMap = useRef<Record<number, HTMLVideoElement | null>>({});

  // 如果是详情页，显示详情视图或加载状态
  if (id) {
    if (loading || !selectedVideo) {
      return <Loader />;
    }
    // 根据选择的画质获取对应的视频URL
    const getVideoUrl = () => {
      if (videoQuality === 'thumbnail' && selectedVideo.thumbnail_video_url) {
        return selectedVideo.thumbnail_video_url;
      } else if (videoQuality === '480p' && selectedVideo.video_url_480p) {
        return selectedVideo.video_url_480p;
      } else if (videoQuality === '720p' && selectedVideo.video_url_720p) {
        return selectedVideo.video_url_720p;
      }
      return selectedVideo.video_url;  // 原画
    };
    const currentVideoUrl = getVideoUrl();

    return (
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 视频播放器 */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                src={currentVideoUrl}
                controls
                className="w-full h-auto"
                style={{ maxHeight: '80vh' }}
              />
            </div>

            {/* 分辨率选择 */}
            <div className="mt-4 flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <label htmlFor="video-quality-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                画质：
              </label>
              <div className="flex-1 relative">
                <select
                  id="video-quality-select"
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value as 'thumbnail' | '480p' | '720p' | 'original')}
                  className="w-full px-4 py-2 pr-10 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  {selectedVideo.thumbnail_video_url && (
                    <option value="thumbnail">
                      缩略{selectedVideo.thumbnail_file_size ? ` (${formatFileSize(selectedVideo.thumbnail_file_size)})` : ''}
                    </option>
                  )}
                  {selectedVideo.video_url_480p && (
                    <option value="480p">
                      标清{selectedVideo.video_url_480p_size ? ` (${formatFileSize(selectedVideo.video_url_480p_size)})` : ''}
                    </option>
                  )}
                  {selectedVideo.video_url_720p && (
                    <option value="720p">
                      高清{selectedVideo.video_url_720p_size ? ` (${formatFileSize(selectedVideo.video_url_720p_size)})` : ''}
                    </option>
                  )}
                  <option value="original">
                    原画{selectedVideo.width && selectedVideo.height ? ` (${selectedVideo.width}×${selectedVideo.height})` : ''}{selectedVideo.file_size ? ` - ${formatFileSize(selectedVideo.file_size)}` : ''}
                  </option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 8l4 4 4-4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 视频信息 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-slate-700">
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {selectedVideo.category?.name || '未分类'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(selectedVideo.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedVideo.title}</h1>
                
                {selectedVideo.description && (
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {selectedVideo.description}
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                      视频信息
                    </label>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                      {selectedVideo.duration && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">时长</p>
                          <p>{formatDuration(selectedVideo.duration)}</p>
                        </div>
                      )}
                      {selectedVideo.width && selectedVideo.height && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">分辨率</p>
                          <p>{selectedVideo.width} × {selectedVideo.height}</p>
                        </div>
                      )}
                      {selectedVideo.format && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">格式</p>
                          <p>{selectedVideo.format}</p>
                        </div>
                      )}
                      {selectedVideo.codec && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">编码</p>
                          <p>{selectedVideo.codec}</p>
                        </div>
                      )}
                      {selectedVideo.fps && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">帧率</p>
                          <p>{selectedVideo.fps} fps</p>
                        </div>
                      )}
                      {selectedVideo.file_size && (
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">文件大小</p>
                          <p>{formatFileSize(selectedVideo.file_size)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-slate-700">
                    <p>作品编号：#{selectedVideo.id}</p>
                    <p className="mt-1">浏览次数：{selectedVideo.view_count || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 列表视图
  if (loading && videos.length === 0) {
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
          <h2 className="text-4xl md:text-5xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 mb-2 tracking-tight">视频作品</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">用镜头记录生活的精彩</p>
        </div>
        
        <div className="flex gap-3 overflow-x-auto w-full md:w-auto scrollbar-hide">
          {categoryOptions.map(cat => (
            <CategoryButton
              key={cat}
              label={cat}
              active={filter === cat}
              onClick={() => {
                setFilter(cat);
                const params = new URLSearchParams(searchParams);
                params.set('category', cat);
                setSearchParams(params);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      </div>

      {/* 瀑布流布局 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
        {columnVideos.map((column, columnIndex) => (
          <div key={columnIndex} className="flex flex-col space-y-8 md:space-y-10">
            {column.map((video) => {
              const thumbnailUrl = video.thumbnail_video_url || video.video_url;
              const coverImageUrl = video.cover_image;
              const categoryLabel = video.category?.name || '未分类';
              const aspectRatio = video.width && video.height ? video.width / video.height : 16 / 9;
              const isHovered = hoveredVideoId === video.id;
              
              const formatVideoDate = (dateStr: string) => {
                return new Date(dateStr).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                });
              };

              return (
                <article 
                  key={video.id} 
                  className="video-card group relative break-inside-avoid rounded-xl md:rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-xl"
                  onMouseEnter={() => {
                    // 仅在具备 hover 能力（桌面端）时启用悬停预览，避免移动端出现“缩略图一直播放”的问题
                    if (typeof window !== 'undefined') {
                      const supportsHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
                      if (!supportsHover) {
                        return;
                      }
                    }
                    setHoveredVideoId(video.id);
                    // 延迟500ms后再加载预览视频
                    if (thumbnailUrl && !videoSrcMap[video.id]) {
                      hoverTimeoutRef.current[video.id] = setTimeout(() => {
                        // 设置视频源，触发渲染视频元素
                        setVideoSrcMap((prev) => ({
                          ...prev,
                          [video.id]: thumbnailUrl
                        }));
                      }, 500);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredVideoId(null);
                    // 清除延迟定时器
                    if (hoverTimeoutRef.current[video.id]) {
                      clearTimeout(hoverTimeoutRef.current[video.id]);
                      delete hoverTimeoutRef.current[video.id];
                    }
                    const videoEl = videoRefsMap.current[video.id];
                    if (videoEl) {
                      videoEl.pause();
                      videoEl.currentTime = 0;
                    }
                    // 重置进度条和视频源
                    setVideoProgressMap((prev) => ({
                      ...prev,
                      [video.id]: 0
                    }));
                    // 可选：清除视频源以节省内存（如果需要的话）
                    // setVideoSrcMap((prev) => {
                    //   const next = { ...prev };
                    //   delete next[video.id];
                    //   return next;
                    // });
                  }}
                >
                  {/* 视频容器 */}
                  <div 
                    className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-t-xl md:rounded-t-2xl cursor-pointer"
                    style={{
                      aspectRatio: aspectRatio
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/video/${video.id}`);
                    }}
                  >
                    {(() => {
                      const coverLoaded = coverLoadedMap[video.id];
                      const videoLoaded = videoLoadedMap[video.id];
                      return (
                        <>
                          {!coverLoaded && !videoLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse" />
                          )}
                          
                          {/* 封面图片 - 默认显示，悬停时隐藏 */}
                          {coverImageUrl && (
                            <img
                              src={coverImageUrl}
                              alt={video.title}
                              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                coverLoaded && (!isHovered || !videoSrcMap[video.id]) ? 'opacity-100' : 'opacity-0'
                              }`}
                              style={{ zIndex: 1 }}
                              onLoad={() => {
                                setCoverLoadedMap((prev) => ({ ...prev, [video.id]: true }));
                              }}
                            />
                          )}
                          
                          {/* 预览视频 - 悬停时显示，延迟加载 */}
                          {videoSrcMap[video.id] && (
                            <video
                              key={`video-${video.id}`}
                              ref={(el) => {
                                if (el && el !== videoRefsMap.current[video.id]) {
                                  videoRefsMap.current[video.id] = el;
                                  // 手动触发加载
                                  el.load();
                                }
                              }}
                              src={videoSrcMap[video.id]}
                              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                videoLoaded && isHovered ? 'opacity-100' : 'opacity-0'
                              }`}
                              style={{ zIndex: 2 }}
                              preload="none"
                              muted
                              playsInline
                              loop
                              onTimeUpdate={(e) => {
                                const el = e.currentTarget;
                                if (el.duration && el.duration > 0) {
                                  setVideoProgressMap((prev) => ({
                                    ...prev,
                                    [video.id]: el.currentTime / el.duration
                                  }));
                                }
                              }}
                              onLoadedData={(e) => {
                                const videoEl = e.currentTarget;
                                setVideoLoadedMap((prev) => ({ ...prev, [video.id]: true }));
                                
                                // 视频加载完成后，如果还在悬停状态，则播放
                                if (hoveredVideoIdRef.current === video.id) {
                                  videoEl.play().catch((err) => {
                                    console.log('播放失败:', err);
                                  });
                                }
                              }}
                              onError={(e) => {
                                console.error('视频加载错误:', video.id, e.currentTarget.error);
                              }}
                            />
                          )}
                        </>
                      );
                    })()}

                    {/* 进度条 - 只在悬停时显示 */}
                    {isHovered && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 pointer-events-none">
                        <div 
                          className="h-full bg-purple-500 transition-all duration-100"
                          style={{ width: `${(videoProgressMap[video.id] || 0) * 100}%` }}
                        />
                      </div>
                    )}

                    {/* 时长标签 */}
                    {video.duration && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/75 text-white text-xs font-semibold">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>

                  {/* 描述栏 */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {categoryLabel}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatVideoDate(video.created_at)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {video.view_count || 0}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {displayVideos.length > 0 && (
        <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
          {hasMore ? (
            <button
              onClick={() => loadVideos(currentPage + 1, filter, true)}
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

      {displayVideos.length === 0 && !loading && (
        <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
          暂无作品
        </div>
      )}
    </div>
  );
};

