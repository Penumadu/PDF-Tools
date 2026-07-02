import React from 'react';
import { Link } from 'react-router-dom';
import { FileType, Shield } from 'lucide-react';
import { categories, getToolsByCategory } from '../data/tools';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <Link to="/" className="header-logo" style={{ color: 'white', marginBottom: 8 }}>
              <div className="header-logo-icon">
                <FileType size={18} />
              </div>
              Srini PDF Studio Pro
            </Link>
            <p className="footer-brand-text">
              A free, browser-based solution to all your PDF needs. No file uploads — everything is processed securely on your device.
            </p>
          </div>

          {categories.slice(0, 4).map(cat => {
            const catTools = getToolsByCategory(cat.id);
            return (
              <div key={cat.id}>
                <div className="footer-col-title">{cat.name}</div>
                {catTools.map(tool => (
                  <Link key={tool.id} to={`/tool/${tool.slug}`} className="footer-link">
                    {tool.name}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-text">
            © {new Date().getFullYear()} Srini PDF Studio Pro. All processing happens locally in your browser.
          </div>
          <div className="footer-security-badge">
            <Shield size={16} />
            100% Secure — No files leave your device
          </div>
        </div>
      </div>
    </footer>
  );
};
