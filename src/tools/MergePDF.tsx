import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument } from '../utils/pdfUtils';
import { FileText, X, ChevronUp, ChevronDown } from 'lucide-react';

export const MergePDF: React.FC = () => {
  const tool = getToolBySlug('merge-pdf')!;
  
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFiles(prev => {
      const newFiles = [...prev];
      const temp = newFiles[index - 1];
      newFiles[index - 1] = newFiles[index];
      newFiles[index] = temp;
      return newFiles;
    });
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles(prev => {
      const newFiles = [...prev];
      const temp = newFiles[index + 1];
      newFiles[index + 1] = newFiles[index];
      newFiles[index] = temp;
      return newFiles;
    });
  };

  const processMerge = async () => {
    if (files.length < 2) {
      setError('Please select at least 2 PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const pdf = await loadPDFDocument(file);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfFile = await mergedPdf.save();
      const blob = new Blob([mergedPdfFile as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (err) {
      console.error(err);
      setError('Failed to merge PDFs. Please ensure all files are valid PDFs and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename="merged-document.pdf"
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && (
        <>
          <DropZone
            onFiles={handleFiles}
            multiple={true}
            label="Drop PDFs here to merge"
            sublabel="Select multiple files and arrange them in the order you want"
            color={tool.color}
            colorLight={tool.colorLight}
          />

          {error && (
            <div className="message message-error">
              {error}
            </div>
          )}

          {files.length > 0 && (
            <>
              <div className="file-list">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="file-item">
                    <div className="file-info">
                      <div className="file-icon-wrapper">
                        <FileText size={20} />
                      </div>
                      <span className="file-name">{file.name}</span>
                    </div>
                    <div className="file-actions">
                      <button 
                        className="icon-btn" 
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        style={{ opacity: index === 0 ? 0.3 : 1 }}
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button 
                        className="icon-btn" 
                        onClick={() => moveDown(index)}
                        disabled={index === files.length - 1}
                        style={{ opacity: index === files.length - 1 ? 0.3 : 1 }}
                      >
                        <ChevronDown size={18} />
                      </button>
                      <button 
                        className="icon-btn danger" 
                        onClick={() => removeFile(index)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button 
                  className="btn btn-primary btn-lg" 
                  onClick={processMerge}
                  disabled={files.length < 2}
                  style={{ background: tool.color }}
                >
                  Merge {files.length} PDFs
                </button>
                {files.length < 2 && (
                  <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Add at least one more file to merge
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {isProcessing && (
        <ProcessingOverlay message="Merging your PDFs..." />
      )}
    </ToolPage>
  );
};
