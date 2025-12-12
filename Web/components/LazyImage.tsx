import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  thumbnailSrc?: string;
  imageClassName?: string;
}

// 全局缓存已加载的图片URL，避免重复检查
const loadedImagesCache = new Set<string>();

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  thumbnailSrc,
  alt,
  className = '',
  imageClassName,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // 检查图片是否已经在浏览器缓存中
  useEffect(() => {
    if (!src) {
      setIsLoaded(false);
      return;
    }

    // 如果已经在缓存中，直接设置为已加载（不显示淡入动画）
    if (loadedImagesCache.has(src)) {
      setIsLoaded(true);
      return;
    }

    // 检查实际的img元素是否已经加载完成
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      loadedImagesCache.add(src);
      setIsLoaded(true);
      return;
    }

    // 重置加载状态
    setIsLoaded(false);

    // 创建临时Image对象检查是否已缓存
    const img = new Image();
    let cancelled = false;

    img.onload = () => {
      if (cancelled) return;
      // 图片加载完成（可能在缓存中）
      loadedImagesCache.add(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      // 即使加载失败，也标记为完成，避免重复尝试
    };
    img.src = src;

    // 如果图片已经在缓存中，onload会立即触发
    // 但为了确保，我们也检查complete属性
    if (img.complete && img.naturalWidth > 0) {
      loadedImagesCache.add(src);
      setIsLoaded(true);
    }

    return () => {
      cancelled = true;
    };
  }, [src]);

  const resolvedImageClass = `${imageClassName ?? 'w-full h-full object-cover'} transition-opacity duration-500 ${
    isLoaded ? 'opacity-100' : 'opacity-0'
  }`;

  const handleLoad = () => {
    if (src) {
      loadedImagesCache.add(src);
    }
    setIsLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}>
      {/* 缩略图/占位图 (Blur effect) - 优化：使用更轻量的 blur */}
      {thumbnailSrc && (
        <img
          src={thumbnailSrc}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 filter blur-sm ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden="true"
          loading="lazy"
        />
      )}
      
      {/* 主图 (Lazy loaded) */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy" // 浏览器原生懒加载，极大节省带宽
        onLoad={handleLoad}
        className={resolvedImageClass}
        {...props}
      />
    </div>
  );
};
