import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { RotateCw, RotateCcw } from 'lucide-react';

export const RotateImage: React.FC = () => {
  const tool = getToolBySlug('rotate-image')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    setFile(imageFiles[0]);
    setPreviewUrl(URL.createObjectURL(imageFiles[0]));
    setRotation(0);
    setError(null);
  };

  const applyRotation = () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions based on rotation
        const isRotated90or270 = Math.abs(rotation) % 180 === 90;
        canvas.width = isRotated90or270 ? img.height : img.width;
        canvas.height = isRotated90or270 ? img.width : img.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          
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
    setRotation(0);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`rotated-${file?.name}`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="Image Rotated Successfully"
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to rotate"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Rotating Image..." />}

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
                style={{ 
                  maxWidth: '100%', maxHeight: '100%', 
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease'
                }} 
              />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center' }}>
            <button 
              className="btn btn-outline"
              onClick={() => setRotation(r => r - 90)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RotateCcw size={18} /> Left 90°
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => setRotation(r => r + 90)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RotateCw size={18} /> Right 90°
            </button>
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyRotation}
            style={{ background: tool.color }}
          >
            Apply Rotation
          </button>
        </div>
      )}
    </ToolPage>
  );
};
