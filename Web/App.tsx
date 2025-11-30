import React, { useState } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { Navbar } from './components/Navbar';
import { BlogView } from './components/BlogView';
import { GalleryView } from './components/GalleryView';
import { AIProjectView } from './components/AIProjectView';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { BackgroundFX } from './components/BackgroundFX';
import { ScrollToTop } from './components/ScrollToTop';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showBack, setShowBack] = useState(false);
  const [backLabel, setBackLabel] = useState('返回');

  const handleBack = () => {
    // 如果在博客详情页，通过自定义事件触发返回
    if (showBack && activeTab === 'blog') {
      window.dispatchEvent(new CustomEvent('blogViewGoBack'));
    } else {
      setActiveTab('home');
      setShowBack(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'blog':
        return (
          <BlogView
            onDetailChange={(isInDetail) => {
              setShowBack(isInDetail);
              setBackLabel(isInDetail ? '返回博客列表' : '返回');
            }}
          />
        );
      case 'gallery':
        return <GalleryView />;
      case 'ai':
        return <AIProjectView />;
      case 'home':
      default:
        return <HomeView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <ThemeProvider>
      <div className="relative min-h-screen bg-[#eef2ff] dark:bg-[#050812] text-gray-900 dark:text-gray-100 transition-colors duration-500 font-sans selection:bg-primary-500 selection:text-white overflow-hidden">
        <BackgroundFX />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.25),_transparent_60%)]"></div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 opacity-30 blur-3xl bg-gradient-to-br from-primary-500/30 to-purple-500/20"></div>
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showBack={showBack}
            onBack={handleBack}
            backLabel={backLabel}
          />
          <main className="flex-1 pt-4">
            {renderContent()}
          </main>
          <Footer />
        </div>
        <ScrollToTop />
      </div>
    </ThemeProvider>
  );
}

export default App;