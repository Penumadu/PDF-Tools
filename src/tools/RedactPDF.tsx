import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import type * as pdfjs from 'pdfjs-dist';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFForRendering, loadPDFDocument } from '../utils/pdfUtils';
import { X, ShieldAlert, ChevronLeft, ChevronRight, Square, Trash2 } from 'lucide-react';

interface RedactionBox {
  id: string;
  pageIndex: number;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
}

export const RedactPDF: React.FC = () => {
  const tool = getToolBySlug('redact-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pdfProxy, setPdfProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  const [redactions, setRedactions] = useState<RedactionBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setRedactions([]);
    setCurrentPage(1);

    try {
      const proxy = await loadPDFForRendering(selectedFile);
      setPdfProxy(proxy);
      setNumPages(proxy.numPages);
      
      const page = await proxy.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      setPageWidth(viewport.width);
      setPageHeight(viewport.height);
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
      if (!pdfProxy || !pdfCanvasRef.current) return;
      const page = await pdfProxy.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setPageWidth(viewport.width);
      setPageHeight(viewport.height);

      await page.render({ canvasContext: context, viewport } as any).promise;
    };

    if (pdfProxy) {
      renderPage();
    }
  }, [pdfProxy, currentPage]);

  // Adjust drawing canvas dimensions
  useEffect(() => {
    if (drawingCanvasRef.current && pageWidth > 0) {
      drawingCanvasRef.current.width = pageWidth;
      drawingCanvasRef.current.height = pageHeight;
    }
  }, [pageWidth, pageHeight, currentPage]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !drawingCanvasRef.current) return;
    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const w = Math.abs(startPos.x - currentX);
    const h = Math.abs(startPos.y - currentY);

    setCurrentBox({ x, y, w, h });

    // Draw preview box
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !drawingCanvasRef.current) return;
    setIsDrawing(false);

    // Convert pixels to percentages
    const pctX = (currentBox.x / pageWidth) * 100;
    const pctY = (currentBox.y / pageHeight) * 100;
    const pctW = (currentBox.w / pageWidth) * 100;
    const pctH = (currentBox.h / pageHeight) * 100;

    if (currentBox.w > 4 && currentBox.h > 4) {
      setRedactions(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          pageIndex: currentPage - 1,
          x: pctX,
          y: pctY,
          width: pctW,
          height: pctH
        }
      ]);
    }

    setCurrentBox(null);
    setStartPos(null);

    // Clear drawing canvas
    const ctx = drawingCanvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
  };

  const deleteRedaction = (id: string) => {
    setRedactions(prev => prev.filter(r => r.id !== id));
  };

  const applyRedactions = async () => {
    if (!file) return;
    setIsSaving(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      const pages = pdfDoc.getPages();

      redactions.forEach(box => {
        if (box.pageIndex >= pages.length) return;
        const page = pages[box.pageIndex];
        const { width, height } = page.getSize();

        // Convert percentage to point coords
        const rectX = (box.x / 100) * width;
        const rectY = height - ((box.y / 100) * height) - ((box.height / 100) * height);
        const rectW = (box.width / 100) * width;
        const rectH = (box.height / 100) * height;

        page.drawRectangle({
          x: rectX,
          y: rectY,
          width: rectW,
          height: rectH,
          color: rgb(0, 0, 0)
        });
      });

      const redactedBytes = await pdfDoc.save();
      const blob = new Blob([redactedBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to redact PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPdfProxy(null);
    setRedactions([]);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`redacted-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="All redactions permanently burned into the PDF successfully!"
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to redact sensitive data"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading PDF pages..." />}
      {isSaving && <ProcessingOverlay message="Applying permanent black-out redactions..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pdfProxy && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 1200, margin: '0 auto' }}>
          
          {/* Main Canvas Workspace */}
          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, padding: 24 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
              <button className="btn btn-secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Page {currentPage} of {numPages}</span>
              <button className="btn btn-secondary" disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
            </div>

            <div 
              ref={containerRef}
              style={{ position: 'relative', display: 'inline-block', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15)', cursor: 'crosshair', userSelect: 'none' }}
            >
              <canvas ref={pdfCanvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto', background: 'white' }} />
              
              <canvas 
                ref={drawingCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}
              />

              {/* Render existing redaction boxes on this page */}
              {redactions.filter(r => r.pageIndex === currentPage - 1).map(box => (
                <div 
                  key={box.id}
                  style={{
                    position: 'absolute',
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                    background: '#000000',
                    border: '1.5px solid #ef4444',
                    zIndex: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <button 
                    onClick={() => deleteRedaction(box.id)}
                    style={{ border: 'none', background: 'rgba(239, 68, 68, 0.85)', color: 'white', borderRadius: 4, padding: 3, cursor: 'pointer', zIndex: 15 }}
                    title="Remove redaction"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 12 }}>Click and drag to draw black-out redaction boxes over sensitive text</span>
          </div>

          {/* Right Sidebar */}
          <div className="controls-panel" style={{ flex: '0 0 300px', marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <strong style={{ fontSize: '1rem' }}>Redactions</strong>
              <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '6px' }}><X size={16} /></button>
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, background: '#fafafa', marginBottom: 20 }}>
              {redactions.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>No redaction boxes drawn yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {redactions.map((box, index) => (
                    <div key={box.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '6px 10px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                      <span>Box #{index + 1} (Page {box.pageIndex + 1})</span>
                      <button onClick={() => deleteRedaction(box.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 6, padding: 12, fontSize: '0.75rem', marginBottom: 20, display: 'flex', gap: 8 }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Warning:</strong> Redactions are permanently burned into the PDF document. Once saved, the obscured data cannot be retrieved.
              </div>
            </div>

            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={applyRedactions}
              disabled={redactions.length === 0}
              style={{ background: '#ef4444' }}
            >
              Apply & Save Redacted PDF
            </button>
          </div>

        </div>
      )}
    </ToolPage>
  );
};
