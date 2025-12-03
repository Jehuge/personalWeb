import { AIDemo, AIImage, AIProject, BlogPost, PhotoWork } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

const buildUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new ApiError(detail || `Request failed: ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
};

// 简单的缓存机制实现，利用 localStorage 模拟浏览器缓存
// 在真实场景中，这可以配合 HTTP Cache-Control 使用
const CACHE_PREFIX = 'mysite_cache_';
const CACHE_DURATION = 1000 * 60 * 60; // 1小时缓存

export const getCachedData = <T,>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  const cached = localStorage.getItem(CACHE_PREFIX + key);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log(`[Cache Hit] ${key}`);
        return Promise.resolve(data as T);
      }
    } catch (e) {
      console.warn('Cache parse error', e);
    }
  }

  return fetcher().then(data => {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Cache write error (likely quota exceeded)', e);
    }
    return data;
  });
};

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export const fetchPosts = async (params: PaginationParams = {}): Promise<BlogPost[]> => {
  const { skip = 0, limit = 12 } = params;
  return request<BlogPost[]>(`/blogs?published_only=true&skip=${skip}&limit=${limit}`);
};

export const fetchBlog = async (blogId: number): Promise<BlogPost> => {
  return request<BlogPost>(`/blogs/${blogId}`);
};

export const fetchPhotos = async (params: PaginationParams = {}): Promise<PhotoWork[]> => {
  const { skip = 0, limit = 18 } = params;
  return request<PhotoWork[]>(`/photos?skip=${skip}&limit=${limit}`);
};

export const fetchPhoto = async (photoId: number): Promise<PhotoWork> => {
  return request<PhotoWork>(`/photos/${photoId}`);
};

export const fetchAIProjects = async (params: PaginationParams = {}): Promise<AIProject[]> => {
  const { skip = 0, limit = 12 } = params;
  return request<AIProject[]>(`/ai-projects?published_only=true&skip=${skip}&limit=${limit}`);
};

export const fetchAIDemos = async (params: PaginationParams = {}): Promise<AIDemo[]> => {
  const { skip = 0, limit = 12 } = params;
  return request<AIDemo[]>(`/ai-demos?published_only=true&skip=${skip}&limit=${limit}`);
};

export const fetchAIImages = async (params: PaginationParams = {}): Promise<AIImage[]> => {
  const { skip = 0, limit = 12 } = params;
  return request<AIImage[]>(`/ai-images?published_only=true&skip=${skip}&limit=${limit}`);
};

export interface HomeOverview {
  blogs: BlogPost[];
  photos: PhotoWork[];
  projects: AIDemo[];
  stats: {
    blog_count: number;
    photo_count: number;
    project_count: number;
  };
}

export const fetchHomeOverview = async (): Promise<HomeOverview> => {
  return request<HomeOverview>('/home/overview');
};
