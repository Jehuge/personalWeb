import { BlogPost, Photo, Project } from "./types";

export const PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Neural Dreamscape',
    description: 'A generative AI art installation that converts ambient noise into sci-fi landscapes in real-time.',
    techStack: ['Python', 'PyTorch', 'React', 'Gemini'],
    imageUrl: 'https://picsum.photos/800/600?random=1',
    category: 'AI'
  },
  {
    id: '2',
    title: 'Exo-Suit Telemetry',
    description: 'Wearable dashboard interface designed for high-altitude environments, focusing on biometric data visualization.',
    techStack: ['TypeScript', 'D3.js', 'IoT'],
    imageUrl: 'https://picsum.photos/800/600?random=2',
    category: 'System'
  },
  {
    id: '3',
    title: 'Cyber-Sentinel',
    description: 'An autonomous security drone simulation using reinforcement learning agents.',
    techStack: ['Unity', 'C#', 'ML-Agents'],
    imageUrl: 'https://picsum.photos/800/600?random=3',
    category: 'AI'
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'The Ethics of Digital Immortality',
    excerpt: 'As we approach the singularity, how do we handle the consciousness of our digital twins? Exploring the boundaries of AI.',
    date: '2023-10-15',
    readTime: '5 min read',
    tags: ['AI', 'Philosophy', 'Future']
  },
  {
    id: '2',
    title: 'Why I Switched to Rust for my Space Sim',
    excerpt: 'Memory safety in zero-g. A deep dive into rewriting the physics engine of my hobby project.',
    date: '2023-11-02',
    readTime: '8 min read',
    tags: ['Dev', 'Rust', 'GameDev']
  },
  {
    id: '3',
    title: 'Review: The Three-Body Problem TV Adaptation',
    excerpt: 'Does it capture the cosmic horror of the original text? A fan\'s perspective on visualization.',
    date: '2024-01-20',
    readTime: '4 min read',
    tags: ['Sci-Fi', 'Review']
  }
];

export const PHOTOS: Photo[] = [
  { id: '1', url: 'https://picsum.photos/600/800?random=10', caption: 'Neon Nights', location: 'Tokyo, Japan' },
  { id: '2', url: 'https://picsum.photos/800/600?random=11', caption: 'Industrial Zen', location: 'Berlin, Germany' },
  { id: '3', url: 'https://picsum.photos/600/600?random=12', caption: 'Server Farm Esthetic', location: 'Data Center 01' },
  { id: '4', url: 'https://picsum.photos/800/500?random=13', caption: 'Cyberpunk Alley', location: 'Chongqing, China' },
];

export const SYSTEM_INSTRUCTION = `You are a digital assistant for a portfolio website known as "Nexus". 
The author is a sci-fi enthusiast, photographer, and AI engineer. 
Your persona is helpful, slightly futuristic, and concise. 
You can answer questions about the author's skills (React, Python, AI, Photography) or discuss sci-fi concepts.
Keep answers under 50 words unless asked for a deep dive.`;
