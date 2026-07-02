import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, generateThumbnail } from '../utils/pdfUtils';
import { Check } from 'lucide-react';

interface PageInfo {
  pageIndex: number;
  thumbnailUrl: string | null;
  selected: boolean;
}

export const SplitPDF: React.FC = () => {
  const tool = getToolBySlug('split-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
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
        pagesData.push({
          pageIndex: i - 1, // 0-based for pdf-lib
          thumbnailUrl,
          selected: false
        });
      }

      setPages(pagesData);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF. It might be password protected or corrupted.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (index: number) => {
    setPages(prev => {
      const newPages = [...prev];
      newPages[index].selected = !newPages[index].selected;
      return newPages;
    });
  };

  const selectAll = () => setPages(prev => prev.map(p => ({ ...p, selected: true })));
  const deselectAll = () => setPages(prev => prev.map(p => ({ ...p, selected: false })));

  const extractPages = async () => {
    const selectedIndices = pages.filter(p => p.selected).map(p => p.pageIndex);
    
    if (selectedIndices.length === 0) {
      setError('Please select at least one page to extract.');
      return;
    }

    if (!file) return;

    setIsExtracting(true);
    setError(null);

    try {
      const originalPdf = await loadPDFDocument(file);
      const newPdf = await PDFDocument.create();
      
      const copiedPages = await newPdf.copyPages(originalPdf, selectedIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      
      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to split PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPages([]);
    setResultUrl(null);
    setError(null);
  };

  const selectedCount = pages.filter(p => p.selected).length;

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`split-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !isExtracting && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to split"
          sublabel="Select pages you want to extract into a new document"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && (
        <div className="message message-error">
          {error}
        </div>
      )}

      {isProcessing && (
        <ProcessingOverlay message="Loading pages..." />
      )}

      {isExtracting && (
        <ProcessingOverlay message="Extracting selected pages..." />
      )}

      {!isProcessing && !isExtracting && !resultUrl && file && pages.length > 0 && (
        <>
          <div className="controls-panel">
            <div className="controls-row justify-between">
              <div>
                <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {pages.length} pages total
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={selectAll}>Select All</button>
                <button className="btn btn-secondary" onClick={deselectAll}>Deselect All</button>
              </div>
            </div>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button 
                className="btn btn-primary btn-lg"
                onClick={extractPages}
                disabled={selectedCount === 0}
                style={{ background: tool.color }}
              >
                Extract {selectedCount} {selectedCount === 1 ? 'Page' : 'Pages'}
              </button>
            </div>
          </div>

          <div className="page-thumbnails-grid">
            {pages.map((page, index) => (
              <div 
                key={index} 
                className={`page-thumbnail ${page.selected ? 'selected' : ''}`}
                onClick={() => togglePageSelection(index)}
              >
                {page.thumbnailUrl && <img src={page.thumbnailUrl} alt={`Page ${index + 1}`} />}
                <div className="page-thumbnail-number">{index + 1}</div>
                <div className="page-thumbnail-check">
                  <Check size={14} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ToolPage>
  );
};
