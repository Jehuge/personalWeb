import React, { useState, useEffect } from 'react';
import { Menu, X, Github, Twitter, Linkedin, ExternalLink, Camera, Cpu, Terminal, ChevronDown } from 'lucide-react';
import { PROJECTS, BLOG_POSTS, PHOTOS } from './constants';
import { AIChatWidget } from './components/AIChatWidget';

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-cyber-accent/30 selection:text-white overflow-x-hidden">
      
      {/* Navigation */}
      <nav className={`fixed w-full z-40 transition-all duration-300 ${
        scrolled ? 'bg-cyber-dark/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="text-2xl font-display font-bold tracking-tighter text-white">
            NEXUS<span className="text-cyber-accent">.IO</span>
          </div>
          
          <div className="hidden md:flex gap-8 items-center text-sm font-medium text-slate-300">
            {['About', 'Projects', 'Photography', 'Blog'].map((item) => (
              <button 
                key={item}
                onClick={() => scrollToSection(item.toLowerCase())}
                className="hover:text-cyber-accent transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyber-accent transition-all duration-300 group-hover:w-full"></span>
              </button>
            ))}
          </div>

          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-30 bg-cyber-dark pt-24 px-6 md:hidden">
          <div className="flex flex-col gap-6 text-xl font-display text-white">
             {['About', 'Projects', 'Photography', 'Blog'].map((item) => (
              <button 
                key={item}
                onClick={() => scrollToSection(item.toLowerCase())}
                className="text-left py-2 border-b border-white/10"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section id="about" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-glow/20 rounded-full blur-[128px] animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-accent/10 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-cyber-accent/30 bg-cyber-accent/5 text-cyber-accent text-xs font-semibold tracking-widest uppercase animate-in fade-in slide-in-from-bottom-4 duration-1000">
            System Online
          </div>
          <h1 className="text-5xl md:text-8xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            EXPLORING THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent to-cyber-glow">DIGITAL FRONTIER</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            I'm a Full Stack Engineer & Sci-Fi Creative based in the Grid. 
            Merging cutting-edge AI with aesthetic design to build the future.
          </p>
          
          <div className="flex justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <a href="#" className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyber-accent/50 hover:text-cyber-accent transition-all">
              <Github className="w-6 h-6" />
            </a>
            <a href="#" className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyber-accent/50 hover:text-cyber-accent transition-all">
              <Twitter className="w-6 h-6" />
            </a>
            <a href="#" className="p-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyber-accent/50 hover:text-cyber-accent transition-all">
              <Linkedin className="w-6 h-6" />
            </a>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-slate-500">
             <ChevronDown />
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-24 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-16">
            <div className="p-3 bg-cyber-accent/10 rounded-xl">
              <Cpu className="w-6 h-6 text-cyber-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">AI & Tech Projects</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PROJECTS.map((project) => (
              <div key={project.id} className="group relative bg-slate-900 border border-white/5 rounded-2xl overflow-hidden hover:border-cyber-accent/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={project.imageUrl} 
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-mono text-white border border-white/10">
                    {project.category}
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyber-accent transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.techStack.map(tech => (
                      <span key={tech} className="text-xs font-mono text-cyber-accent bg-cyber-accent/5 px-2 py-1 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <a href={project.link || "#"} className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-cyber-accent transition-colors">
                    View Project <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photography Section */}
      <section id="photography" className="py-24 bg-cyber-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyber-glow/10 rounded-xl">
                <Camera className="w-6 h-6 text-cyber-glow" />
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Visual Archives</h2>
            </div>
            <p className="text-slate-400 max-w-md text-right md:text-right text-left">
              Capturing the intersection of humanity and technology across the globe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[300px]">
            {PHOTOS.map((photo, index) => (
              <div 
                key={photo.id} 
                className={`group relative rounded-2xl overflow-hidden ${index === 1 || index === 2 ? 'lg:col-span-2' : ''}`}
              >
                <img 
                  src={photo.url} 
                  alt={photo.caption}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <span className="text-cyber-glow text-xs font-mono mb-1">{photo.location}</span>
                  <h3 className="text-white font-bold">{photo.caption}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-24 bg-slate-950 relative border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-16 justify-center">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Terminal className="w-6 h-6 text-emerald-500" />
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Transmission Logs</h2>
          </div>

          <div className="space-y-6">
            {BLOG_POSTS.map((post) => (
              <article key={post.id} className="group relative bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-emerald-500/30 p-8 rounded-3xl transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-900">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-slate-500 font-mono">{post.date} • {post.readTime}</span>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
                
                <a href="#" className="inline-flex items-center text-emerald-500 font-medium hover:text-emerald-400">
                  Read Transmission <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black border-t border-white/10 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-2xl font-display font-bold tracking-tighter text-white mb-6">
            NEXUS<span className="text-cyber-accent">.IO</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Nexus Portfolio. Built with React, Tailwind, and Gemini AI.
          </p>
        </div>
      </footer>

      {/* AI Widget */}
      <AIChatWidget />
    </div>
  );
};

export default App;
