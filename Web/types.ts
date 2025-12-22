export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  cover_image?: string | null;
  is_published: boolean;
  view_count: number;
  category_id?: number | null;
  author_id?: number | null;
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;
  category?: BlogCategory | null;
  tags: BlogTag[];
  like_count?: number;
  dislike_count?: number;
}

export interface PhotoCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  cover_image?: string | null;
  created_at: string;
}

export interface PhotoExif {
  DateTimeOriginal?: string;
  CreateDate?: string;
  Make?: string;
  Model?: string;
  FocalLength?: string;
  FNumber?: string | number;
  ExposureTime?: string;
  ISO?: number;
  ISOSpeedRatings?: number;
  [key: string]: unknown;
}

export interface PhotoWork {
  id: number;
  title: string;
  description?: string | null;
  image_url: string;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  file_size?: number | null;
  category_id?: number | null;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at?: string | null;
  category?: PhotoCategory | null;
  exif?: PhotoExif | null;
  make?: string | null;
  model?: string | null;
  focal_length?: string | null;
  aperture?: string | null;
  shutter_speed?: string | null;
  iso?: string | number | null;
  shoot_time?: string | null;
  like_count?: number;
  dislike_count?: number;
}

export interface AIProject {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  content?: string | null;
  cover_image?: string | null;
  demo_url?: string | null;
  github_url?: string | null;
  tech_stack?: string | null;
  is_featured: boolean;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;
}

export interface AIDemo {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  cover_image?: string | null;
  category?: string | null;
  tags?: string | null;
  bundle_path?: string | null;
  entry_file?: string | null;
  external_url?: string | null;
  iframe_height?: number | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  view_count: number;
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;
}

export interface AIImage {
  id: number;
  title?: string;
  image_url: string;
  thumbnail_url?: string;
  prompt?: string;
  negative_prompt?: string;
  model_name?: string;
  parameters?: any;
  category?: string;
  tags?: string;
  is_featured: boolean;
  is_published: boolean;
  view_count: number;
  like_count?: number;
  dislike_count?: number;
  created_at: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface VideoCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  cover_image?: string | null;
  created_at: string;
}

export interface Video {
  id: number;
  title: string;
  description?: string | null;
  video_url: string;  // 原画
  thumbnail_video_url?: string | null;  // 缩略（最大压缩）
  video_url_480p?: string | null;  // 标清
  video_url_720p?: string | null;  // 高清
  cover_image?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  file_size?: number | null;  // 原画文件大小
  thumbnail_file_size?: number | null;
  video_url_480p_size?: number | null;  // 标清文件大小
  video_url_720p_size?: number | null;  // 高清文件大小
  format?: string | null;
  codec?: string | null;
  fps?: number | null;
  bitrate?: number | null;
  category_id?: number | null;
  is_featured: boolean;
  is_published: boolean;
  published_at?: string | null;
  view_count: number;
  created_at: string;
  updated_at?: string | null;
  category?: VideoCategory | null;
  like_count?: number;
  dislike_count?: number;
}
