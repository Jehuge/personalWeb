import React, { useEffect, useState } from 'react';
import { AIImage } from '../types';
import { fetchAIImages } from '../services/dataService';
import Loader from './Loader';

export const AIImageGalleryView: React.FC = () => {
  const [images, setImages] = useState<AIImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imagesHasMore, setImagesHasMore] = useState(false);
  const [imagesPage, setImagesPage] = useState(0);
  const [selectedImage, setSelectedImage] = useState<AIImage | null>(null);

  const PAGE_SIZE = 12;

  // 加载 Images 数据
  const loadImages = async (page: number) => {
    const MIN_LOADING_MS = 900;
    const start = performance.now();
    setImagesLoading(true);
    try {
      const data = await fetchAIImages({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
      setImages(data);
      setImagesHasMore(data.length === PAGE_SIZE);
      setImagesPage(page);
    } catch (err) {
      console.error('Failed to load AI images', err);
      setImages([]);
      setImagesHasMore(false);
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

  // 初始加载
  useEffect(() => {
    if (images.length === 0) {
      loadImages(0);
    }
  }, []);

  const handleImagesPreviousPage = () => {
    if (imagesPage > 0) {
      loadImages(imagesPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleImagesNextPage = () => {
    if (imagesHasMore) {
      loadImages(imagesPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (imagesLoading) {
    return <Loader fullscreen />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-cyan-500 to-pink-500 mb-4">
          AI 艺术图库
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          由 Stable Diffusion / Midjourney 等模型生成的艺术作品。
        </p>
      </div>

      <section className="mb-16 animate-fade-in">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {images.map((image) => {
            const tags = image.tags ? image.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
            return (
              <div
                key={image.id}
                className="break-inside-avoid group bg-white dark:bg-gray-800 rounded-3xl p-3 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer mb-6"
                onClick={() => setSelectedImage(image)}
              >
                <div className="relative overflow-hidden rounded-2xl mb-4 bg-gray-100 dark:bg-gray-700">
                  <img
                    src={image.thumbnail_url || image.image_url}
                    alt={image.title || 'AI Generated Image'}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                    <span className="bg-white/90 text-gray-900 px-4 py-2 rounded-full text-sm font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      View Details
                    </span>
                  </div>
                </div>
                <div className="px-1">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate">
                    {image.title || '无标题'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">#AIArt</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 分页控件 */}
        {images.length > 0 && (
          <div className="flex items-center justify-center gap-4 py-8">
            <button
              onClick={handleImagesPreviousPage}
              disabled={imagesPage === 0 || imagesLoading}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${imagesPage === 0 || imagesLoading
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
            >
              上一页
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              第 {imagesPage + 1} 页
            </span>
            <button
              onClick={handleImagesNextPage}
              disabled={!imagesHasMore || imagesLoading}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!imagesHasMore || imagesLoading
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
                  {selectedImage.prompt && (
                    <div>
                      <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">提示词 (Prompt)</label>
                      <p className="text-sm text-gray-300 mt-1 leading-relaxed">{selectedImage.prompt}</p>
                    </div>
                  )}

                  {selectedImage.negative_prompt && (
                    <div>
                      <label className="text-xs font-semibold text-red-400 uppercase tracking-wider">反向提示词 (Negative)</label>
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

