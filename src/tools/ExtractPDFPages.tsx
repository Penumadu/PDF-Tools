import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, generateThumbnail } from '../utils/pdfUtils';
import { Check, X } from 'lucide-react';

interface PageInfo {
  index: number;
  thumbnailUrl: string | null;
  selected: boolean;
}

export const ExtractPDFPages: React.FC = () => {
  const tool = getToolBySlug('extract-pdf-pages')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [rangeInput, setRangeInput] = useState('');
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
    setRangeInput('');

    try {
      const pdfProxy = await loadPDFForRendering(selectedFile);
      const numPages = pdfProxy.numPages;
      const pagesData: PageInfo[] = [];

      for (let i = 1; i <= numPages; i++) {
        const thumbnailUrl = await generateThumbnail(pdfProxy, i);
        pagesData.push({ index: i - 1, thumbnailUrl, selected: false });
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

  const togglePageSelection = (index: number) => {
    setPages(prev => prev.map((p, idx) => idx === index ? { ...p, selected: !p.selected } : p));
  };

  const selectAll = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const selectNone = () => {
    setPages(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const applyRangeInput = () => {
    setError(null);
    if (!rangeInput.trim()) return;

    const selectedIndices = new Set<number>();
    const parts = rangeInput.split(',');

    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const rangeParts = part.split('-');
        const start = parseInt(rangeParts[0], 10);
        const end = parseInt(rangeParts[1], 10);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= pages.length) {
              selectedIndices.add(i - 1);
            }
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pages.length) {
          selectedIndices.add(pageNum - 1);
        }
      }
    }

    if (selectedIndices.size === 0) {
      setError('Invalid range entered.');
      return;
    }

    setPages(prev => prev.map((p, idx) => ({ ...p, selected: selectedIndices.has(idx) })));
  };

  const extractPages = async () => {
    const selectedPages = pages.filter(p => p.selected);
    if (selectedPages.length === 0) {
      setError('Please select at least one page to extract.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const originalPdf = await loadPDFDocument(file!);
      const newPdf = await PDFDocument.create();
      
      const indices = selectedPages.map(p => p.index);
      const copiedPages = await newPdf.copyPages(originalPdf, indices);
      copiedPages.forEach(page => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to extract pages.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPages([]);
    setResultUrl(null);
    setError(null);
    setRangeInput('');
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`extracted-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to extract pages"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading pages..." />}
      {isSaving && <ProcessingOverlay message="Extracting pages and creating PDF..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pages.length > 0 && (
        <>
          <div className="controls-panel">
            <div className="controls-row justify-between" style={{ alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
                <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Range input parser */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="text" 
                  className="text-input" 
                  value={rangeInput} 
                  onChange={e => setRangeInput(e.target.value)} 
                  placeholder="e.g. 1-3, 5" 
                  style={{ width: '120px', padding: '6px 12px', fontSize: '0.85rem' }}
                />
                <button className="btn btn-secondary" onClick={applyRangeInput} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Select Range</button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={selectAll} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Select All</button>
                <button className="btn btn-secondary" onClick={selectNone} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Clear All</button>
                <button 
                  className="btn btn-primary" 
                  onClick={extractPages} 
                  style={{ background: tool.color, padding: '8px 24px', fontSize: '0.9rem' }}
                  disabled={pages.filter(p => p.selected).length === 0}
                >
                  Extract Pages ({pages.filter(p => p.selected).length})
                </button>
              </div>
            </div>
          </div>

          <div className="page-thumbnails-grid">
            {pages.map((page, index) => (
              <div 
                key={page.index}
                className={`page-thumbnail ${page.selected ? 'selected' : ''}`}
                onClick={() => togglePageSelection(index)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                {page.thumbnailUrl && <img src={page.thumbnailUrl} alt={`Page ${index + 1}`} />}
                <div className="page-thumbnail-number">{index + 1}</div>
                {page.selected && (
                  <div className="page-thumbnail-checkbox" style={{ background: tool.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} />
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
