import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileType, ChevronDown, Menu, X } from 'lucide-react';
import { categories, getToolsByCategory } from '../data/tools';

export const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <div className="header-logo-icon">
            <FileType size={20} />
          </div>
          Srini PDF Studio Pro
        </Link>

        <nav className={`header-nav ${mobileOpen ? 'mobile-open' : ''}`}>
          <div className="mega-menu-trigger">
            <button className="header-nav-item">
              Tools <ChevronDown size={14} />
            </button>
            <div className="mega-menu">
              <div className="mega-menu-grid">
                {categories.map(cat => {
                  const catTools = getToolsByCategory(cat.id);
                  return (
                    <div key={cat.id}>
                      <div className="mega-menu-category-title" style={{ color: cat.color }}>
                        {cat.name}
                      </div>
                      {catTools.map(tool => {
                        const Icon = tool.icon;
                        return (
                          <Link
                            key={tool.id}
                            to={`/tool/${tool.slug}`}
                            className="mega-menu-item"
                            onClick={() => setMobileOpen(false)}
                          >
                            <div
                              className="mega-menu-item-icon"
                              style={{ background: tool.colorLight, color: tool.color }}
                            >
                              <Icon size={16} />
                            </div>
                            {tool.name}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Link to="/tool/compress-pdf" className="header-nav-item" onClick={() => setMobileOpen(false)}>
            Compress
          </Link>
          <Link to="/tool/merge-pdf" className="header-nav-item" onClick={() => setMobileOpen(false)}>
            Merge
          </Link>
          <Link to="/tool/edit-pdf" className="header-nav-item" onClick={() => setMobileOpen(false)}>
            Edit
          </Link>
          <Link to="/tool/sign-pdf" className="header-nav-item" onClick={() => setMobileOpen(false)}>
            Sign
          </Link>
        </nav>

        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
};
