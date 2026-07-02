import React, { useState, useMemo } from 'react';
import { Search, Shield, Zap, Lock } from 'lucide-react';
import { ToolCard } from '../components/ToolCard';
import { categories, tools, getToolsByCategory } from '../data/tools';

export const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    return categories.filter(cat => {
      const catTools = getToolsByCategory(cat.id);
      return catTools.some(
        t =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  const getFilteredTools = (categoryId: string) => {
    const catTools = tools.filter(t => t.category === categoryId);
    if (!searchQuery.trim()) return catTools;
    return catTools.filter(
      t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>
            All-in-One <span className="hero-gradient-text">PDF Tools</span>
          </h1>
          <p>
            Every tool you need to work with PDFs in one place. Merge, split, compress,
            convert, edit, sign, and more — all processed securely in your browser.
          </p>

          <div className="search-bar-container">
            <Search size={20} className="search-bar-icon" />
            <input
              type="text"
              className="search-bar"
              placeholder="Search for a tool... (e.g. merge, compress, sign)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="tools-section">
        {filteredCategories.map(cat => {
          const catTools = getFilteredTools(cat.id);
          if (catTools.length === 0) return null;
          return (
            <div key={cat.id} className="tools-category">
              <div className="tools-category-header">
                <div className="tools-category-dot" style={{ background: cat.color }} />
                <span className="tools-category-title">{cat.name}</span>
                <span className="tools-category-count">{catTools.length} tools</span>
              </div>
              <div className="tools-grid">
                {catTools.map(tool => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center" style={{ padding: '60px 0' }}>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
              No tools found for "{searchQuery}". Try a different search term.
            </p>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="features-inner">
          <h2 className="features-title">Why Srini PDF Studio Pro?</h2>
          <p className="features-subtitle">
            Professional-grade PDF tools that work entirely in your browser. No uploads, no servers, no data collection.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                <Shield size={24} />
              </div>
              <h3>100% Private & Secure</h3>
              <p>
                All processing happens locally in your browser. Your files never leave your
                device — no uploads, no servers, no third-party access.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                <Zap size={24} />
              </div>
              <h3>Lightning Fast</h3>
              <p>
                No waiting for server processing. Everything runs instantly on your machine
                with modern browser APIs and WebAssembly.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
                <Lock size={24} />
              </div>
              <h3>21 Professional Tools</h3>
              <p>
                From merging and splitting to signing and encrypting — everything you need
                for complete PDF workflow management.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
