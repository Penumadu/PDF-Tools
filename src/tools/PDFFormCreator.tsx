import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument } from '../utils/pdfUtils';
import { ListChecks, X } from 'lucide-react';

export const PDFFormCreator: React.FC = () => {
  const tool = getToolBySlug('pdf-form-creator')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fieldName, setFieldName] = useState('NewField');
  const [fieldType, setFieldType] = useState<'TextField' | 'CheckBox' | 'Dropdown'>('TextField');

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    setFile(files[0]);
    setError(null);
  };

  const addFieldToPDF = async () => {
    if (!file || !fieldName) return;

    setIsProcessing(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      const form = pdfDoc.getForm();
      const page = pdfDoc.getPage(0);
      const { height } = page.getSize();

      // Simple implementation: Add field to top left of first page
      if (fieldType === 'TextField') {
        const textField = form.createTextField(fieldName);
        textField.addToPage(page, { x: 50, y: height - 100, width: 200, height: 30 });
      } else if (fieldType === 'CheckBox') {
        const checkBox = form.createCheckBox(fieldName);
        checkBox.addToPage(page, { x: 50, y: height - 100, width: 30, height: 30 });
      } else if (fieldType === 'Dropdown') {
        const dropdown = form.createDropdown(fieldName);
        dropdown.addOptions(['Option 1', 'Option 2', 'Option 3']);
        dropdown.addToPage(page, { x: 50, y: height - 100, width: 200, height: 30 });
      }
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to add form field. Name might already exist.');
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
      resultFilename={`form-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to add form fields"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Adding form field..." />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <ListChecks size={32} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
              <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              Add a new interactive field to the first page of the document.
            </p>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Field Name</label>
            <input 
              type="text" 
              className="text-input" 
              value={fieldName} 
              onChange={e => setFieldName(e.target.value)} 
            />
          </div>

          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Field Type</label>
            <select className="select-input" value={fieldType} onChange={e => setFieldType(e.target.value as any)}>
              <option value="TextField">Text Input</option>
              <option value="CheckBox">Checkbox</option>
              <option value="Dropdown">Dropdown (Options 1,2,3)</option>
            </select>
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={addFieldToPDF}
            disabled={!fieldName.trim()}
            style={{ background: tool.color }}
          >
            Add Field & Download
          </button>
        </div>
      )}
    </ToolPage>
  );
};
