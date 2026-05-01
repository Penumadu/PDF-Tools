import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { UploadCloud, File, Trash2, ArrowUp, ArrowDown, Layers, Download, CheckCircle, AlertCircle } from 'lucide-react';

interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: string;
}

export const PDFMerger: React.FC = () => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addFiles = (newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length !== newFiles.length) {
      setError('Some files were ignored because they are not PDFs.');
      setTimeout(() => setError(null), 4000);
    }

    const newPdfObjects = pdfFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: formatFileSize(file.size)
    }));

    setFiles(prev => [...prev, ...newPdfObjects]);
    setMergedPdfUrl(null);
    setSuccessMsg(null);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMergedPdfUrl(null);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === files.length - 1)) return;
    
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    setFiles(newFiles);
    setMergedPdfUrl(null);
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of files) {
        const fileBuffer = await pdfFile.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setMergedPdfUrl(url);
      setSuccessMsg('PDFs successfully merged!');
    } catch (err) {
      console.error(err);
      setError('An error occurred while merging the PDFs. Ensure they are valid and not password protected.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadMergedPDF = () => {
    if (!mergedPdfUrl) return;
    
    const a = document.createElement('a');
    a.href = mergedPdfUrl;
    a.download = 'merged_document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2 className="tool-title">Merge PDF Files</h2>
        <p className="tool-subtitle">Combine multiple PDFs into a single document in the order you want.</p>
      </div>

      <div 
        className={`dropzone ${isDragging ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="dropzone-icon" size={48} />
        <p className="dropzone-text">Click or drag PDF files here</p>
        <p className="dropzone-subtext">You can add multiple files at once</p>
        <input 
          type="file" 
          multiple 
          accept="application/pdf" 
          className="hidden-input" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <File className="file-icon" size={24} />
                <div>
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{file.size}</div>
                </div>
              </div>
              <div className="file-actions">
                <button 
                  className="icon-btn move-btn" 
                  onClick={(e) => { e.stopPropagation(); moveFile(index, 'up'); }}
                  disabled={index === 0}
                  title="Move Up"
                >
                  <ArrowUp size={18} />
                </button>
                <button 
                  className="icon-btn move-btn" 
                  onClick={(e) => { e.stopPropagation(); moveFile(index, 'down'); }}
                  disabled={index === files.length - 1}
                  title="Move Down"
                >
                  <ArrowDown size={18} />
                </button>
                <button 
                  className="icon-btn" 
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  title="Remove"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {!mergedPdfUrl ? (
            <button 
              className="primary-btn" 
              onClick={mergePDFs}
              disabled={isProcessing || files.length < 2}
            >
              {isProcessing ? (
                <>
                  <svg className="spinner" viewBox="0 0 50 50">
                    <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                  Merging...
                </>
              ) : (
                <>
                  <Layers size={20} />
                  Merge PDFs
                </>
              )}
            </button>
          ) : (
            <button className="primary-btn" onClick={downloadMergedPDF}>
              <Download size={20} />
              Download Merged PDF
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
