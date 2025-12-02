import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { Navbar } from './components/Navbar';
import { BlogView } from './components/BlogView';
import { GalleryView } from './components/GalleryView';
import { AIProjectView } from './components/AIProjectView';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { ScrollToTop } from './components/ScrollToTop';

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app-background relative min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-500 font-sans selection:bg-primary-500 selection:text-white overflow-hidden">
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pt-20">
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/blog" element={<BlogView />} />
            <Route path="/blog/:id" element={<BlogView />} />
            <Route path="/gallery" element={<GalleryView />} />
            <Route path="/gallery/:id" element={<GalleryView />} />
            <Route path="/ai" element={<AIProjectView />} />
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