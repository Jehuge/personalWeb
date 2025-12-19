import React, { useState } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  thumbnailSrc?: string;
  imageClassName?: string;
  /** 是否按图片分辨率自适应 aspect ratio */
  autoAspectRatio?: boolean;
  /** 默认 aspect ratio（当 autoAspectRatio 为 true 但图片未加载时使用） */
  defaultAspectRatio?: number;
  /** 图片加载时的占位动画类型：'pulse' | 'blur' | 'none' */
  placeholderType?: 'pulse' | 'blur' | 'none';
  /** 当 aspect ratio 计算完成时的回调，用于瀑布流布局计算 */
  onAspectRatioChange?: (ratio: number) => void;
  /** 图片唯一标识，用于瀑布流布局 */
  imageId?: number | string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  thumbnailSrc,
  alt,
  className = '',
  imageClassName,
  autoAspectRatio = false,
  defaultAspectRatio,
  placeholderType = 'pulse',
  onAspectRatioChange,
  imageId,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(
    autoAspectRatio ? defaultAspectRatio : undefined
  );

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (autoAspectRatio && img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      setAspectRatio(ratio);
      // 通知父组件 aspect ratio 已计算完成（用于瀑布流布局）
      if (onAspectRatioChange) {
        onAspectRatioChange(ratio);
      }
    }
    setIsLoaded(true);
  };

  const resolvedImageClass = `${imageClassName ?? 'w-full h-full object-cover'} transition-opacity duration-500 ${
    isLoaded ? 'opacity-100' : 'opacity-0'
  }`;

  const containerStyle = autoAspectRatio && aspectRatio
    ? { aspectRatio: aspectRatio.toString() }
    : undefined;

  return (
    <div 
      className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}
      style={containerStyle}
    >
      {/* 加载占位动画 */}
      {!isLoaded && placeholderType === 'pulse' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse" />
      )}

      {/* 缩略图/占位图 (Blur effect) */}
      {thumbnailSrc && placeholderType === 'blur' && (
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
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleImageLoad}
        className={resolvedImageClass}
        {...props}
      />
    </div>
  );
};
