import React, { useState, useRef, useEffect } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { Crop } from 'lucide-react';

export const CropImage: React.FC = () => {
  const tool = getToolBySlug('crop-image')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file.');
      return;
    }
    const selectedFile = imageFiles[0];
    setFile(selectedFile);
    setError(null);
    setCropStart({ x: 0, y: 0 });
    setCropEnd({ x: 0, y: 0 });

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImgObj(img);
      };
      if (e.target?.result) img.src = e.target.result as string;
    };
    reader.readAsDataURL(selectedFile);
  };

  useEffect(() => {
    if (imgObj && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fit image into view
      const maxWidth = 600;
      let width = imgObj.width;
      let height = imgObj.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imgObj, 0, 0, width, height);

      // Draw crop overlay if exists
      if (cropStart.x !== cropEnd.x || cropStart.y !== cropEnd.y) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, width, height);

        const x = Math.min(cropStart.x, cropEnd.x);
        const y = Math.min(cropStart.y, cropEnd.y);
        const w = Math.abs(cropStart.x - cropEnd.x);
        const h = Math.abs(cropStart.y - cropEnd.y);

        ctx.clearRect(x, y, w, h);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, w, h);
      }
    }
  }, [imgObj, cropStart, cropEnd]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropStart({ x, y });
    setCropEnd({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropEnd({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const applyCrop = () => {
    if (!file || !imgObj || !canvasRef.current) return;
    if (cropStart.x === cropEnd.x || cropStart.y === cropEnd.y) {
      setError('Please drag to select a crop area first.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const canvas = canvasRef.current;
    
    // Calculate scale factor from canvas to original image
    const scaleX = imgObj.width / canvas.width;
    const scaleY = imgObj.height / canvas.height;

    const sourceX = Math.min(cropStart.x, cropEnd.x) * scaleX;
    const sourceY = Math.min(cropStart.y, cropEnd.y) * scaleY;
    const sourceW = Math.abs(cropStart.x - cropEnd.x) * scaleX;
    const sourceH = Math.abs(cropStart.y - cropEnd.y) * scaleY;

    try {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = sourceW;
      outCanvas.height = sourceH;
      const ctx = outCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgObj, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
        outCanvas.toBlob((blob) => {
          if (blob) {
            setResultUrl(URL.createObjectURL(blob));
          } else {
            setError('Failed to crop image.');
          }
          setIsProcessing(false);
        }, file.type);
      }
    } catch (err) {
      setError('Error cropping image.');
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setImgObj(null);
    setResultUrl(null);
    setError(null);
    setCropStart({ x: 0, y: 0 });
    setCropEnd({ x: 0, y: 0 });
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`cropped-${file?.name || 'image.png'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to crop"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Cropping Image..." />}

      {!isProcessing && !resultUrl && file && imgObj && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Click and drag on the image to select the crop area.</p>
          </div>

          <div 
            style={{ 
              boxShadow: 'var(--shadow-lg)', 
              background: 'white', 
              cursor: 'crosshair',
              display: 'inline-block'
            }}
          >
            <canvas 
              ref={canvasRef} 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ display: 'block' }}
            />
          </div>

          <div style={{ marginTop: 24, width: '100%', maxWidth: 400 }}>
            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={applyCrop}
              style={{ background: tool.color }}
            >
              <Crop size={20} />
              Apply Crop
            </button>
          </div>
        </div>
      )}
    </ToolPage>
  );
};
