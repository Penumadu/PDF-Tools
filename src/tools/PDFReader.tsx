import React, { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFForRendering } from '../utils/pdfUtils';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize } from 'lucide-react';

export const PDFReader: React.FC = () => {
  const tool = getToolBySlug('pdf-reader')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pdfProxy, setPdfProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setCurrentPage(1);
    setScale(1.2);

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
    let renderTask: pdfjs.RenderTask | null = null;
    
    const renderPage = async () => {
      if (!pdfProxy || !canvasRef.current) return;
      
      const page = await pdfProxy.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d')!;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      if (renderTask) {
        renderTask.cancel();
      }

      renderTask = page.render({ canvasContext: context, viewport } as any);
      try {
        await renderTask.promise;
      } catch (err) {
        // Handle cancelled render tasks gracefully
        if ((err as any).name !== 'RenderingCancelledException') {
          console.error('Render error', err);
        }
      }
    };

    if (pdfProxy && canvasRef.current) {
      renderPage();
    }
    
    return () => {
      if (renderTask) renderTask.cancel();
    };
  }, [pdfProxy, currentPage, scale]);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const reset = () => {
    setFile(null);
    setPdfProxy(null);
    setError(null);
  };

  return (
    <ToolPage tool={tool}>
      {!isProcessing && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to read"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading PDF..." />}

      {!isProcessing && file && pdfProxy && (
        <div ref={containerRef} style={{ background: '#e2e8f0', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '80vh', maxHeight: 800 }}>
          {/* Toolbar */}
          <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {file.name}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 20, padding: 4 }}>
                <button className="icon-btn" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}><ZoomOut size={16} /></button>
                <span style={{ fontSize: '0.85rem', padding: '0 8px', fontWeight: 500 }}>{Math.round(scale * 100)}%</span>
                <button className="icon-btn" onClick={() => setScale(s => Math.min(3, s + 0.2))}><ZoomIn size={16} /></button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 20, padding: 4 }}>
                <button className="icon-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: '0.85rem', padding: '0 8px', fontWeight: 500 }}>{currentPage} / {numPages}</span>
                <button className="icon-btn" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages}><ChevronRight size={16} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="icon-btn" onClick={toggleFullscreen} title="Toggle Fullscreen"><Maximize size={16} /></button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={reset}>Close</button>
            </div>
          </div>

          {/* Canvas Area */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ boxShadow: 'var(--shadow-lg)', background: 'white' }}>
              <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
            </div>
          </div>
        </div>
      )}
    </ToolPage>
  );
};
