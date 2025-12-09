import React, { useEffect, useRef, useState } from 'react';
import { AIProject } from '../types';
import { fetchAIProjects } from '../services/dataService';
import Loader from './Loader';

const parseTechStack = (stack?: string | null) => {
  if (!stack) return [];
  try {
    const maybeJson = JSON.parse(stack);
    if (Array.isArray(maybeJson)) {
      return maybeJson.map((item) => String(item));
    }
  } catch {
    // not JSON, fall back to comma split
  }
  return stack
    .split(/[,，·\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const AIProjectListView: React.FC = () => {
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  // 使用 useRef 防止组件意外重新挂载导致的重复请求
  const hasLoadedRef = useRef(false);

  // 初始加载 Projects
  useEffect(() => {
    // 如果已经加载过，直接返回（防止 StrictMode 或组件重新挂载导致的重复请求）
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;

    const loadProjects = async () => {
      const MIN_LOADING_MS = 900;
      const start = performance.now();
      setProjectsLoading(true);
      try {
        const data = await fetchAIProjects({ skip: 0, limit: 12 });
        setProjects(data);
      } catch (err) {
        console.error('Failed to load AI projects', err);
        // 请求失败时重置标志，允许重试
        hasLoadedRef.current = false;
      } finally {
        const elapsed = performance.now() - start;
        const remaining = MIN_LOADING_MS - elapsed;
        if (remaining > 0) {
          setTimeout(() => setProjectsLoading(false), remaining);
        } else {
          setProjectsLoading(false);
        }
      }
    };
    loadProjects();
  }, []);

  if (projectsLoading) {
    return <Loader fullscreen />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-cyan-500 to-pink-500 mb-4">
          个人项目
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          个人项目与实验性探索。
        </p>
      </div>

      <section className="mb-16 animate-fade-in">
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <div key={project.id} className="glass-card p-6 rounded-3xl border border-transparent hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${project.is_published ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-200 text-gray-500'}`}>
                  {project.is_published ? '已发布' : '草稿'}
                </span>
              </div>
              {project.cover_image && (
                <div className="mb-4 rounded-xl overflow-hidden h-48">
                  <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">
                {project.description || '暂无简介'}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {parseTechStack(project.tech_stack).slice(0, 4).map((stack) => (
                  <span key={stack} className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    {stack}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 mt-auto">
                {project.demo_url && (
                  <a
                    href={project.demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 transition-transform hover:scale-105"
                  >
                    在线体验
                  </a>
                )}
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    GitHub
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && !projectsLoading && (
          <div className="p-10 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-3xl">
            暂无公开的 AI 项目，敬请期待。
          </div>
        )}
      </section>
    </div>
  );
};

