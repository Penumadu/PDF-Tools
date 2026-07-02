import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, generateThumbnail } from '../utils/pdfUtils';
import { GripHorizontal } from 'lucide-react';

interface PageInfo {
  id: string;
  originalIndex: number;
  thumbnailUrl: string | null;
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
        pagesData.push({ id: `page-${i}`, originalIndex: i - 1, thumbnailUrl });
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    setPages(prev => {
      const newPages = [...prev];
      const draggedItem = newPages[draggedItemIndex];
      newPages.splice(draggedItemIndex, 1);
      newPages.splice(index, 0, draggedItem);
      setDraggedItemIndex(index); // Update dragged index so it follows
      return newPages;
    });
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const applyOrder = async () => {
    if (!file) return;
    setIsSaving(true);
    setError(null);

    try {
      const originalPdf = await loadPDFDocument(file);
      const newPdf = await PDFDocument.create();
      
      const newIndices = pages.map(p => p.originalIndex);
      const copiedPages = await newPdf.copyPages(originalPdf, newIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to reorder pages.');
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
          sublabel="Drag and drop pages to reorder them"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading pages..." />}
      {isSaving && <ProcessingOverlay message="Applying new order..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pages.length > 0 && (
        <>
          <div className="controls-panel">
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: 16 }}>Drag and drop pages to rearrange them.</p>
              <button className="btn btn-primary btn-lg" onClick={applyOrder} style={{ background: tool.color }}>
                Apply Changes
              </button>
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
                onDragEnd={handleDragEnd}
                style={{ 
                  cursor: 'grab', 
                  opacity: draggedItemIndex === index ? 0.5 : 1,
                  transform: draggedItemIndex === index ? 'scale(1.05)' : 'none'
                }}
              >
                {page.thumbnailUrl && <img src={page.thumbnailUrl} alt={`Page ${index + 1}`} style={{ pointerEvents: 'none' }} />}
                <div className="page-thumbnail-number">{index + 1}</div>
                <div className="page-thumbnail-rotate" style={{ opacity: 1, cursor: 'grab' }}>
                  <GripHorizontal size={14} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ToolPage>
  );
};
