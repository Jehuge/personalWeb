import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { HomeView } from './pages/HomeView';
import { BlogView } from './pages/BlogView';
import { GalleryView } from './pages/GalleryView';
import { VideoView } from './pages/VideoView';
import { AIImageGalleryView } from './pages/AIImageGalleryView';
import { AIDemoView } from './pages/AIDemoView';
import { AIProjectListView } from './pages/AIProjectListView';

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app-background relative min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-500 font-sans selection:bg-primary-500 selection:text-white overflow-hidden">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
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