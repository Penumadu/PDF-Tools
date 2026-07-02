import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { Droplets } from 'lucide-react';

export const WatermarkImage: React.FC = () => {
  const tool = getToolBySlug('watermark-image')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    setFile(imageFiles[0]);
    setPreviewUrl(URL.createObjectURL(imageFiles[0]));
    setError(null);
  };

  const applyWatermark = () => {
    if (!file || !watermarkText) return;
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
          
          // Setup watermark style
          const fontSize = Math.max(20, Math.floor(canvas.width / 15));
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent white
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Add drop shadow for better visibility
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          // Draw text at the center
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 6); // Rotate slightly
          ctx.fillText(watermarkText, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              setResultUrl(URL.createObjectURL(blob));
            } else {
              setError('Failed to process image.');
            }
            setIsProcessing(false);
          }, file.type);
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
    setPreviewUrl(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`watermarked-${file?.name}`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="Watermark Added Successfully"
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to add watermark"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Adding Watermark..." />}

      {!isProcessing && !resultUrl && file && previewUrl && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 200, height: 200, margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#f1f5f9', borderRadius: 8, overflow: 'hidden'
            }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
              />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
          </div>

          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Watermark Text</label>
            <input 
              type="text" 
              className="text-input" 
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="e.g. CONFIDENTIAL"
            />
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyWatermark}
            style={{ background: tool.color }}
            disabled={!watermarkText.trim()}
          >
            Add Watermark
          </button>
        </div>
      )}
    </ToolPage>
  );
};
