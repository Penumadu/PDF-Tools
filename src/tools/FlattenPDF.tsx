import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument } from '../utils/pdfUtils';
import { Minimize2 } from 'lucide-react';

export const FlattenPDF: React.FC = () => {
  const tool = getToolBySlug('flatten-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    setFile(files[0]);
    setError(null);
  };

  const applyFlatten = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      
      const form = pdfDoc.getForm();
      if (form) {
        form.flatten();
      }
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to flatten PDF. Ensure the file contains form fields.');
    } finally {
      setIsProcessing(false);
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
      resultFilename={`flattened-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to flatten"
          sublabel="Make interactive form fields permanent"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Flattening PDF..." />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Minimize2 size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              Flattening this document will make all form fields and annotations permanent and uneditable.
            </p>
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyFlatten}
            style={{ background: tool.color }}
          >
            Flatten PDF
          </button>
        </div>
      )}
    </ToolPage>
  );
};
