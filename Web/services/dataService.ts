import { AIDemo, AIImage, AIProject, BlogPost, PhotoWork, PhotoCategory } from '../types';

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

// 带总数信息的请求（用于分页）
interface PaginatedResponse<T> {
  data: T;
  total: number;
}

const requestWithTotal = async <T>(path: string, options: RequestInit = {}): Promise<PaginatedResponse<T>> => {
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

  const data = await response.json() as T;
  const totalCount = response.headers.get('X-Total-Count');
  const total = totalCount ? parseInt(totalCount, 10) : 0;

  return { data, total };
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
  fw_access_code?: string;
  category_id?: number;
}

// 统一限制分页参数，避免客户端传入过大 limit/负 skip
const clampPagination = (params: PaginationParams, maxLimit: number) => {
  const safeLimit = Math.max(1, Math.min(params.limit ?? maxLimit, maxLimit));
  const safeSkip = Math.max(0, params.skip ?? 0);
  return { ...params, limit: safeLimit, skip: safeSkip };
};

export const fetchPosts = async (params: PaginationParams = {}): Promise<PaginatedResponse<BlogPost[]>> => {
  const { skip, limit } = clampPagination(params, 20);
  return requestWithTotal<BlogPost[]>(`/blogs?published_only=true&skip=${skip}&limit=${limit}`);
};

export const fetchBlog = async (blogId: number): Promise<BlogPost> => {
  return request<BlogPost>(`/blogs/${blogId}`);
};

export const fetchPhotos = async (params: PaginationParams = {}): Promise<PaginatedResponse<PhotoWork[]>> => {
  const { skip, limit, category_id } = clampPagination(params, 20);
  let url = `/photos?skip=${skip}&limit=${limit}`;
  if (category_id !== undefined) {
    url += `&category_id=${category_id}`;
  }
  return requestWithTotal<PhotoWork[]>(url);
};

export const fetchPhotoCategories = async (): Promise<PhotoCategory[]> => {
  return request<PhotoCategory[]>('/photos/categories');
};

export const fetchPhoto = async (photoId: number): Promise<PhotoWork> => {
  return request<PhotoWork>(`/photos/${photoId}`);
};

export const fetchAIProjects = async (params: PaginationParams = {}): Promise<AIProject[]> => {
  const { skip, limit } = clampPagination(params, 20);
  return request<AIProject[]>(`/ai-projects?published_only=true&skip=${skip}&limit=${limit}`);
};

export const fetchAIProject = async (projectId: number): Promise<AIProject> => {
  return request<AIProject>(`/ai-projects/${projectId}`);
};

export const fetchAIDemos = async (params: PaginationParams = {}): Promise<PaginatedResponse<AIDemo[]>> => {
  const { skip, limit } = clampPagination(params, 20);
  return requestWithTotal<AIDemo[]>(`/ai-demos?published_only=true&skip=${skip}&limit=${limit}`);
};

export const fetchAIImages = async (params: PaginationParams = {}): Promise<PaginatedResponse<AIImage[]>> => {
  const { skip, limit, fw_access_code } = clampPagination(params, 20);
  const url = `/ai-images?published_only=true&skip=${skip}&limit=${limit}`;
  // 将访问码通过 Header 传递，而不是 URL 参数，更安全
  const headers: Record<string, string> = {};
  if (fw_access_code) {
    headers['X-FW-Access-Code'] = fw_access_code;
  }
  return requestWithTotal<AIImage[]>(url, { headers });
};

export const fetchAIImage = async (imageId: number): Promise<AIImage> => {
  return request<AIImage>(`/ai-images/${imageId}`);
};

export interface HomeOverview {
  blogs: BlogPost[];
  photos: PhotoWork[];
  ai_images: AIImage[];
  ai_demos: AIDemo[];
  ai_projects: AIProject[];
  stats: {
    blog_count: number;
    photo_count: number;
    ai_image_count: number;
    ai_demo_count: number;
    ai_project_count: number;
  };
}

export const fetchHomeOverview = async (): Promise<HomeOverview> => {
  return request<HomeOverview>('/home/overview');
};
