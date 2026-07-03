import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, rgb } from 'pdf-lib';
import { UploadCloud, File, Download, AlertCircle, CheckCircle, RefreshCw, Edit3, Bookmark, Trash2, FolderOpen } from 'lucide-react';
import localforage from 'localforage';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface FormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'unknown';
  value: string | boolean;
  options?: string[];
}

interface SavedTemplate {
  id: string;
  name: string;
  data: Uint8Array;
  createdAt: number;
}

interface CustomTextField {
  id: string;
  pageIndex: number;
  x: number; // percentage
  y: number; // percentage
  text: string;
}

export const PDFEntry: React.FC = () => {
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [filledPdfUrl, setFilledPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  
  // Templates state
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');

  // Visual Edit State (for non-fillable PDFs)
  const [isVisualEditMode, setIsVisualEditMode] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [customFields, setCustomFields] = useState<CustomTextField[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadTemplates() {
    try {
      const saved = await localforage.getItem<SavedTemplate[]>('pdf_templates');
      if (saved) {
        setTemplates(saved);
      }
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadTemplates();
  }, []);

  const saveTemplateToDb = async () => {
    if (!pdfBytes || !templateNameInput.trim()) return;
    
    try {
      const newTemplate: SavedTemplate = {
        id: Math.random().toString(36).substring(7),
        name: templateNameInput.trim(),
        data: pdfBytes,
        createdAt: Date.now()
      };
      
      const updatedTemplates = [...templates, newTemplate];
      await localforage.setItem('pdf_templates', updatedTemplates);
      setTemplates(updatedTemplates);
      setShowSaveTemplate(false);
      setSuccessMsg(`Template "${newTemplate.name}" saved successfully!`);
    } catch (err) {
      console.error(err);
      setError('Failed to save template. It might be too large.');
    }
  };

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedTemplates = templates.filter(t => t.id !== id);
      await localforage.setItem('pdf_templates', updatedTemplates);
      setTemplates(updatedTemplates);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFromTemplate = async (template: SavedTemplate) => {
    try {
      await processPdfBytes(template.data, template.name);
      setSuccessMsg(`Loaded template: ${template.name}`);
    } catch (err) {
      setError('Failed to load template.');
    }
  };

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
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await processPdfBytes(uint8Array, selectedFile.name);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF. It might be corrupted or password protected.');
      setIsProcessing(false);
    }
  };

  const processPdfBytes = async (uint8Array: Uint8Array, name: string) => {
    setError(null);
    setFilledPdfUrl(null);
    setSuccessMsg(null);
    setFields([]);
    setFieldValues({});
    setCustomFields([]);
    setFileName(name);
    setPdfBytes(uint8Array);
    if (originalPdfUrl) URL.revokeObjectURL(originalPdfUrl);
    setOriginalPdfUrl(URL.createObjectURL(new Blob([uint8Array as any], { type: 'application/pdf' })));
    setIsProcessing(true);
    setIsVisualEditMode(false);

    try {
      const pdfDoc = await PDFDocument.load(uint8Array);
      const form = pdfDoc.getForm();
      const formFields = form.getFields();
      
      if (formFields.length === 0) {
        // No acroform fields found. Switch to visual edit mode.
        setIsVisualEditMode(true);
        setSuccessMsg('No form fields found. Switched to Visual Edit Mode. Click anywhere on the PDF to add text.');
        setIsProcessing(false);
        return;
      }

      const extractedFields: FormField[] = [];
      const initialValues: Record<string, any> = {};

      formFields.forEach(field => {
        const fieldName = field.getName();
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
          extractedFields.push({ name: fieldName, type, value, options });
          initialValues[fieldName] = value;
        }
      });

      setFields(extractedFields);
      setFieldValues(initialValues);
    } catch (err) {
      console.error(err);
      setError('Failed to parse PDF form fields.');
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

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (!isVisualEditMode) return;
    
    // Prevent adding if clicking on an existing input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newField: CustomTextField = {
      // eslint-disable-next-line react-hooks/purity
      id: Math.random().toString(36).substring(7),
      pageIndex,
      x,
      y,
      text: ''
    };

    setCustomFields(prev => [...prev, newField]);
    setFilledPdfUrl(null);
  };

  const updateCustomField = (id: string, text: string) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, text } : f));
  };

  const deleteCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const savePDF = async () => {
    if (!pdfBytes) return;

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);

      if (isVisualEditMode) {
        // Draw custom fields
        customFields.forEach(field => {
          if (!field.text.trim()) return;
          const page = pdfDoc.getPages()[field.pageIndex];
          const { width, height } = page.getSize();
          
          const ptX = (field.x / 100) * width;
          const ptY = height - ((field.y / 100) * height);
          
          page.drawText(field.text, {
            x: ptX,
            y: ptY - 12, // adjust for baseline
            size: 14,
            color: rgb(0, 0, 0)
          });
        });
      } else {
        // Fill form fields
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
      }

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
    a.download = `filled_${fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetTool = () => {
    setFileName('');
    setFields([]);
    setFieldValues({});
    setCustomFields([]);
    setFilledPdfUrl(null);
    setSuccessMsg(null);
    setError(null);
    setPdfBytes(null);
    setShowSaveTemplate(false);
    setIsVisualEditMode(false);
  };

  const formatFieldName = (name: string) => {
    return name
      .replace(/[_.-]/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="tool-container" style={{ maxWidth: isVisualEditMode ? '100%' : '1200px' }}>
      <div className="tool-header">
        <h2 className="tool-title">PDF Entry & Templates</h2>
        <p className="tool-subtitle">Upload a fillable PDF to auto-fill fields, or upload a standard PDF to visually click and type text anywhere.</p>
      </div>

      {!pdfBytes ? (
        <>
          <div 
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="dropzone-icon" size={48} />
            <p className="dropzone-text">Click or drag a PDF here</p>
            <p className="dropzone-subtext">Upload a new PDF to fill out or save as template</p>
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden-input" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          {templates.length > 0 && (
            <div className="controls-panel" style={{ marginTop: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <FolderOpen size={20} /> My Saved Templates
              </h3>
              <div className="file-list">
                {templates.map(template => (
                  <div key={template.id} className="file-item" style={{ cursor: 'pointer' }} onClick={() => loadFromTemplate(template)}>
                    <div className="file-info">
                      <Bookmark className="file-icon" size={24} />
                      <div>
                        <div className="file-name">{template.name}</div>
                        <div className="file-size">Saved on {new Date(template.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <button 
                      className="icon-btn" 
                      onClick={(e) => deleteTemplate(template.id, e)}
                      title="Delete Template"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="file-list">
          <div className="file-item" style={{ cursor: 'default', transform: 'none', boxShadow: 'none' }}>
            <div className="file-info">
              <File className="file-icon" size={24} />
              <div>
                <div className="file-name">{fileName}</div>
                <div className="file-size">
                  {isVisualEditMode ? 'Visual Edit Mode' : `${fields.length} editable fields found`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!templates.find(t => t.data === pdfBytes) && (
                <button 
                  className="icon-btn move-btn" 
                  onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                  title="Save as Template"
                >
                  <Bookmark size={18} />
                </button>
              )}
              <button className="icon-btn" onClick={resetTool} title="Close / Upload another">
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {showSaveTemplate && (
            <div className="controls-panel" style={{ background: 'rgba(139, 92, 246, 0.1)', borderColor: 'var(--primary)' }}>
              <label className="input-label">Save this PDF as a reusable template (e.g. "Form 410"):</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  className="text-input" 
                  style={{ flex: 1 }}
                  placeholder="Template Name..."
                  value={templateNameInput}
                  onChange={e => setTemplateNameInput(e.target.value)}
                />
                <button 
                  className="primary-btn" 
                  style={{ width: 'auto', marginTop: 0, padding: '0.8rem 1.5rem' }}
                  onClick={saveTemplateToDb}
                  disabled={!templateNameInput.trim()}
                >
                  Save Template
                </button>
              </div>
            </div>
          )}

          {/* VISUAL EDIT MODE FOR NON-FILLABLE PDFS */}
          {isVisualEditMode && (
             <div className="controls-panel" style={{ background: '#e2e8f0', color: '#0f172a', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <Edit3 size={18} /> Click anywhere on the pages to add text
               </h3>
               
               {originalPdfUrl && (
                 <Document
                   file={originalPdfUrl}
                 onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                 loading={<div className="spinner"></div>}
               >
                 {Array.from({ length: numPages }, (_, index) => (
                   <div 
                     key={`page_${index + 1}`} 
                     style={{ position: 'relative', marginBottom: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                     onClick={(e) => handlePageClick(e, index)}
                   >
                     <Page 
                       pageNumber={index + 1} 
                       renderTextLayer={false} 
                       renderAnnotationLayer={false}
                       width={800} // fixed width for consistency
                     />
                     
                     {/* Render custom text fields for this page */}
                     {customFields.filter(f => f.pageIndex === index).map(field => (
                       <div 
                         key={field.id}
                         style={{
                           position: 'absolute',
                           left: `${field.x}%`,
                           top: `${field.y}%`,
                           transform: 'translate(0, -50%)',
                           zIndex: 10
                         }}
                         onClick={e => e.stopPropagation()} // prevent adding new field when clicking existing
                       >
                         <input
                           autoFocus
                           type="text"
                           value={field.text}
                           onChange={e => updateCustomField(field.id, e.target.value)}
                           style={{
                             background: 'rgba(255, 255, 255, 0.9)',
                             border: '2px solid var(--primary)',
                             borderRadius: '4px',
                             padding: '4px 8px',
                             fontSize: '14px',
                             color: 'black',
                             outline: 'none',
                             minWidth: '150px',
                             boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                           }}
                           placeholder="Type here..."
                         />
                         <button 
                           onClick={() => deleteCustomField(field.id)}
                           style={{
                             position: 'absolute',
                             right: '-24px',
                             top: '50%',
                             transform: 'translateY(-50%)',
                             background: 'red',
                             color: 'white',
                             border: 'none',
                             borderRadius: '50%',
                             width: '20px',
                             height: '20px',
                             cursor: 'pointer',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             fontSize: '12px'
                           }}
                         >
                           ×
                         </button>
                       </div>
                     ))}
                   </div>
                 ))}
               </Document>
               )}
             </div>
          )}

          {/* ACROFORM EDIT MODE */}
          {!isVisualEditMode && fields.length > 0 && (
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

          {(!isVisualEditMode ? fields.length > 0 : true) && !filledPdfUrl ? (
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
