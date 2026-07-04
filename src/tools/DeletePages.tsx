import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, generateThumbnail } from '../utils/pdfUtils';
import { Trash2, X } from 'lucide-react';

interface PageInfo {
  pageIndex: number;
  thumbnailUrl: string | null;
  deleted: boolean;
}

export const DeletePages: React.FC = () => {
  const tool = getToolBySlug('delete-pages')!;
  
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
      const numPages = pdfProxy.numPages;
      const pagesData: PageInfo[] = [];

      for (let i = 1; i <= numPages; i++) {
        const thumbnailUrl = await generateThumbnail(pdfProxy, i);
        pagesData.push({ pageIndex: i - 1, thumbnailUrl, deleted: false });
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

  const toggleDelete = (index: number) => {
    setPages(prev => prev.map((p, idx) => {
      if (idx !== index) return p;
      return { ...p, deleted: !p.deleted };
    }));
  };

  const applyDeletions = async () => {
    if (!file) return;

    const remainingPages = pages.filter(p => !p.deleted).map(p => p.pageIndex);
    if (remainingPages.length === 0) {
      setError('You cannot delete all pages. Please leave at least one.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const originalPdf = await loadPDFDocument(file);
      const newPdf = await PDFDocument.create();
      
      const copiedPages = await newPdf.copyPages(originalPdf, remainingPages);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to delete pages.');
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

  const deletedCount = pages.filter(p => p.deleted).length;

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`modified-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to delete pages"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading pages..." />}
      {isSaving && <ProcessingOverlay message="Removing pages..." />}

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
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {pages.length - deletedCount} pages will remain
                </p>
              </div>
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button 
                className="btn btn-primary btn-lg" 
                onClick={applyDeletions}
                disabled={deletedCount === 0 || deletedCount === pages.length}
                style={{ background: tool.color }}
              >
                Apply Changes
              </button>
            </div>
          </div>

          <div className="page-thumbnails-grid">
            {pages.map((page, index) => (
              <div 
                key={index} 
                className="page-thumbnail"
                style={{ opacity: page.deleted ? 0.3 : 1, filter: page.deleted ? 'grayscale(100%)' : 'none' }}
              >
                {page.thumbnailUrl && <img src={page.thumbnailUrl} alt={`Page ${index + 1}`} />}
                <div className="page-thumbnail-number">{index + 1}</div>
                <div className="page-thumbnail-rotate" onClick={() => toggleDelete(index)} style={{ opacity: 1, color: page.deleted ? '#ef4444' : 'var(--text-secondary)' }}>
                  <Trash2 size={14} />
                </div>
                {page.deleted && (
                  <div className="page-thumbnail-overlay">
                    <Trash2 size={32} color="#ef4444" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </ToolPage>
  );
};
