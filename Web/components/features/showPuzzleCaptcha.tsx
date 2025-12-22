import React from 'react';
import { createRoot } from 'react-dom/client';
import PuzzleCaptcha from './PuzzleCaptcha';

type ShowPuzzleOptions = {
  title?: string;
  description?: string;
};

export function showPuzzleCaptcha(options: ShowPuzzleOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = createRoot(container);

    const cleanup = () => {
      try {
        root.unmount();
      } catch (e) {
        // ignore
      }
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };

    const handleSuccess = () => {
      cleanup();
      resolve();
    };

    const handleClose = () => {
      cleanup();
      reject(new Error('closed'));
    };

    try {
      root.render(
        <PuzzleCaptcha
          title={options.title || '下载验证'}
          description={options.description || '请拖动滑块完成拼图验证后下载原图'}
          onSuccess={handleSuccess}
          onClose={handleClose}
        />
      );
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}


