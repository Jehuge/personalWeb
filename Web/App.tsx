import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { Navbar } from './components/Navbar';
import { BlogView } from './components/BlogView';
import { GalleryView } from './components/GalleryView';
import { AIProjectView } from './components/AIProjectView';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { BackgroundFX } from './components/BackgroundFX';
import { ScrollToTop } from './components/ScrollToTop';

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={`relative min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-500 font-sans selection:bg-primary-500 selection:text-white overflow-hidden ${
      isHome ? 'bg-gray-50 dark:bg-cyber-dark' : 'bg-[#eef2ff] dark:bg-[#050812]'
    }`}>
      {!isHome && (
        <>
          <BackgroundFX />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.25),_transparent_60%)]"></div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 opacity-30 blur-3xl bg-gradient-to-br from-primary-500/30 to-purple-500/20"></div>
        </>
      )}
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className={`flex-1 ${isHome ? '' : 'pt-4'}`}>
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