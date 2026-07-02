import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { Replace } from 'lucide-react';

export const ConvertImage: React.FC = () => {
  const tool = getToolBySlug('convert-image')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file.');
      return;
    }
    setFile(imageFiles[0]);
    setError(null);
  };

  const applyConversion = () => {
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
          canvas.toBlob((blob) => {
            if (blob) {
              setResultUrl(URL.createObjectURL(blob));
            } else {
              setError('Failed to convert image format.');
            }
            setIsProcessing(false);
          }, targetFormat);
        } else {
          setError('Canvas not supported.');
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setError('Failed to load image.');
        setIsProcessing(false);
      };
      if (e.target?.result) img.src = e.target.result as string;
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
  };

  const getExtension = (mimeType: string) => {
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'img';
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`converted-${file?.name.replace(/\.[^/.]+$/, "")}.${getExtension(targetFormat)}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to convert"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Converting Format..." />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Replace size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
            <p style={{ color: 'var(--text-secondary)' }}>Format: {file.type}</p>
          </div>

          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Convert To</label>
            <select 
              className="select-input" 
              value={targetFormat} 
              onChange={e => setTargetFormat(e.target.value as any)}
            >
              <option value="image/jpeg">JPG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WebP</option>
            </select>
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyConversion}
            style={{ background: tool.color }}
          >
            Convert Image
          </button>
        </div>
      )}
    </ToolPage>
  );
};
