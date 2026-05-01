import React, { useState, useRef } from 'react';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown } from 'pdf-lib';
import { UploadCloud, File, Download, AlertCircle, CheckCircle, RefreshCw, Edit3 } from 'lucide-react';

interface FormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'unknown';
  value: string | boolean;
  options?: string[];
}

export const PDFEntry: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [filledPdfUrl, setFilledPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  
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
    setFilledPdfUrl(null);
    setSuccessMsg(null);
    setFields([]);
    setFieldValues({});

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      setPdfBytes(uint8Array);
      
      const pdfDoc = await PDFDocument.load(uint8Array);
      const form = pdfDoc.getForm();
      const formFields = form.getFields();
      
      if (formFields.length === 0) {
        setError('No fillable form fields found in this PDF. Please upload a PDF with editable fields.');
        setIsProcessing(false);
        setFile(selectedFile);
        return;
      }

      const extractedFields: FormField[] = [];
      const initialValues: Record<string, any> = {};

      formFields.forEach(field => {
        const name = field.getName();
        let type: FormField['type'] = 'unknown';
        let value: any = '';
        let options: string[] | undefined = undefined;

        if (field instanceof PDFTextField) {
          type = 'text';
          value = field.getText() || '';
        } else if (field instanceof PDFCheckBox) {
          type = 'checkbox';
          value = field.isChecked();
        } else if (field instanceof PDFRadioGroup) {
          type = 'radio';
          value = field.getSelected() || '';
          options = field.getOptions();
        } else if (field instanceof PDFDropdown) {
          type = 'dropdown';
          value = field.getSelected() || [];
          options = field.getOptions();
        }

        if (type !== 'unknown') {
          extractedFields.push({ name, type, value, options });
          initialValues[name] = value;
        }
      });

      setFields(extractedFields);
      setFieldValues(initialValues);
      setFile(selectedFile);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF. It might be corrupted or password protected.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [name]: value
    }));
    setFilledPdfUrl(null);
  };

  const savePDF = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      fields.forEach(f => {
        const field = form.getField(f.name);
        const val = fieldValues[f.name];

        if (field instanceof PDFTextField) {
          field.setText(val);
        } else if (field instanceof PDFCheckBox) {
          if (val) field.check();
          else field.uncheck();
        } else if (field instanceof PDFRadioGroup) {
          if (val) field.select(val);
        } else if (field instanceof PDFDropdown) {
          if (val) field.select(val);
        }
      });

      // Optional: Flatten the form to make it read-only after saving
      // form.flatten();

      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setFilledPdfUrl(url);
      setSuccessMsg('PDF successfully updated and ready for download!');
    } catch (err) {
      console.error(err);
      setError('An error occurred while saving the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPDF = () => {
    if (!filledPdfUrl) return;
    const a = document.createElement('a');
    a.href = filledPdfUrl;
    a.download = `filled_${file?.name || 'document'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetTool = () => {
    setFile(null);
    setFields([]);
    setFieldValues({});
    setFilledPdfUrl(null);
    setSuccessMsg(null);
    setError(null);
    setPdfBytes(null);
  };

  // Helper to format field names for display (e.g., "first_name" -> "First Name")
  const formatFieldName = (name: string) => {
    return name
      .replace(/[_.-]/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <h2 className="tool-title">PDF Entry</h2>
        <p className="tool-subtitle">Upload a fillable PDF form, enter your values, and download the completed document.</p>
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
          <p className="dropzone-text">Click or drag a Fillable PDF here</p>
          <p className="dropzone-subtext">Upload a PDF form to enter values</p>
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
                <div className="file-size">{fields.length} editable fields found</div>
              </div>
            </div>
            <button className="icon-btn" onClick={resetTool} title="Upload a different file">
              <RefreshCw size={18} />
            </button>
          </div>

          {fields.length > 0 && (
            <div className="controls-panel" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} /> Edit Form Fields
              </h3>
              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {fields.map((field, idx) => (
                  <div key={idx} className="input-group">
                    <label className="input-label" title={field.name}>
                      {formatFieldName(field.name)}
                    </label>
                    
                    {field.type === 'text' && (
                      <input 
                        type="text" 
                        className="text-input"
                        value={fieldValues[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        placeholder={`Enter ${formatFieldName(field.name)}...`}
                      />
                    )}

                    {field.type === 'checkbox' && (
                      <label className="radio-label" style={{ marginTop: '0.5rem' }}>
                        <input 
                          type="checkbox" 
                          checked={!!fieldValues[field.name]}
                          onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        />
                        {formatFieldName(field.name)}
                      </label>
                    )}

                    {field.type === 'radio' && field.options && (
                      <div className="radio-group" style={{ flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {field.options.map(opt => (
                          <label key={opt} className="radio-label">
                            <input 
                              type="radio" 
                              name={field.name}
                              value={opt}
                              checked={fieldValues[field.name] === opt}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}

                    {field.type === 'dropdown' && field.options && (
                      <select 
                        className="text-input"
                        value={Array.isArray(fieldValues[field.name]) ? fieldValues[field.name][0] : fieldValues[field.name]}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      >
                        <option value="">Select an option...</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fields.length === 0 && !error && (
            <div className="controls-panel" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>This PDF does not appear to have any fillable form fields.</p>
            </div>
          )}

          {fields.length > 0 && !filledPdfUrl ? (
            <button 
              className="primary-btn" 
              onClick={savePDF}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg className="spinner" viewBox="0 0 50 50">
                    <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Save Changes
                </>
              )}
            </button>
          ) : filledPdfUrl ? (
            <button className="primary-btn" onClick={downloadPDF}>
              <Download size={20} />
              Download Filled PDF
            </button>
          ) : null}
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
