import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { formatFileSize } from '../utils/pdfUtils';
import { ImageMinus } from 'lucide-react';

export const CompressImage: React.FC = () => {
  const tool = getToolBySlug('compress-image')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [quality, setQuality] = useState<number>(0.7);

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    setFile(imageFiles[0]);
    setOriginalSize(imageFiles[0].size);
    setError(null);
  };

  const applyCompression = () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Only JPEG and WebP support quality parameter
          const mimeType = file.type === 'image/png' ? 'image/jpeg' : file.type;
          
          canvas.toBlob((blob) => {
            if (blob) {
              setCompressedSize(blob.size);
              setResultUrl(URL.createObjectURL(blob));
            } else {
              setError('Failed to compress image.');
            }
            setIsProcessing(false);
          }, mimeType, quality);
        } else {
          setError('Canvas not supported.');
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setError('Failed to load image.');
        setIsProcessing(false);
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
    setOriginalSize(0);
    setCompressedSize(0);
  };

  const savingsPercent = originalSize && compressedSize 
    ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
    : 0;

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`compressed-${file?.name.replace(/\.[^/.]+$/, "")}.jpg`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage={savingsPercent > 0 ? `Saved ${savingsPercent}%!` : "Optimization Complete"}
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to compress"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Compressing Image..." />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <ImageMinus size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
            <p style={{ color: 'var(--text-secondary)' }}>Original size: {formatFileSize(originalSize)}</p>
          </div>

          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Quality ({Math.round(quality * 100)}%)</span>
              <span style={{ color: 'var(--text-muted)' }}>Lower is smaller file</span>
            </label>
            <input 
              type="range" 
              className="range-slider" 
              min="0.1" max="1" step="0.05"
              value={quality} 
              onChange={e => setQuality(Number(e.target.value))} 
            />
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyCompression}
            style={{ background: tool.color }}
          >
            Compress Image
          </button>
        </div>
      )}
    </ToolPage>
  );
};
