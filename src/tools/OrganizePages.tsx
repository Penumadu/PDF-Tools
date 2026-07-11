import React, { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, generateThumbnail } from '../utils/pdfUtils';
import { GripHorizontal, RotateCw, Trash2, ArrowLeft, ArrowRight, X } from 'lucide-react';

interface PageInfo {
  id: string;
  originalIndex: number;
  thumbnailUrl: string | null;
  rotation: number;
}

export const OrganizePages: React.FC = () => {
  const tool = getToolBySlug('organize-pages')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setPages([]);

    try {
      const pdfProxy = await loadPDFForRendering(selectedFile);
      const numPages = pdfProxy.numPages;
      const pagesData: PageInfo[] = [];

      for (let i = 1; i <= numPages; i++) {
        const thumbnailUrl = await generateThumbnail(pdfProxy, i);
        pagesData.push({ 
          id: `page-${i}-${Math.random().toString(36).substring(7)}`, 
          originalIndex: i - 1, 
          thumbnailUrl,
          rotation: 0
        });
      }

      setPages(pagesData);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag-and-drop logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    setPages(prev => {
      const newPages = [...prev];
      const draggedItem = newPages[draggedItemIndex];
      newPages.splice(draggedItemIndex, 1);
      newPages.splice(index, 0, draggedItem);
      return newPages;
    });
    setDraggedItemIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // Page manipulation actions
  const moveLeft = (index: number) => {
    if (index === 0) return;
    setPages(prev => {
      const newPages = [...prev];
      const temp = newPages[index - 1];
      newPages[index - 1] = newPages[index];
      newPages[index] = temp;
      return newPages;
    });
  };

  const moveRight = (index: number) => {
    if (index === pages.length - 1) return;
    setPages(prev => {
      const newPages = [...prev];
      const temp = newPages[index + 1];
      newPages[index + 1] = newPages[index];
      newPages[index] = temp;
      return newPages;
    });
  };

  const rotatePage = (index: number) => {
    setPages(prev => prev.map((p, idx) => {
      if (idx !== index) return p;
      return { ...p, rotation: (p.rotation + 90) % 360 };
    }));
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      setError('You must keep at least one page in the document.');
      return;
    }
    setPages(prev => prev.filter((_, idx) => idx !== index));
    setError(null);
  };

  const applyOrder = async () => {
    if (!file) return;
    setIsSaving(true);
    setError(null);

    try {
      const originalPdf = await loadPDFDocument(file);
      const newPdf = await PDFDocument.create();
      
      const indices = pages.map(p => p.originalIndex);
      const copiedPages = await newPdf.copyPages(originalPdf, indices);

      copiedPages.forEach((page, index) => {
        const rotationAngle = pages[index].rotation;
        if (rotationAngle) {
          page.setRotation(degrees(rotationAngle));
        }
        newPdf.addPage(page);
      });
      
      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to organize pages.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPages([]);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`organized-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to organize pages"
          sublabel="Reorder, rotate, or delete pages to restructure your PDF"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading pages..." />}
      {isSaving && <ProcessingOverlay message="Applying changes and saving PDF..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pages.length > 0 && (
        <>
          <div className="controls-panel">
            <div className="controls-row justify-between" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
                <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: 12, fontSize: '0.9rem', color: '#64748b' }}>Drag pages, or use helper buttons to rotate, reorder and delete pages.</p>
                <button className="btn btn-primary btn-lg" onClick={applyOrder} style={{ background: tool.color }}>
                  Apply & Save PDF
                </button>
              </div>
            </div>
          </div>

          <div className="page-thumbnails-grid">
            {pages.map((page, index) => (
              <div 
                key={page.id}
                className="page-thumbnail"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{ 
                  cursor: 'grab', 
                  opacity: draggedItemIndex === index ? 0.3 : 1,
                  transform: draggedItemIndex === index ? 'scale(1.05)' : 'none',
                  border: draggedItemIndex === index ? '2px dashed var(--brand-primary)' : '2px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '8px'
                }}
              >
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', height: 140 }}>
                  {page.thumbnailUrl && (
                    <img 
                      src={page.thumbnailUrl} 
                      alt={`Page ${index + 1}`} 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain',
                        transform: `rotate(${page.rotation}deg)`,
                        transition: 'transform 0.2s',
                        pointerEvents: 'none'
                      }} 
                    />
                  )}
                  <div className="page-thumbnail-number" style={{ bottom: 4 }}>{index + 1}</div>
                </div>

                {/* Manual action toolbar on hover/bottom */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button 
                      onClick={() => moveLeft(index)} 
                      disabled={index === 0} 
                      style={{ border: 'none', background: 'transparent', cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? '#cbd5e1' : '#64748b' }}
                      title="Move Left"
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button 
                      onClick={() => moveRight(index)} 
                      disabled={index === pages.length - 1} 
                      style={{ border: 'none', background: 'transparent', cursor: index === pages.length - 1 ? 'default' : 'pointer', color: index === pages.length - 1 ? '#cbd5e1' : '#64748b' }}
                      title="Move Right"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      onClick={() => rotatePage(index)} 
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                      title="Rotate Page"
                    >
                      <RotateCw size={13} />
                    </button>
                    <button 
                      onClick={() => deletePage(index)} 
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                      title="Delete Page"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ToolPage>
  );
};
