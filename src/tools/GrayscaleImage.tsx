import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { Palette } from 'lucide-react';

export const GrayscaleImage: React.FC = () => {
  const tool = getToolBySlug('grayscale-image')!;
  
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

  const applyGrayscale = () => {
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
          // Draw image
          ctx.drawImage(img, 0, 0);
          
          // Apply grayscale
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;     // red
            data[i + 1] = avg; // green
            data[i + 2] = avg; // blue
          }
          ctx.putImageData(imageData, 0, 0);
          
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
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`grayscale-${file?.name.replace(/\.[^/.]+$/, "")}.jpg`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="Grayscale Filter Applied"
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to convert to grayscale"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Applying Grayscale..." />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Palette size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyGrayscale}
            style={{ background: tool.color }}
          >
            Apply Grayscale
          </button>
        </div>
      )}
    </ToolPage>
  );
};
