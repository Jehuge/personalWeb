'use client';

import { useRef, useEffect } from 'react';

export interface Colors {
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;
  color9: string;
  color10: string;
  color11: string;
  color12: string;
  color13: string;
  color14: string;
  color15: string;
  color16: string;
  color17: string;
}

interface LiquidProps {
  isHovered: boolean;
  colors: Colors;
  className?: string;
}

export function Liquid({ isHovered, colors, className }: LiquidProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    updateSize();

    let time = 0;

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      time += 0.02;

      const speed = isHovered ? 1.5 : 1.0;
      const gradient = ctx.createLinearGradient(
        Math.sin(time * speed) * rect.width * 0.3,
        Math.cos(time * 1.2 * speed) * rect.height * 0.3,
        rect.width + Math.sin(time * 1.1 * speed) * rect.width * 0.3,
        rect.height + Math.cos(time * 0.9 * speed) * rect.height * 0.3,
      );

      const colorArray = [
        colors.color1,
        colors.color2,
        colors.color3,
        colors.color4,
        colors.color5,
        colors.color6,
        colors.color7,
        colors.color8,
        colors.color9,
        colors.color10,
        colors.color11,
        colors.color12,
        colors.color13,
        colors.color14,
        colors.color15,
        colors.color16,
        colors.color17,
      ];

      colorArray.forEach((color, index) => {
        gradient.addColorStop(index / (colorArray.length - 1), color);
      });

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      animationRef.current = requestAnimationFrame(animate);
    };

    // Always run animation
    animate();

    const handleResize = () => {
      updateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isHovered, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className || ''}`}
    />
  );
}

