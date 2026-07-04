import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument } from '../utils/pdfUtils';
import { FormInput, X } from 'lucide-react';

interface FormField {
  name: string;
  type: string;
  value: string;
}

export const FillPDFForm: React.FC = () => {
  const tool = getToolBySlug('fill-pdf-form')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [fields, setFields] = useState<FormField[]>([]);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);

    try {
      const doc = await loadPDFDocument(selectedFile);
      const form = doc.getForm();
      const extractedFields = form.getFields().map(f => ({
        name: f.getName(),
        type: f.constructor.name,
        value: ''
      }));

      if (extractedFields.length === 0) {
        setError('No interactive form fields found in this PDF.');
        setFile(null);
      } else {
        setPdfDoc(doc);
        setFields(extractedFields);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to analyze PDF form.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setFields(prev => prev.map(f => f.name === name ? { ...f, value } : f));
  };

  const applyFormData = async () => {
    if (!pdfDoc) return;
    setIsProcessing(true);
    setError(null);

    try {
      const form = pdfDoc.getForm();
      
      fields.forEach(f => {
        if (!f.value) return;
        try {
          const field = form.getField(f.name);
          if (f.type.includes('TextField')) {
            (field as any).setText(f.value);
          } else if (f.type.includes('CheckBox')) {
            if (f.value === 'true') (field as any).check();
            else (field as any).uncheck();
          } else if (f.type.includes('RadioGroup')) {
            (field as any).select(f.value);
          } else if (f.type.includes('Dropdown')) {
            (field as any).select(f.value);
          }
        } catch (e) {
          console.error(`Failed to set field ${f.name}`, e);
        }
      });
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to fill PDF form.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPdfDoc(null);
    setFields([]);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`filled-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF form here to fill"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message={pdfDoc ? "Saving form data..." : "Analyzing form fields..."} />}

      {!isProcessing && !resultUrl && file && fields.length > 0 && (
        <div className="controls-panel" style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <FormInput size={32} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
              <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              Found {fields.length} interactive fields. Fill them out below.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
            {fields.map((field) => (
              <div key={field.name} className="input-group">
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {field.name}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    {field.type.replace('PDF', '')}
                  </span>
                </label>
                
                {field.type.includes('CheckBox') ? (
                  <label className="radio-label" style={{ padding: '8px 0' }}>
                    <input 
                      type="checkbox" 
                      checked={field.value === 'true'} 
                      onChange={e => handleFieldChange(field.name, e.target.checked ? 'true' : 'false')} 
                    />
                    Check
                  </label>
                ) : (
                  <input 
                    type="text" 
                    className="text-input" 
                    value={field.value} 
                    onChange={e => handleFieldChange(field.name, e.target.value)} 
                    placeholder={`Enter ${field.name}`}
                  />
                )}
              </div>
            ))}
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyFormData}
            style={{ background: tool.color }}
          >
            Save Filled Form
          </button>
        </div>
      )}
    </ToolPage>
  );
};
