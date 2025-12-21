import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoWork } from '../types';

interface PhotoGalleryProps {
  photos: PhotoWork[];
  onPhotoClick?: (photo: PhotoWork) => void;
}

function Gallery({ 
  items, 
  setIndex, 
  setOpen, 
  index,
  onPhotoClick 
}: {
  items: PhotoWork[];
  setIndex: (index: number) => void;
  setOpen: (open: boolean) => void;
  index: number;
  onPhotoClick?: (photo: PhotoWork) => void;
}) {
  return (
    <>
      {/* 手机端：2列网格布局 */}
      <div className='w-full grid grid-cols-2 gap-3 md:hidden py-4'>
        {items.map((item, i) => {
          return (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.95 }}
              className='relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-white dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700/60'
              onClick={() => {
                setIndex(i);
                setOpen(true);
              }}
            >
              <img
                src={item.thumbnail_url || item.image_url}
                alt={item.title}
                className='w-full h-full object-cover'
              />
            </motion.div>
          );
        })}
      </div>

      {/* 桌面端：横向展开布局 */}
      <div className='hidden md:flex w-full rounded-md md:gap-4 gap-3 items-center justify-center py-4 min-h-[400px]'>
        {items.map((item, i) => {
          return (
            <motion.img
              key={item.id}
              whileTap={{ scale: 0.95 }}
              className={`rounded-2xl ${
                index === i
                  ? 'w-[400px] xl:w-[380px] lg:w-[350px] md:w-[320px] '
                  : 'xl:w-[80px] lg:w-[70px] md:w-[60px]'
              } h-[400px] xl:h-[380px] lg:h-[350px] md:h-[320px] shrink-0 object-cover transition-[width] ease-in-out duration-300 cursor-pointer`}
              onMouseEnter={() => {
                setIndex(i);
              }}
              onMouseLeave={() => {
                // 鼠标离开时恢复为无选中态，避免离开后仍保持放大
                setIndex(-1);
              }}
              onClick={() => {
                setIndex(i);
                setOpen(true);
              }}
              src={item.thumbnail_url || item.image_url}
              alt={item.title}
              layoutId={`photo-${item.id}`}
            />
          );
        })}
      </div>
    </>
  );
}

export default function PhotoGallery({ photos, onPhotoClick }: PhotoGalleryProps) {
  const [index, setIndex] = useState(2);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!photos || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[index] || photos[0];

  return (
    <div className='relative w-full'>
      <Gallery
        items={photos}
        index={index}
        setIndex={setIndex}
        setOpen={setOpen}
        onPhotoClick={onPhotoClick}
      />
      <AnimatePresence>
        {open && currentPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key='overlay'
            className='dark:bg-black/40 bg-white/40 backdrop-blur-lg fixed inset-0 z-50 top-0 left-0 bottom-0 right-0 w-full h-full grid place-content-center'
            onClick={() => {
              setOpen(false);
            }}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <motion.div
                layoutId={`photo-${currentPhoto.id}`}
                className='w-[600px] md:w-[500px] sm:w-[90vw] h-[600px] md:h-[500px] sm:h-[90vw] max-w-[90vw] max-h-[90vh] rounded-2xl relative cursor-pointer overflow-hidden'
                onClick={() => {
                  setOpen(false);
                  // 延迟一下，让快速预览关闭动画完成后再打开详细弹窗
                  setTimeout(() => {
                    if (onPhotoClick) {
                      onPhotoClick(currentPhoto);
                    }
                  }, 200);
                }}
              >
                <img
                  src={currentPhoto.thumbnail_url || currentPhoto.image_url}
                  alt={currentPhoto.title}
                  className='rounded-2xl h-full w-full object-cover'
                />
                <article className='dark:bg-black/40 bg-white/40 backdrop-blur-md absolute -bottom-1 left-0 w-full rounded-md p-2'>
                  <motion.h1
                    initial={{ scaleY: 0.2 }}
                    animate={{ scaleY: 1 }}
                    exit={{ scaleY: 0.2 }}
                    transition={{ duration: 0.2, delay: 0.2 }}
                    className='text-xl font-semibold'
                  >
                    {currentPhoto.title}
                  </motion.h1>
                  {currentPhoto.description && (
                    <motion.p
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.2, delay: 0.2 }}
                      className='text-sm leading-[100%] py-2 line-clamp-2'
                    >
                      {currentPhoto.description.split('|')[0].trim()}
                    </motion.p>
                  )}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.3 }}
                    className='text-xs text-white/80 mt-2'
                  >
                    点击查看详情 →
                  </motion.div>
                </article>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
