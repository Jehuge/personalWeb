import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ScrollToTop } from './components/layout/ScrollToTop';
import Loader from './components/ui/Loader';

// Lazy load page components
const HomeView = React.lazy(() => import('./pages/HomeView').then(module => ({ default: module.HomeView })));
const BlogView = React.lazy(() => import('./pages/BlogView').then(module => ({ default: module.BlogView })));
const GalleryView = React.lazy(() => import('./pages/GalleryView').then(module => ({ default: module.GalleryView })));
const VideoView = React.lazy(() => import('./pages/VideoView').then(module => ({ default: module.VideoView })));
const AIImageGalleryView = React.lazy(() => import('./pages/AIImageGalleryView').then(module => ({ default: module.AIImageGalleryView })));
const AIDemoView = React.lazy(() => import('./pages/AIDemoView').then(module => ({ default: module.AIDemoView })));
const AIProjectListView = React.lazy(() => import('./pages/AIProjectListView').then(module => ({ default: module.AIProjectListView })));

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app-background relative min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-500 font-sans selection:bg-primary-500 selection:text-white overflow-hidden">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <React.Suspense fallback={<Loader fullscreen />}>
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/blog" element={<BlogView />} />
              <Route path="/blog/:id" element={<BlogView />} />
              <Route path="/gallery" element={<GalleryView />} />
              <Route path="/gallery/:id" element={<GalleryView />} />
              <Route path="/video" element={<VideoView />} />
              <Route path="/video/:id" element={<VideoView />} />
              <Route path="/ai-gallery" element={<AIImageGalleryView />} />
              <Route path="/ai-gallery/:id" element={<AIImageGalleryView />} />
              <Route path="/ai-demo" element={<AIDemoView />} />
              <Route path="/ai-project" element={<AIProjectListView />} />
            </Routes>
          </React.Suspense>
        </main>
        <Footer />
      </div>
      {!isHome && <ScrollToTop />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;