import React from 'react';
import styled from 'styled-components';

interface CubeLogoProps {
  /** 控制立方体尺寸，默认 36px */
  size?: number;
  className?: string;
}

const CubeLogo: React.FC<CubeLogoProps> = ({ size = 36, className }) => {
  const cssVars = {
    '--cube-size': `${size}px`,
    '--cube-half': `${size / 2}px`,
    '--cube-shadow-depth': `${size * 1.2}px`,
  } as React.CSSProperties;

  const faceStyle = (i: number) =>
    ({
      ['--i' as const]: i,
    } as React.CSSProperties);

  return (
    <StyledWrapper style={cssVars} className={className} aria-hidden>
      <div className="cube-loader">
        <div className="cube-top" />
        <div className="cube-wrapper">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="cube-span" style={faceStyle(i)} />
          ))}
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  --cube-size: 75px;
  --cube-half: calc(var(--cube-size) / 2);
  --cube-shadow-depth: calc(var(--cube-size) * 1.2);
  perspective: 800px;

  .cube-loader {
    position: relative;
    width: var(--cube-size);
    height: var(--cube-size);
    transform-style: preserve-3d;
    transform: rotateX(-30deg);
    animation: animate 4s linear infinite;
  }

  @keyframes animate {
    0% {
      transform: rotateX(-30deg) rotateY(0);
    }

    100% {
      transform: rotateX(-30deg) rotateY(360deg);
    }
  }

  .cube-loader .cube-wrapper {
    position: absolute;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
  }

  .cube-loader .cube-wrapper .cube-span {
    position: absolute;
    width: 100%;
    height: 100%;
    transform: rotateY(calc(90deg * var(--i))) translateZ(var(--cube-half));
    background: linear-gradient(
      to bottom,
      hsl(0, 0%, 100%) 0%,
      hsl(0, 0%, 100%) 5.5%,
      hsl(0, 0%, 100%) 12.1%,
      hsl(0, 0%, 0%) 100%,
      hsl(0, 0%, 100%) 27.9%,
      hsl(0, 0%, 100%) 36.6%,
      hsl(0, 0%, 100%) 45.6%,
      hsl(0, 0%, 0%) 100%,
      hsl(0, 0%, 100%) 63.4%,
      hsl(0, 0%, 100%) 71.7%,
      hsl(0, 0%, 100%) 79.4%,
      hsl(0, 0%, 0%) 100%,
      hsl(0, 0%, 100%) 100%,
      hsl(0, 0%, 100%) 100%,
      hsl(0, 0%, 100%) 100%,
      hsl(0, 0%, 0%) 100%
    );
  }

  .cube-top {
    position: absolute;
    width: var(--cube-size);
    height: var(--cube-size);
    background: hsl(0, 0%, 98%) 0%;
    transform: rotateX(90deg) translateZ(var(--cube-half));
    transform-style: preserve-3d;
  }

  .cube-top::before {
    content: '';
    position: absolute;
    width: var(--cube-size);
    height: var(--cube-size);
    background: hsl(0, 0%, 33%) 19.6%;
    transform: translateZ(calc(var(--cube-shadow-depth) * -1));
    filter: blur(10px);
    box-shadow:
      0 0 10px #ffffff,
      0 0 20px hsl(0, 0%, 0%) 19.6%,
      0 0 30px #ffffff,
      0 0 40px hsl(0, 0%, 0%) 19.6%;
  }
`;

export default CubeLogo;

