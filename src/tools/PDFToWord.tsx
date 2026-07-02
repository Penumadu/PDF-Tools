import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';

export const PDFToWord: React.FC = () => {
  const tool = getToolBySlug('pdf-to-word')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    setFile(files[0]);
    setError(null);
  };

  const processFile = () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    // Mock processing delay
    setTimeout(() => {
      setResultUrl(URL.createObjectURL(file));
      setIsProcessing(false);
    }, 1500);
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`processed-${file?.name}`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="Processing Complete (Simulation)"
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="*/*"
          label={`Drop file here for ${tool.name}`}
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message={`${tool.name} in progress...`} />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <tool.icon size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={processFile}
            style={{ background: tool.color }}
          >
            Start {tool.name}
          </button>
        </div>
      )}
    </ToolPage>
  );
};
