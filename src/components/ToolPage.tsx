import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Download } from 'lucide-react';
import type { ToolInfo } from '../data/tools';

interface ToolPageProps {
  tool: ToolInfo;
  children: React.ReactNode;
  resultUrl?: string | null;
  resultFilename?: string;
  onDownload?: () => void;
  onReset?: () => void;
  showResult?: boolean;
  resultMessage?: string;
}

export const ToolPage: React.FC<ToolPageProps> = ({
  tool,
  children,
  resultUrl,
  resultFilename,
  onDownload,
  onReset,
  showResult = false,
  resultMessage = 'Your file is ready!',
}) => {
  const Icon = tool.icon;

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (resultUrl) {
      const a = document.createElement('a');
      a.href = resultUrl;
      a.download = resultFilename || 'download.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="tool-page">
      <Link to="/" className="tool-page-back">
        <ArrowLeft size={16} />
        All Tools
      </Link>

      <div className="tool-page-header">
        <div className="tool-page-icon" style={{ background: tool.colorLight, color: tool.color }}>
          <Icon size={32} />
        </div>
        <h1 className="tool-page-title">{tool.name}</h1>
        <p className="tool-page-subtitle">{tool.description}</p>
      </div>

      {showResult ? (
        <div className="result-section">
          <div className="result-icon">
            <CheckCircle size={28} />
          </div>
          <div className="result-title">{resultMessage}</div>
          <div className="result-subtitle">Your file has been processed successfully</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-success btn-lg" onClick={handleDownload}>
              <Download size={20} />
              Download
            </button>
            {onReset && (
              <button className="btn btn-secondary btn-lg" onClick={onReset}>
                Process Another File
              </button>
            )}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};
