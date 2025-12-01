import React, { useEffect, useRef, useState } from 'react';

/**
 * Multi-layered background that fuses gradient orbs, grids and scanning beams
 * to make the landing page feel more immersive without interfering with content.
 * Optimized for performance: pauses animations when page is not visible.
 */
export const BackgroundFX = React.memo(() => {
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 使用 Page Visibility API 检测页面是否可见
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    // 使用 IntersectionObserver 检测组件是否在视口中
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    setIsVisible(!document.hidden);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  // 当不可见时，暂停所有动画
  const animationStyle = isVisible ? {} : { animationPlayState: 'paused' as const };

  return (
    <div 
      ref={containerRef}
      aria-hidden 
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#f4f6ff] via-[#eef2ff] to-white dark:from-[#01060f] dark:via-[#050b1c] dark:to-[#070a16]" />

      {/* 优化：减少 blur 半径，使用 will-change 提示浏览器优化 */}
      <div 
        className="absolute -top-1/3 left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full bg-primary-500/20 blur-[80px] dark:blur-[100px] animate-blob dark:bg-primary-500/10 will-change-transform"
        style={{ willChange: 'transform', ...animationStyle }}
      />
      <div 
        className="absolute top-1/2 -right-32 h-[60vh] w-[60vh] rounded-full bg-purple-500/20 blur-[90px] dark:blur-[110px] opacity-70 animate-blob delay-700 dark:bg-purple-600/20 will-change-transform"
        style={{ willChange: 'transform', ...animationStyle }}
      />

      <div
        className="absolute inset-0 opacity-60 mix-blend-overlay"
        style={{
          backgroundImage:
            'linear-gradient(rgba(120,144,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(120,144,255,0.08) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          maskImage: 'radial-gradient(circle at 50% 40%, black, transparent 65%)',
        }}
      />

      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent dark:from-white/10 dark:via-white/5" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 via-white/30 to-transparent dark:from-white/5 dark:via-white/0" />

      {/* 优化：减少 blur 半径 */}
      <div className="absolute inset-0">
        <div className="absolute inset-y-0 w-1/2 left-0 bg-gradient-to-r from-primary-500/10 to-transparent blur-[60px] dark:blur-[80px]" />
        <div className="absolute inset-y-0 w-1/2 right-0 bg-gradient-to-l from-indigo-500/20 to-transparent blur-[75px] dark:blur-[90px]" />
      </div>

      {/* 优化：只在可见时运行动画 */}
      <div className="absolute inset-0 opacity-60" style={animationStyle}>
        <div className="absolute inset-0 animate-orbital bg-[radial-gradient(circle,_rgba(255,255,255,0.12)_1px,_transparent_1px)] bg-[length:180px_180px] dark:opacity-30 will-change-transform" />
      </div>

      <div className="absolute inset-0" style={animationStyle}>
        <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10 animate-scan will-change-transform" />
      </div>
    </div>
  );
});

BackgroundFX.displayName = 'BackgroundFX';

