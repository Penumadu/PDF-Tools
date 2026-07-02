import React, { useState } from 'react';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { X, GripHorizontal } from 'lucide-react';

interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
}

export const ImageToPDF: React.FC = () => {
  const tool = getToolBySlug('image-to-pdf')!;
  
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [margin, setMargin] = useState<number>(0);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Fit'>('A4');

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(f => f.type === 'image/jpeg' || f.type === 'image/png');
    
    if (validFiles.length === 0) {
      setError('Please select valid JPG or PNG images.');
      return;
    }

    const newImages = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setImages(prev => [...prev, ...newImages]);
    setError(null);
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    setImages(prev => {
      const newImages = [...prev];
      const draggedItem = newImages[draggedItemIndex];
      newImages.splice(draggedItemIndex, 1);
      newImages.splice(index, 0, draggedItem);
      setDraggedItemIndex(index);
      return newImages;
    });
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const convertToPDF = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const img of images) {
        const imageBytes = await img.file.arrayBuffer();
        let pdfImage;
        
        if (img.file.type === 'image/jpeg') {
          pdfImage = await pdfDoc.embedJpg(imageBytes);
        } else if (img.file.type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(imageBytes);
        } else {
          continue; // Skip unsupported
        }

        const imgDims = pdfImage.scale(1);
        let pageWidth = imgDims.width;
        let pageHeight = imgDims.height;
        let drawWidth = imgDims.width;
        let drawHeight = imgDims.height;

        if (pageSize !== 'Fit') {
          const size = pageSize === 'A4' ? PageSizes.A4 : PageSizes.Letter;
          
          let isLandscape = false;
          if (orientation === 'auto') {
            isLandscape = imgDims.width > imgDims.height;
          } else {
            isLandscape = orientation === 'landscape';
          }

          pageWidth = isLandscape ? size[1] : size[0];
          pageHeight = isLandscape ? size[0] : size[1];

          // Calculate scale to fit within page with margin
          const availWidth = pageWidth - (margin * 2);
          const availHeight = pageHeight - (margin * 2);
          
          const widthScale = availWidth / imgDims.width;
          const heightScale = availHeight / imgDims.height;
          const scale = Math.min(widthScale, heightScale);

          drawWidth = imgDims.width * scale;
          drawHeight = imgDims.height * scale;
        } else if (margin > 0) {
          pageWidth += margin * 2;
          pageHeight += margin * 2;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Center image
        page.drawImage(pdfImage, {
          x: (pageWidth - drawWidth) / 2,
          y: (pageHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to convert images to PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setImages([]);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename="converted-images.pdf"
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && (
        <>
          <DropZone
            onFiles={handleFiles}
            multiple={true}
            accept="image/jpeg,image/png"
            label="Drop JPG or PNG images here"
            color={tool.color}
            colorLight={tool.colorLight}
          />

          {error && <div className="message message-error">{error}</div>}

          {images.length > 0 && (
            <div style={{ marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Images Grid */}
              <div style={{ flex: '1 1 60%' }}>
                <div className="page-thumbnails-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                  {images.map((img, index) => (
                    <div 
                      key={img.id} 
                      className="page-thumbnail"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{ height: 160, padding: 8, cursor: 'grab', opacity: draggedItemIndex === index ? 0.5 : 1 }}
                    >
                      <img src={img.previewUrl} alt={`Image ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                      <div className="page-thumbnail-rotate" onClick={() => removeImage(img.id)} style={{ opacity: 1 }}>
                        <X size={14} color="#ef4444" />
                      </div>
                      <div className="page-thumbnail-number" style={{ top: 6, bottom: 'auto', left: 6, transform: 'none', background: 'rgba(0,0,0,0.4)' }}>
                        <GripHorizontal size={12} />
                      </div>
                    </div>
                  ))}
                  
                  {/* Add more button */}
                  <div className="page-thumbnail" style={{ height: 160, borderStyle: 'dashed', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <label style={{ cursor: 'pointer', textAlign: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div style={{ background: 'white', borderRadius: '50%', padding: 8, boxShadow: 'var(--shadow-sm)' }}>
                        +
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Add More</span>
                      <input type="file" multiple accept="image/jpeg,image/png" onChange={(e) => {
                        if (e.target.files) handleFiles(Array.from(e.target.files));
                      }} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Settings Sidebar */}
              <div className="controls-panel" style={{ flex: '1 1 30%', marginTop: 0, position: 'sticky', top: 24 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.05rem' }}>PDF Settings</h3>
                
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label className="input-label">Page Size</label>
                  <select className="select-input" value={pageSize} onChange={e => setPageSize(e.target.value as any)}>
                    <option value="A4">A4</option>
                    <option value="Letter">US Letter</option>
                    <option value="Fit">Fit to Image Size</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label className="input-label">Orientation</label>
                  <select className="select-input" value={orientation} onChange={e => setOrientation(e.target.value as any)} disabled={pageSize === 'Fit'}>
                    <option value="auto">Auto (based on image)</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div className="input-group" style={{ marginBottom: 24 }}>
                  <label className="input-label">Margin (pixels): {margin}</label>
                  <input 
                    type="range" 
                    className="range-slider" 
                    min="0" max="100" 
                    value={margin} 
                    onChange={e => setMargin(Number(e.target.value))} 
                  />
                </div>

                <button 
                  className="btn btn-primary btn-full btn-lg" 
                  onClick={convertToPDF}
                  style={{ background: tool.color }}
                >
                  Convert to PDF
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isProcessing && <ProcessingOverlay message="Creating PDF document..." />}
    </ToolPage>
  );
};
