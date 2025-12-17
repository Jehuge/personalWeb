import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AIProject } from '../types';
import { fetchAIProjects, fetchAIProject } from '../services/dataService';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<AIProject | null>(null);
  
  // 使用 useRef 防止组件意外重新挂载导致的重复请求
  const hasLoadedRef = useRef(false);
  const hasScrolledToTopRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // 组件挂载时滚动到顶部（只执行一次）
  useEffect(() => {
    if (!hasScrolledToTopRef.current) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      hasScrolledToTopRef.current = true;
    }
  }, []);

  // 检测页面刷新：如果是首次加载且 URL 中有 projectId，清除它（只保留从其他页面导航过来的情况）
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      const projectIdParam = searchParams.get('projectId');
      
      if (!projectIdParam) return;
      
      // 检测是否是页面刷新
      // 使用 PerformanceNavigationTiming API 检测导航类型
      let isPageRefresh = false;
      try {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry) {
          // type 为 'reload' 表示刷新
          isPageRefresh = navEntry.type === 'reload';
        }
      } catch (e) {
        // API 不可用时，使用 referrer 判断
        // 如果 referrer 是当前页面（包含 /ai-project），可能是刷新
        // 如果 referrer 是其他页面（如首页），则是导航过来的
        const referrer = document.referrer;
        const currentPath = window.location.pathname;
        // referrer 为空或 referrer 包含当前路径，可能是刷新
        // referrer 不包含当前路径，说明是从其他页面导航过来的
        isPageRefresh = !referrer || 
          (referrer.includes(window.location.origin) && referrer.includes(currentPath));
      }
      
      if (isPageRefresh) {
        // 页面刷新时清除 projectId 参数
        const params = new URLSearchParams(searchParams);
        params.delete('projectId');
        setSearchParams(params, { replace: true });
        setSelectedProject(null);
        return;
      }
    }
  }, []);

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

  // 跟踪最近获取过详情的项目 ID，避免重复调用 API
  const lastFetchedProjectIdRef = useRef<number | null>(null);
  
  // 根据 URL projectId 参数选择项目
  useEffect(() => {
    // 跳过首次加载时的处理（已经在上面的 useEffect 中处理了刷新情况）
    if (isInitialMountRef.current) return;
    
    const projectIdParam = searchParams.get('projectId');
    if (projectIdParam && projects.length > 0) {
      const projectId = parseInt(projectIdParam, 10);
      if (!isNaN(projectId)) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          // 只有当当前选中的项目不同时才更新，避免重复设置导致闪烁
          if (selectedProject?.id !== projectId) {
            // 如果刚刚获取过这个项目，直接使用；否则调用 API 更新浏览次数
            if (lastFetchedProjectIdRef.current === projectId) {
              setSelectedProject(project);
            } else {
              // 调用 API 获取最新数据（包括更新的浏览次数）
              lastFetchedProjectIdRef.current = projectId;
              fetchAIProject(projectId)
                .then(updatedProject => {
                  setSelectedProject(updatedProject);
                  // 更新列表中的数据，以便显示最新的浏览次数
                  setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
                })
                .catch(error => {
                  console.error('Failed to fetch project details:', error);
                  // 如果获取失败，仍然使用列表中的数据
                  setSelectedProject(project);
                });
            }
            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }
    } else {
      // 如果没有 projectId 参数，清除选中的项目
      if (selectedProject !== null) {
        setSelectedProject(null);
        lastFetchedProjectIdRef.current = null;
      }
    }
  }, [searchParams, projects]);

  // 关闭模态框并清除 URL 参数
  const handleCloseModal = () => {
    setSelectedProject(null);
    const params = new URLSearchParams(searchParams);
    params.delete('projectId');
    setSearchParams(params);
  };

  if (projectsLoading) {
    return <Loader fullscreen />;
  }

  return (
    <div className="max-w-7xl mx-auto py-20 px-4 md:px-6">
      <div className="text-center mb-16 animate-fade-in">
        <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 mb-4">
          个人项目
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          个人项目与实验性探索。
        </p>
      </div>

      <section className="mb-16 animate-fade-in">
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group w-full bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-md dark:shadow-lg hover:shadow-xl hover:shadow-gray-500/15 transition-all hover:-translate-y-1 flex flex-col cursor-pointer"
              onClick={() => {
                setSelectedProject(project);
                // 更新 URL 参数，保持 URL 和状态同步
                const params = new URLSearchParams(searchParams);
                params.set('projectId', String(project.id));
                setSearchParams(params);
              }}
            >
              <div className="p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${project.is_published ? 'bg-gray-500/10 text-gray-700 dark:text-gray-300' : 'bg-gray-200 text-gray-500'}`}>
                  {project.is_published ? '已发布' : '草稿'}
                </span>
              </div>
              <div className="mb-4 rounded-xl overflow-hidden h-48 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border border-dashed border-gray-200/80 dark:border-gray-700/80 flex items-center justify-center">
                {project.cover_image ? (
                  <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-sm flex flex-col items-center gap-2">
                    <svg
                      className="w-10 h-10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="14" rx="2" ry="2" />
                      <path d="M3 13l4-4 3 3 4-4 5 5" />
                      <path d="M14 14h0.01" />
                    </svg>
                    <span>暂无封面</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed line-clamp-3">
                {project.description || '暂无简介'}
              </p>
              <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  {project.view_count || 0} 次浏览
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {parseTechStack(project.tech_stack).slice(0, 4).map((stack) => (
                  <span key={stack} className="px-3 py-1 text-xs rounded-full bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200">
                    {stack}
                  </span>
                ))}
              </div>
              <div className="flex gap-3 mt-auto">
                {project.github_url && (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-github w-full justify-center"
                  >
                    GitHub
                  </a>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && !projectsLoading && (
          <div className="p-10 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-3xl">
            暂无公开的个人项目，敬请期待。
          </div>
        )}
      </section>

      {/* 项目详情模态框 */}
      {selectedProject && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProject.title}</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {selectedProject.cover_image && (
                <div className="mb-4 rounded-xl overflow-hidden">
                  <img src={selectedProject.cover_image} alt={selectedProject.title} className="w-full h-auto" />
                </div>
              )}

              {selectedProject.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {selectedProject.description}
                </p>
              )}

              {selectedProject.content && (
                <div className="mb-4 prose dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedProject.content }} />
                </div>
              )}

              {parseTechStack(selectedProject.tech_stack).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">技术栈</h3>
                  <div className="flex flex-wrap gap-2">
                    {parseTechStack(selectedProject.tech_stack).map((stack) => (
                      <span key={stack} className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {stack}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {selectedProject.view_count || 0} 次浏览
                </span>
              </div>

              <div className="flex gap-3">
                {selectedProject.github_url && (
                  <a
                    href={selectedProject.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                  >
                    GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

