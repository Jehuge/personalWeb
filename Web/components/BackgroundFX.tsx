import React from 'react';

/**
 * Multi-layered background that fuses gradient orbs, grids and scanning beams
 * to make the landing page feel more immersive without interfering with content.
 */
export const BackgroundFX = React.memo(() => {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f4f6ff] via-[#eef2ff] to-white dark:from-[#01060f] dark:via-[#050b1c] dark:to-[#070a16]" />

      <div className="absolute -top-1/3 left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full bg-primary-500/20 blur-[160px] animate-blob dark:bg-primary-500/10" />
      <div className="absolute top-1/2 -right-32 h-[60vh] w-[60vh] rounded-full bg-purple-500/20 blur-[180px] opacity-70 animate-blob delay-700 dark:bg-purple-600/20" />

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

      <div className="absolute inset-0">
        <div className="absolute inset-y-0 w-1/2 left-0 bg-gradient-to-r from-primary-500/10 to-transparent blur-[120px]" />
        <div className="absolute inset-y-0 w-1/2 right-0 bg-gradient-to-l from-indigo-500/20 to-transparent blur-[150px]" />
      </div>

      <div className="absolute inset-0 opacity-60">
        <div className="absolute inset-0 animate-orbital bg-[radial-gradient(circle,_rgba(255,255,255,0.12)_1px,_transparent_1px)] bg-[length:180px_180px] dark:opacity-30" />
      </div>

      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10 animate-scan" />
      </div>
    </div>
  );
});

BackgroundFX.displayName = 'BackgroundFX';

