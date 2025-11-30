import React, { useState } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  thumbnailSrc?: string;
  imageClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  thumbnailSrc,
  alt,
  className = '',
  imageClassName,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const resolvedImageClass = `${imageClassName ?? 'w-full h-full object-cover'} transition-opacity duration-500 ${
    isLoaded ? 'opacity-100' : 'opacity-0'
  }`;

  return (
    <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}>
      {/* 缩略图/占位图 (Blur effect) */}
      {thumbnailSrc && (
        <img
          src={thumbnailSrc}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 filter blur-lg ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden="true"
        />
      )}
      
      {/* 主图 (Lazy loaded) */}
      <img
        src={src}
        alt={alt}
        loading="lazy" // 浏览器原生懒加载，极大节省带宽
        onLoad={() => setIsLoaded(true)}
        className={resolvedImageClass}
        {...props}
      />
    </div>
  );
};
