import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { useTheme } from './ThemeContext';

interface GeoFeature {
  type: string;
  geometry: any;
  properties: any;
}

function interpolateProjection(raw0: any, raw1: any) {
  const mutate: any = d3.geoProjectionMutator((t: number) => (x: number, y: number) => {
    const [x0, y0] = raw0(x, y);
    const [x1, y1] = raw1(x, y);
    return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)];
  });
  let t = 0;
  return Object.assign((mutate as any)(t), {
    alpha(_: number) {
      return arguments.length ? (mutate as any)((t = +_)) : t;
    },
  });
}

interface GlobeAnimationProps {
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
}

export const GlobeAnimation: React.FC<GlobeAnimationProps> = ({ 
  className = '',
  autoPlay = true,
  showControls = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState([0]);
  const [worldData, setWorldData] = useState<GeoFeature[]>([]);
  const [rotation, setRotation] = useState([0, 0]);
  const [translation, setTranslation] = useState([0, 0]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState([0, 0]);
  const [isRotating, setIsRotating] = useState(true);
  const [isLooping, setIsLooping] = useState(autoPlay);
  const [mapPanOffset, setMapPanOffset] = useState(0);
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0); // 使用 ref 存储当前进度，避免频繁状态更新
  const lastRenderTimeRef = useRef(0); // 用于节流渲染

  // 响应式尺寸 - 作为背景时更大更长
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;
        const aspectRatio = 1200 / 800; // 3:2 比例，更长
        
        let width: number;
        let height: number;
        
        if (isMobile) {
          // 移动端：使用更小的尺寸，不超过容器大小
          width = Math.min(containerWidth, 600);
          height = width / aspectRatio;
          
          // 如果高度超出容器，按高度计算
          if (height > containerHeight) {
            height = containerHeight;
            width = height * aspectRatio;
          }
        } else {
          // 桌面端：作为背景，使用更大的尺寸，可以超出容器
          // 宽度至少是容器的 1.2 倍，最大 1600
          width = Math.max(containerWidth * 1.2, Math.min(containerWidth * 1.5, 1600));
          height = width / aspectRatio;
          
          // 如果高度不够，按高度计算
          if (height < containerHeight * 1.1) {
            height = containerHeight * 1.2;
            width = height * aspectRatio;
          }
        }
        
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isMobile]);

  // Load world data
  useEffect(() => {
    const loadWorldData = async () => {
      try {
        const response = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
        const world: any = await response.json();
        const countries = feature(world, world.objects.countries).features;
        setWorldData(countries);
      } catch (error) {
        console.error('Failed to load world data:', error);
        const fallbackData = [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-180, -90],
                  [180, -90],
                  [180, 90],
                  [-180, 90],
                  [-180, -90],
                ],
              ],
            },
            properties: {},
          },
        ];
        setWorldData(fallbackData);
      }
    };

    loadWorldData();
  }, []);

  const handleAnimate = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    const startProgress = progressRef.current;
    const endProgress = startProgress === 0 ? 100 : 0;
    const duration = 2000;
    const startTime = performance.now();
    const RENDER_THROTTLE_MS = 12; // 提高帧率响应

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);

      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const currentProgress = startProgress + (endProgress - startProgress) * eased;
      progressRef.current = currentProgress;

      // 节流：只在足够时间间隔后更新状态，减少重新渲染次数
      if (currentTime - lastRenderTimeRef.current >= RENDER_THROTTLE_MS) {
        setProgress([currentProgress]);
        lastRenderTimeRef.current = currentTime;
      }

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 确保最终值被设置
        progressRef.current = endProgress;
        setProgress([endProgress]);
        setIsAnimating(false);
        animationFrameRef.current = null;
      }
    };

    lastRenderTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isAnimating]);

  useEffect(() => {
    if (!isLooping) {
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      return;
    }

    const runLoop = () => {
      const currentProgress = progress[0];

      if (currentProgress === 0) {
        loopTimerRef.current = setTimeout(() => {
          handleAnimate();
          setTimeout(() => {
            runLoop();
          }, 2000);
        }, 5000);
      } else if (currentProgress === 100) {
        loopTimerRef.current = setTimeout(() => {
          handleAnimate();
          setTimeout(() => {
            runLoop();
          }, 2000);
        }, 5000);
      }
    };

    runLoop();

    return () => {
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
      }
    };
  }, [isLooping, progress, handleAnimate]);

  useEffect(() => {
    if (!isRotating || isDragging || isAnimating || progress[0] > 50) return;

    // 提高旋转更新频率，提升流畅度
    const interval = setInterval(() => {
      setRotation((prev) => [(prev[0] + 0.5) % 360, prev[1]]);
    }, 30); // 更接近 ~33fps

    return () => clearInterval(interval);
  }, [isRotating, isDragging, isAnimating, progress]);

  useEffect(() => {
    if (!isLooping || progress[0] < 80 || isDragging || isAnimating) {
      return;
    }

    // 提高地图平移更新频率，提升流畅度
    const interval = setInterval(() => {
      setMapPanOffset((prev) => (prev + 0.3) % 360);
      setRotation((prev) => [(prev[0] + 0.3) % 360, prev[1]]);
    }, 30); // 更接近 ~33fps

    return () => clearInterval(interval);
  }, [isLooping, progress, isDragging, isAnimating]);

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsLooping(false);
    setIsRotating(false);
    setIsDragging(true);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setLastMouse([event.clientX - rect.left, event.clientY - rect.top]);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentMouse = [event.clientX - rect.left, event.clientY - rect.top];
    const dx = currentMouse[0] - lastMouse[0];
    const dy = currentMouse[1] - lastMouse[1];

    const t = progress[0] / 100;

    if (t < 0.5) {
      const sensitivity = 0.5;
      setRotation((prev) => [prev[0] + dx * sensitivity, Math.max(-90, Math.min(90, prev[1] - dy * sensitivity))]);
    } else {
      const sensitivityMap = 0.25;
      setRotation((prev) => [prev[0] + dx * sensitivityMap, Math.max(-90, Math.min(90, prev[1] - dy * sensitivityMap))]);
      setMapPanOffset((prev) => prev + dx * sensitivityMap);
    }

    setLastMouse(currentMouse);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!svgRef.current || worldData.length === 0) return;

    const svg = d3.select(svgRef.current);
    
    // 同步 ref 和 state，确保使用最新值
    const currentProgress = progress[0];
    progressRef.current = currentProgress;
    const t = currentProgress / 100;
    const alpha = Math.pow(t, 0.5);

    // 根据画布大小动态调整缩放比例，移动端使用更小的缩放
    const scaleMultiplier = isMobile ? 0.25 : 0.4; // 移动端缩放更小
    const baseScale = Math.min(dimensions.width, dimensions.height) * scaleMultiplier;
    const scale = d3.scaleLinear().domain([0, 1]).range([baseScale, baseScale * 0.6]);
    const baseRotate = d3.scaleLinear().domain([0, 1]).range([0, 0]);

    const currentRotation = rotation[0];

    const projection = interpolateProjection(d3.geoOrthographicRaw, d3.geoEquirectangularRaw)
      .scale(scale(alpha))
      .translate([dimensions.width / 2 + translation[0], dimensions.height / 2 + translation[1]])
      .rotate([baseRotate(alpha) + currentRotation, rotation[1]])
      .precision(0.1);

    projection.alpha(alpha);

    const path = d3.geoPath(projection);

    const colors = {
      graticule: theme === "dark" ? "#ffffff" : "#000000",
      countryStroke: theme === "dark" ? "#ffffff" : "#000000",
    };
    // 根据画布尺寸动态计算线宽，移动端再额外减小，并限制上下限
    const sizeFactor = Math.min(dimensions.width, dimensions.height) / 1200;
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
    // 略微增大移动端线宽，并放宽上限
    const strokeWidthGraticule = clamp((isMobile ? 1.0 : 1.1) * sizeFactor, 0.8, 1.2);
    const strokeWidthCountry = clamp((isMobile ? 1.2 : 1.4) * sizeFactor, 1.0, 1.6);
    const strokeWidthSphere = clamp((isMobile ? 1.05 : 1.2) * sizeFactor, 0.9, 1.3);

    // 清除现有内容
    svg.selectAll("*").remove();

    try {
      const graticule = d3.geoGraticule();
      const graticulePath = path(graticule());
      if (graticulePath) {
        svg
          .append("path")
          .datum(graticule())
          .attr("d", graticulePath)
          .attr("fill", "none")
          .attr("stroke", colors.graticule)
          .attr("stroke-width", strokeWidthGraticule)
          .attr("vector-effect", "non-scaling-stroke")
          .attr("opacity", 0.5);
      }
    } catch (error) {
      console.log("Error creating graticule:", error);
    }

    // 批量更新国家路径，使用更高效的渲染方式
    const countries = svg
      .selectAll(".country")
      .data(worldData);

    countries
      .enter()
      .append("path")
      .merge(countries as any)
      .attr("class", "country")
      .attr("d", (d) => {
        try {
          const pathString = path(d as any);
          if (!pathString) return "";
          if (typeof pathString === "string" && (pathString.includes("NaN") || pathString.includes("Infinity"))) {
            return "";
          }
          return pathString;
        } catch (error) {
          console.log("Error generating path for country:", error);
          return "";
        }
      })
      .attr("fill", "none")
      .attr("stroke", colors.countryStroke)
      .attr("stroke-width", strokeWidthCountry)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("opacity", 1.0)
      .style("visibility", function () {
        const pathData = d3.select(this).attr("d");
        return pathData && pathData.length > 0 && !pathData.includes("NaN") ? "visible" : "hidden";
      });

    countries.exit().remove();

    // 重新绘制球体轮廓线，确保地图顶部边界可见
    try {
      const sphereOutline = path({ type: "Sphere" });
      if (sphereOutline) {
        svg
          .append("path")
          .datum({ type: "Sphere" })
          .attr("d", sphereOutline)
          .attr("fill", "none")
          .attr("stroke", colors.countryStroke)
          .attr("stroke-width", strokeWidthSphere)
          .attr("vector-effect", "non-scaling-stroke")
          .attr("opacity", 0.8);
      }
    } catch (error) {
      console.log("Error creating sphere outline:", error);
    }
  }, [worldData, progress, rotation, translation, theme, mapPanOffset, dimensions, isMobile]);

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    // 取消正在进行的动画
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsAnimating(false);
    setRotation([0, 0]);
    setTranslation([0, 0]);
    progressRef.current = 0;
    setProgress([0]);
    setIsRotating(true);
    setIsLooping(autoPlay);
    setMapPanOffset(0);
  };

  const toggleLoop = () => {
    setIsLooping((prev) => !prev);
    if (!isLooping) {
      setProgress([0]);
      setIsRotating(true);
      setMapPanOffset(0);
    }
  };

  return (
    <div className={`relative flex items-center justify-center w-full h-full ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className={`w-full h-full transition-colors ${
          showControls 
            ? "rounded-lg cursor-grab active:cursor-grabbing" 
            : "cursor-default"
        }`}
        preserveAspectRatio="xMidYMid meet"
        style={{ 
          willChange: isAnimating ? 'transform' : 'auto',
          transform: 'translateZ(0)' // 启用硬件加速
        }}
        onMouseDown={showControls ? handleMouseDown : undefined}
        onMouseMove={showControls ? handleMouseMove : undefined}
        onMouseUp={showControls ? handleMouseUp : undefined}
        onMouseLeave={showControls ? handleMouseUp : undefined}
      />
      {showControls && (
        <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 z-10">
          <button
            onClick={toggleLoop}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              isLooping
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : theme === "dark"
                ? "text-white border border-white/20 hover:bg-white/10 bg-transparent"
                : "text-gray-900 border border-gray-300 hover:bg-gray-100 bg-white"
            }`}
          >
            {isLooping ? "停止循环" : "自动循环"}
          </button>
          <button
            onClick={handleAnimate}
            disabled={isAnimating || isLooping}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              isAnimating || isLooping
                ? "opacity-50 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isAnimating ? "动画中..." : progress[0] === 0 ? "展开地图" : "收起地图"}
          </button>
          <button
            onClick={handleReset}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              theme === "dark"
                ? "text-white border border-white/20 hover:bg-white/10 bg-transparent"
                : "text-gray-900 border border-gray-300 hover:bg-gray-100 bg-white"
            }`}
          >
            重置
          </button>
        </div>
      )}
    </div>
  );
};

