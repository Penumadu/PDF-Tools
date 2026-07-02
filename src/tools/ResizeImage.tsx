import React, { useState, useEffect } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { Maximize2 } from 'lucide-react';

export const ResizeImage: React.FC = () => {
  const tool = getToolBySlug('resize-image')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [maintainRatio, setMaintainRatio] = useState(true);

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file.');
      return;
    }
    const selectedFile = imageFiles[0];
    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImgObj(img);
        setWidth(img.width);
        setHeight(img.height);
      };
      if (e.target?.result) img.src = e.target.result as string;
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainRatio && imgObj) {
      setHeight(Math.round(val * (imgObj.height / imgObj.width)));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainRatio && imgObj) {
      setWidth(Math.round(val * (imgObj.width / imgObj.height)));
    }
  };

  const applyResize = () => {
    if (!file || !imgObj || width <= 0 || height <= 0) return;

    setIsProcessing(true);
    setError(null);

    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgObj, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              setResultUrl(URL.createObjectURL(blob));
            } else {
              setError('Failed to resize image.');
            }
            setIsProcessing(false);
          }, file.type);
        } else {
          setError('Canvas not supported.');
          setIsProcessing(false);
        }
      } catch (err) {
        setError('Error processing image.');
        setIsProcessing(false);
      }
    }, 100);
  };

  const reset = () => {
    setFile(null);
    setImgObj(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`resized-${file?.name || 'image.png'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to resize"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Resizing Image..." />}

      {!isProcessing && !resultUrl && file && imgObj && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Maximize2 size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
            <p style={{ color: 'var(--text-secondary)' }}>Original: {imgObj.width} x {imgObj.height} px</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="input-group">
              <label className="input-label">Width (px)</label>
              <input 
                type="number" 
                className="text-input" 
                value={width} 
                onChange={e => handleWidthChange(Number(e.target.value))} 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Height (px)</label>
              <input 
                type="number" 
                className="text-input" 
                value={height} 
                onChange={e => handleHeightChange(Number(e.target.value))} 
              />
            </div>
          </div>

          <label className="radio-label" style={{ marginBottom: 24 }}>
            <input 
              type="checkbox" 
              checked={maintainRatio} 
              onChange={e => setMaintainRatio(e.target.checked)} 
            />
            Maintain Aspect Ratio
          </label>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyResize}
            style={{ background: tool.color }}
          >
            Resize Image
          </button>
        </div>
      )}
    </ToolPage>
  );
};
