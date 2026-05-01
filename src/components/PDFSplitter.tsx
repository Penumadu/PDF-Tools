import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { UploadCloud, File, Scissors, Download, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export const PDFSplitter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState<string>('');
  const [splitMode, setSplitMode] = useState<'visual' | 'range'>('visual');
  const [splitPdfUrl, setSplitPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSplitPdfUrl(null);
    setSuccessMsg(null);
    setSelectedPages(new Set());
    setRangeInput('');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
      setFile(selectedFile);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF. It might be corrupted or password protected.');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (pageNum: number) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(pageNum)) {
      newSelection.delete(pageNum);
    } else {
      newSelection.add(pageNum);
    }
    setSelectedPages(newSelection);
    setSplitPdfUrl(null);
  };

  const selectAll = () => {
    const allPages = new Set<number>();
    for (let i = 1; i <= totalPages; i++) allPages.add(i);
    setSelectedPages(allPages);
    setSplitPdfUrl(null);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
    setSplitPdfUrl(null);
  };

  const parseRange = (rangeStr: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = rangeStr.split(',').map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);

        if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
          throw new Error(`Invalid range: ${part}`);
        }
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      } else {
        const page = parseInt(part);
        if (isNaN(page) || page < 1 || page > maxPages) {
          throw new Error(`Invalid page number: ${part}`);
        }
        pages.add(page);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const splitPDF = async () => {
    if (!file) return;

    let pagesToExtract: number[] = [];

    try {
      if (splitMode === 'visual') {
        if (selectedPages.size === 0) throw new Error('Please select at least one page to extract.');
        pagesToExtract = Array.from(selectedPages).sort((a, b) => a - b);
      } else {
        if (!rangeInput.trim()) throw new Error('Please enter a page range (e.g., 1-3, 5, 8).');
        pagesToExtract = parseRange(rangeInput, totalPages);
        if (pagesToExtract.length === 0) throw new Error('No valid pages found in the range.');
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const fileBuffer = await file.arrayBuffer();
      const originalPdf = await PDFDocument.load(fileBuffer);
      const newPdf = await PDFDocument.create();

      // Pages in pdf-lib are 0-indexed, so we subtract 1
      const zeroIndexedPages = pagesToExtract.map(p => p - 1);
      
      const copiedPages = await newPdf.copyPages(originalPdf, zeroIndexedPages);
      copiedPages.forEach(page => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setSplitPdfUrl(url);
      setSuccessMsg('PDF successfully split!');
    } catch (err) {
      console.error(err);
      setError('An error occurred while splitting the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSplitPDF = () => {
    if (!splitPdfUrl) return;
    const a = document.createElement('a');
    a.href = splitPdfUrl;
    a.download = `split_${file?.name || 'document'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetTool = () => {
    setFile(null);
    setTotalPages(0);
    setSelectedPages(new Set());
    setRangeInput('');
    setSplitPdfUrl(null);
    setSuccessMsg(null);
    setError(null);
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2 className="tool-title">Split PDF Files</h2>
        <p className="tool-subtitle">Extract pages from your PDF or split it into smaller documents.</p>
      </div>

      {!file ? (
        <div 
          className={`dropzone ${isDragging ? 'active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="dropzone-icon" size={48} />
          <p className="dropzone-text">Click or drag a PDF file here</p>
          <p className="dropzone-subtext">Upload a single PDF to split or extract pages</p>
          <input 
            type="file" 
            accept="application/pdf" 
            className="hidden-input" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="file-list">
          <div className="file-item" style={{ cursor: 'default', transform: 'none', boxShadow: 'none' }}>
            <div className="file-info">
              <File className="file-icon" size={24} />
              <div>
                <div className="file-name">{file.name}</div>
                <div className="file-size">{totalPages} pages</div>
              </div>
            </div>
            <button className="icon-btn" onClick={resetTool} title="Upload a different file">
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="controls-panel">
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  type="radio" 
                  checked={splitMode === 'visual'} 
                  onChange={() => setSplitMode('visual')} 
                />
                Visual Selection
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  checked={splitMode === 'range'} 
                  onChange={() => setSplitMode('range')} 
                />
                Custom Range
              </label>
            </div>

            {splitMode === 'visual' ? (
              <div className="input-group" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label">Select pages to extract ({selectedPages.size} selected):</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="icon-btn" onClick={selectAll} style={{ fontSize: '0.85rem' }}>Select All</button>
                    <button className="icon-btn" onClick={clearSelection} style={{ fontSize: '0.85rem' }}>Clear</button>
                  </div>
                </div>
                <div className="pdf-pages-grid">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`pdf-page-item ${selectedPages.has(i + 1) ? 'selected' : ''}`}
                      onClick={() => togglePageSelection(i + 1)}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label className="input-label">Enter pages or ranges (e.g., 1-5, 8, 11-13):</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="e.g., 1-5, 8, 11-13" 
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                />
              </div>
            )}
          </div>

          {!splitPdfUrl ? (
            <button 
              className="primary-btn" 
              onClick={splitPDF}
              disabled={isProcessing || (splitMode === 'visual' ? selectedPages.size === 0 : !rangeInput.trim())}
            >
              {isProcessing ? (
                <>
                  <svg className="spinner" viewBox="0 0 50 50">
                    <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Scissors size={20} />
                  Extract Pages
                </>
              )}
            </button>
          ) : (
            <button className="primary-btn" onClick={downloadSplitPDF}>
              <Download size={20} />
              Download Extracted PDF
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      
      {successMsg && (
        <div className="success-message">
          <CheckCircle size={20} />
          {successMsg}
        </div>
      )}
    </div>
  );
};
