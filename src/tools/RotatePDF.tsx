import React, { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, generateThumbnail } from '../utils/pdfUtils';
import { RotateCw, RotateCcw, X } from 'lucide-react';

interface PageInfo {
  pageIndex: number;
  thumbnailUrl: string | null;
  rotation: number; // 0, 90, 180, 270
}

export const RotatePDF: React.FC = () => {
  const tool = getToolBySlug('rotate-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setPages([]);

    try {
      const pdfProxy = await loadPDFForRendering(selectedFile);
      const originalPdf = await loadPDFDocument(selectedFile);
      const numPages = pdfProxy.numPages;
      const pagesData: PageInfo[] = [];

      for (let i = 1; i <= numPages; i++) {
        const thumbnailUrl = await generateThumbnail(pdfProxy, i);
        // Get existing rotation from pdf-lib
        const pdfPage = originalPdf.getPage(i - 1);
        const existingRotation = pdfPage.getRotation().angle;
        
        pagesData.push({
          pageIndex: i - 1,
          thumbnailUrl,
          rotation: existingRotation || 0
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

  const rotatePage = (index: number, direction: 'cw' | 'ccw') => {
    setPages(prev => {
      const newPages = [...prev];
      let currentRotation = newPages[index].rotation;
      if (direction === 'cw') {
        currentRotation = (currentRotation + 90) % 360;
      } else {
        currentRotation = (currentRotation - 90 + 360) % 360;
      }
      newPages[index].rotation = currentRotation;
      return newPages;
    });
  };

  const rotateAll = (direction: 'cw' | 'ccw') => {
    setPages(prev => prev.map(p => ({
      ...p,
      rotation: direction === 'cw' ? (p.rotation + 90) % 360 : (p.rotation - 90 + 360) % 360
    })));
  };

  const applyRotation = async () => {
    if (!file) return;

    setIsSaving(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      
      pages.forEach(p => {
        const page = pdfDoc.getPage(p.pageIndex);
        page.setRotation(degrees(p.rotation));
      });
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to apply rotation.');
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
      resultFilename={`rotated-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to rotate"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading pages..." />}
      {isSaving && <ProcessingOverlay message="Applying rotation..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pages.length > 0 && (
        <>
          <div className="controls-panel">
            <div className="controls-row justify-between">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
                  <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => rotateAll('ccw')}>
                  <RotateCcw size={16} /> All Left
                </button>
                <button className="btn btn-secondary" onClick={() => rotateAll('cw')}>
                  <RotateCw size={16} /> All Right
                </button>
              </div>
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button className="btn btn-primary btn-lg" onClick={applyRotation} style={{ background: tool.color }}>
                Apply Changes
              </button>
            </div>
          </div>

          <div className="page-thumbnails-grid">
            {pages.map((page, index) => (
              <div key={index} className="page-thumbnail">
                {page.thumbnailUrl && (
                  <div style={{ 
                    width: '100%', height: '100%', 
                    transform: `rotate(${page.rotation}deg)`,
                    transition: 'transform 0.3s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <img src={page.thumbnailUrl} alt={`Page ${index + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div className="page-thumbnail-number">{index + 1}</div>
                <div className="page-thumbnail-rotate" onClick={() => rotatePage(index, 'cw')}>
                  <RotateCw size={14} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ToolPage>
  );
};
