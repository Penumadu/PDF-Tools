import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import type * as pdfjs from 'pdfjs-dist';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, renderPageToCanvas } from '../utils/pdfUtils';
import { Type, Image as ImageIcon, Square, Circle, Minus, MousePointer2, X } from 'lucide-react';

interface TextAnnotation {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  pageIndex: number;
}

export const EditPDF: React.FC = () => {
  const tool = getToolBySlug('edit-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pdfProxy, setPdfProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'text'>('select');
  const [textColor, setTextColor] = useState('#000000');
  const [textSize, setTextSize] = useState(16);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setAnnotations([]);
    setCurrentPage(1);

    try {
      const proxy = await loadPDFForRendering(selectedFile);
      setPdfProxy(proxy);
      setNumPages(proxy.numPages);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfProxy || !canvasRef.current) return;
      
      const page = await pdfProxy.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d')!;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport } as any).promise;
    };

    if (pdfProxy && canvasRef.current) {
      renderPage();
    }
  }, [pdfProxy, currentPage]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'text' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const text = prompt('Enter text:');
    if (text) {
      setAnnotations(prev => [...prev, {
        id: Math.random().toString(),
        type: 'text',
        text,
        x,
        y,
        color: textColor,
        size: textSize,
        pageIndex: currentPage - 1
      }]);
    }
    setActiveTool('select');
  };

  const removeAnnotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const savePDF = async () => {
    if (!file) return;
    setIsSaving(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      
      // Need scale factor to map screen coordinates to PDF coordinates
      const proxy = await loadPDFForRendering(file);
      
      for (const ann of annotations) {
        const page = pdfDoc.getPage(ann.pageIndex);
        const { width, height } = page.getSize();
        
        // Simple heuristic for scale mapping (assuming 1.5 scale in render)
        const pdfPageProxy = await proxy.getPage(ann.pageIndex + 1);
        const viewport = pdfPageProxy.getViewport({ scale: 1.5 });
        const scaleX = width / viewport.width;
        const scaleY = height / viewport.height;

        // Convert hex to rgb for pdf-lib
        const r = parseInt(ann.color.slice(1, 3), 16) / 255;
        const g = parseInt(ann.color.slice(3, 5), 16) / 255;
        const b = parseInt(ann.color.slice(5, 7), 16) / 255;

        // Y-axis is flipped in PDF compared to DOM
        page.drawText(ann.text, {
          x: ann.x * scaleX,
          y: height - (ann.y * scaleY) - ann.size, 
          size: ann.size * scaleY, // Scale font size accordingly
          color: rgb(r, g, b),
        });
      }
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to save edited PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPdfProxy(null);
    setAnnotations([]);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`edited-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to edit"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading PDF..." />}
      {isSaving && <ProcessingOverlay message="Saving your edits..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pdfProxy && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Main Editor Area */}
          <div style={{ flex: '1 1 auto', overflow: 'hidden', background: '#e2e8f0', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto' }}>
                <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
                <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>
              <button className="btn btn-secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <span>Page {currentPage} of {numPages}</span>
              <button className="btn btn-secondary" disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>

            <div 
              ref={containerRef}
              style={{ position: 'relative', display: 'inline-block', cursor: activeTool === 'text' ? 'text' : 'default', boxShadow: 'var(--shadow-xl)' }}
              onClick={handleCanvasClick}
            >
              <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto', background: 'white' }} />
              
              {/* Render Annotations for current page */}
              {annotations.filter(a => a.pageIndex === currentPage - 1).map(ann => (
                <div 
                  key={ann.id}
                  style={{
                    position: 'absolute',
                    left: ann.x,
                    top: ann.y,
                    color: ann.color,
                    fontSize: `${ann.size}px`,
                    whiteSpace: 'nowrap',
                    pointerEvents: activeTool === 'select' ? 'auto' : 'none',
                    border: activeTool === 'select' ? '1px dashed #3b82f6' : 'none',
                    padding: 2,
                    cursor: activeTool === 'select' ? 'pointer' : 'default',
                    userSelect: 'none'
                  }}
                  onClick={(e) => {
                    if (activeTool === 'select') {
                      e.stopPropagation();
                      // Could implement edit text here
                    }
                  }}
                >
                  {ann.text}
                  {activeTool === 'select' && (
                    <div 
                      onClick={(e) => removeAnnotation(ann.id, e)}
                      style={{ position: 'absolute', top: -10, right: -10, background: 'red', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                    >
                      ×
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tools Sidebar */}
          <div className="controls-panel" style={{ flex: '0 0 280px', marginTop: 0, position: 'sticky', top: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: '1.05rem' }}>Edit Tools</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              <button 
                className={`btn ${activeTool === 'select' ? 'btn-primary' : 'btn-secondary'}`}
                style={activeTool === 'select' ? { background: tool.color } : {}}
                onClick={() => setActiveTool('select')}
              >
                <MousePointer2 size={16} /> Select
              </button>
              <button 
                className={`btn ${activeTool === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                style={activeTool === 'text' ? { background: tool.color } : {}}
                onClick={() => setActiveTool('text')}
              >
                <Type size={16} /> Text
              </button>
            </div>

            {activeTool === 'text' && (
              <div style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid var(--border-light)', marginBottom: 24 }}>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <label className="input-label">Color</label>
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ width: '100%', height: 40, cursor: 'pointer' }} />
                </div>
                <div className="input-group">
                  <label className="input-label">Font Size ({textSize}px)</label>
                  <input type="range" min="8" max="72" value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="range-slider" />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                  Click anywhere on the PDF to add text
                </p>
              </div>
            )}

            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={savePDF}
              style={{ background: tool.color }}
            >
              Save PDF
            </button>
          </div>
        </div>
      )}
    </ToolPage>
  );
};
