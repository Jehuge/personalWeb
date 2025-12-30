'use client';

import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { Colors, Liquid } from '@/components/ui/liquid-gradient';

const COLORS: Colors = {
    color1: '#FFFFFF',
    color2: '#06b6d4', // cyan-500
    color3: '#22d3ee', // cyan-400
    color4: '#ecfeff', // cyan-50
    color5: '#cffafe', // cyan-100
    color6: '#67e8f9', // cyan-300
    color7: '#0891b2', // cyan-600
    color8: '#0e7490', // cyan-700
    color9: '#06b6d4', // cyan-500
    color10: '#22d3ee', // cyan-400
    color11: '#155e75', // cyan-800
    color12: '#a5f3fc', // cyan-200
    color13: '#164e63', // cyan-900
    color14: '#67e8f9', // cyan-300
    color15: '#22d3ee', // cyan-400
    color16: '#0891b2', // cyan-600
    color17: '#06b6d4', // cyan-500
};

const PersonalSiteButton: React.FC = () => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <a
            href='https://www.jackjiapic.xyz'
            target='_blank'
            rel='noopener noreferrer'
            className='relative inline-block w-24 h-8 group dark:bg-black bg-white dark:border-white border-black border-2 rounded-lg'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title="Personal Website"
        >
            <div className='absolute w-[112.81%] h-[128.57%] top-[8.57%] left-1/2 -translate-x-1/2 filter blur-[19px] opacity-70'>
                <span className='absolute inset-0 rounded-lg bg-[#d9d9d9] filter blur-[6.5px]'></span>
                <div className='relative w-full h-full overflow-hidden rounded-lg'>
                    <Liquid isHovered={isHovered} colors={COLORS} />
                </div>
            </div>
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[92.23%] h-[112.85%] rounded-lg bg-[#083344] filter blur-[7.3px]'></div>
            <div className='relative w-full h-full overflow-hidden rounded-lg'>
                <span className='absolute inset-0 rounded-lg bg-[#d9d9d9]'></span>
                <span className='absolute inset-0 rounded-lg bg-black'></span>
                <Liquid isHovered={isHovered} colors={COLORS} />
                {[1, 2, 3, 4, 5].map((i) => (
                    <span
                        key={i}
                        className={`absolute inset-0 rounded-lg border-solid border-[3px] border-gradient-to-b from-transparent to-white mix-blend-overlay filter ${i <= 2 ? 'blur-[3px]' : i === 3 ? 'blur-[5px]' : 'blur-xs'
                            }`}
                    ></span>
                ))}
                <span className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[70.8%] h-[42.85%] rounded-lg filter blur-[15px] bg-[#006]'></span>
            </div>
            <span className='absolute inset-0 flex items-center justify-center gap-2 rounded-lg group-hover:text-cyan-400 text-white pointer-events-none text-xs font-bold tracking-wide'>
                <Camera className='w-4 h-4' />
                <span>摄影网站</span>
            </span>
        </a>
    );
};

export default PersonalSiteButton;
