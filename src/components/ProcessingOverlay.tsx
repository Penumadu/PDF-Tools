import React from 'react';

interface ProcessingOverlayProps {
  message?: string;
  progress?: number;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  message = 'Processing...',
  progress,
}) => {
  return (
    <div className="processing-overlay">
      <div className="spinner" />
      <div className="processing-text">{message}</div>
      {progress !== undefined && (
        <div className="progress-bar-container" style={{ maxWidth: 300 }}>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};
