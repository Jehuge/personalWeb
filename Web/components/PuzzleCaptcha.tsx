import React, { useRef, useEffect, useCallback } from 'react';
import SliderCaptcha from 'rc-slider-captcha';
import { sleep } from 'ut2';
import createPuzzle from 'create-puzzle';

interface ImageSize {
  width: number;
  height: number;
}

interface PuzzleCaptchaProps {
  onSuccess?: () => void;
  onClose?: () => void;
  title?: string;
  description?: string;
}

// 使用一个简单的渐变背景图片（base64编码）
const defaultBackgroundImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM2Njg4YWEiLz48c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iIzQ0NjZhYSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzIyNDRhYSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=';

const PuzzleCaptcha: React.FC<PuzzleCaptchaProps> = ({ 
  onSuccess = () => {}, 
  onClose,
  title = '安全验证',
  description = '请拖动滑块完成拼图验证'
}) => {
  const offsetXRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const displaySizeRef = useRef<ImageSize>({ width: 350, height: 200 }); // 显示尺寸

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 获取图片真实尺寸
  const getImageSize = useCallback((url: string): Promise<ImageSize> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.onerror = () => {
        // 如果图片加载失败，使用默认尺寸
        resolve({ width: 350, height: 200 });
      };
      img.src = url;
    });
  }, []);

  // 验证函数
  const verifyCaptcha = useCallback(async (data: { x: number }) => {
    await sleep(500); // 模拟网络延迟

    // rc-slider-captcha 会根据 bgSize 和 puzzleSize 计算比例
    // 传入的 data.x 已经是经过比例转换后的值，对应显示尺寸下的坐标
    // 所以直接比较即可
    const isVerified = Math.abs(data.x - offsetXRef.current) <= 5; // 允许5像素误差

    return new Promise<void>((resolve, reject) => {
      if (isVerified) {
        timerRef.current = setTimeout(() => {
          if (typeof onSuccess === 'function') {
            onSuccess();
          }
          resolve();
        }, 500);
      } else {
        reject(new Error('验证失败'));
      }
    });
  }, [onSuccess]);

  // 生成拼图
  const generatePuzzle = useCallback(() => {
    const displaySize = displaySizeRef.current;
    const desiredDisplayPuzzleSize = 50; // 希望拼图块显示为50px

    // 先获取原始图片尺寸
    return getImageSize(defaultBackgroundImage).then((originalSize) => {
      // 计算缩放比例：原始图片 -> 显示尺寸
      const scaleX = displaySize.width / originalSize.width;
      const scaleY = displaySize.height / originalSize.height;
      
      // 拼图块在原始图片上的尺寸
      // rc-slider-captcha 会根据 bgSize 缩放背景图，拼图块也会相应缩放
      // 所以我们需要确保拼图块在原始图片上的尺寸经过缩放后正好是 desiredDisplayPuzzleSize
      const originalPuzzleWidth = desiredDisplayPuzzleSize / scaleX;
      const originalPuzzleHeight = desiredDisplayPuzzleSize / scaleY;

      return createPuzzle(defaultBackgroundImage, {
        format: 'blob',
        width: originalPuzzleWidth,
        height: originalPuzzleHeight
      }).then(async (res) => {
        // res.x 是拼图在原始图片上的位置
        // rc-slider-captcha 会根据 bgSize 和 puzzleSize 自动计算比例
        // 并传入经过比例转换后的 x 值
        // 所以我们需要存储原始图片上的位置，然后让 rc-slider-captcha 处理转换
        // 但验证时需要比较的是显示尺寸下的位置
        const displayX = res.x * scaleX;
        
        // 存储显示尺寸下的坐标，用于验证
        offsetXRef.current = displayX;

        return {
          bgUrl: res.bgUrl,
          puzzleUrl: res.puzzleUrl,
          originalX: res.x,
          bgSize: displaySize
        };
      });
    }).catch((error) => {
      console.error('拼图生成失败:', error);
      return Promise.reject(error);
    });
  }, [getImageSize]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {description}
        </p>

        <div className="captcha-container">
          <SliderCaptcha
            request={generatePuzzle}
            onVerify={verifyCaptcha}
            bgSize={{
              width: 350,
              height: 200
            }}
            puzzleSize={{
              width: 50, // 拼图块显示宽度，需要和 generatePuzzle 中的 desiredDisplayPuzzleSize 一致
              left: 0
            }}
            tipText={{
              default: '向右拖动完成拼图 👉',
              loading: '正在加载...',
              moving: '继续向右拖动 →',
              verifying: '正在验证...',
              error: '验证失败，请重试',
              success: '验证成功！'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PuzzleCaptcha;

