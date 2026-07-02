import React, { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument } from '../utils/pdfUtils';

export const AddPageNumbers: React.FC = () => {
  const tool = getToolBySlug('add-page-numbers')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [position, setPosition] = useState<'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right'>('bottom-center');
  const [format, setFormat] = useState<'number' | 'page-number' | 'number-of-total' | 'page-number-of-total'>('number');
  const [startNumber, setStartNumber] = useState<number>(1);

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    setFile(files[0]);
    setError(null);
  };

  const applyPageNumbers = async () => {
    if (!file) return;

    setIsSaving(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      pages.forEach((page, index) => {
        const { width, height } = page.getSize();
        const currentNum = startNumber + index;
        
        let text = `${currentNum}`;
        if (format === 'page-number') text = `Page ${currentNum}`;
        if (format === 'number-of-total') text = `${currentNum} of ${totalPages}`;
        if (format === 'page-number-of-total') text = `Page ${currentNum} of ${totalPages}`;

        const fontSize = 12;
        const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
        const margin = 30;

        let x = margin;
        if (position.includes('center')) x = (width - textWidth) / 2;
        if (position.includes('right')) x = width - textWidth - margin;

        let y = margin;
        if (position.includes('top')) y = height - margin - fontSize;

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      });
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to add page numbers.');
    } finally {
      setIsSaving(false);
    }
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
      resultFilename={`numbered-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to add page numbers"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isSaving && <ProcessingOverlay message="Adding page numbers..." />}

      {!isSaving && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Position</label>
            <select className="select-input" value={position} onChange={e => setPosition(e.target.value as any)}>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-center">Bottom Center</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="top-left">Top Left</option>
              <option value="top-center">Top Center</option>
              <option value="top-right">Top Right</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Format</label>
            <select className="select-input" value={format} onChange={e => setFormat(e.target.value as any)}>
              <option value="number">1, 2, 3...</option>
              <option value="page-number">Page 1, Page 2...</option>
              <option value="number-of-total">1 of 5, 2 of 5...</option>
              <option value="page-number-of-total">Page 1 of 5...</option>
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Start Number</label>
            <input 
              type="number" 
              className="text-input" 
              value={startNumber} 
              onChange={e => setStartNumber(Number(e.target.value) || 1)} 
              min={1}
            />
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyPageNumbers}
            style={{ background: tool.color }}
          >
            Add Page Numbers
          </button>
        </div>
      )}
    </ToolPage>
  );
};
