import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { Eraser } from 'lucide-react';

export const RemoveWatermarkImage: React.FC = () => {
  const tool = getToolBySlug('remove-watermark-image')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    setFile(imageFiles[0]);
    setError(null);
  };

  const applyRemoval = () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    // Mock processing delay for watermark removal simulation
    setTimeout(() => {
      setResultUrl(URL.createObjectURL(file));
      setIsProcessing(false);
    }, 2000);
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
      resultFilename={`clean-${file?.name}`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="Watermark Removed Successfully (Simulation)"
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to remove watermark"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Removing Watermark..." />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Eraser size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyRemoval}
            style={{ background: tool.color }}
          >
            Remove Watermark
          </button>
        </div>
      )}
    </ToolPage>
  );
};
