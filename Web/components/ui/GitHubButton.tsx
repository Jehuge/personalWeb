'use client';

import React, { useState } from 'react';

import { Github } from 'lucide-react';

import { Colors, Liquid } from '@/components/ui/liquid-gradient';

const COLORS: Colors = {
  color1: '#FFFFFF',
  color2: '#1E10C5',
  color3: '#9089E2',
  color4: '#FCFCFE',
  color5: '#F9F9FD',
  color6: '#B2B8E7',
  color7: '#0E2DCB',
  color8: '#0017E9',
  color9: '#4743EF',
  color10: '#7D7BF4',
  color11: '#0B06FC',
  color12: '#C5C1EA',
  color13: '#1403DE',
  color14: '#B6BAF6',
  color15: '#C1BEEB',
  color16: '#290ECB',
  color17: '#3F4CC0',
};

const GitHubButton: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href='https://github.com/Jehuge'
      target='_blank'
      rel='noopener noreferrer'
      className='relative inline-block w-8 h-8 group dark:bg-black bg-white dark:border-white border-black border-2 rounded-lg'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className='absolute w-[112.81%] h-[128.57%] top-[8.57%] left-1/2 -translate-x-1/2 filter blur-[19px] opacity-70'>
        <span className='absolute inset-0 rounded-lg bg-[#d9d9d9] filter blur-[6.5px]'></span>
        <div className='relative w-full h-full overflow-hidden rounded-lg'>
          <Liquid isHovered={isHovered} colors={COLORS} />
        </div>
      </div>
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[92.23%] h-[112.85%] rounded-lg bg-[#010128] filter blur-[7.3px]'></div>
      <div className='relative w-full h-full overflow-hidden rounded-lg'>
        <span className='absolute inset-0 rounded-lg bg-[#d9d9d9]'></span>
        <span className='absolute inset-0 rounded-lg bg-black'></span>
        <Liquid isHovered={isHovered} colors={COLORS} />
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`absolute inset-0 rounded-lg border-solid border-[3px] border-gradient-to-b from-transparent to-white mix-blend-overlay filter ${
              i <= 2 ? 'blur-[3px]' : i === 3 ? 'blur-[5px]' : 'blur-xs'
            }`}
          ></span>
        ))}
        <span className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[70.8%] h-[42.85%] rounded-lg filter blur-[15px] bg-[#006]'></span>
      </div>
      <span className='absolute inset-0 flex items-center justify-center rounded-lg group-hover:text-yellow-400 text-white pointer-events-none'>
        <Github className='inline-block group-hover:fill-yellow-400 fill-white w-4 h-4 shrink-0' />
      </span>
    </a>
  );
};

export default GitHubButton;

