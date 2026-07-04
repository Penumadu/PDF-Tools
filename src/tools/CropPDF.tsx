import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import type * as pdfjs from 'pdfjs-dist';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFForRendering, loadPDFDocument } from '../utils/pdfUtils';
import { X, Crop } from 'lucide-react';

export const CropPDF: React.FC = () => {
  const tool = getToolBySlug('crop-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pdfProxy, setPdfProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  // Crop margins in percentage of page size
  const [cropLeft, setCropLeft] = useState(10);
  const [cropRight, setCropRight] = useState(10);
  const [cropTop, setCropTop] = useState(10);
  const [cropBottom, setCropBottom] = useState(10);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setCropLeft(10);
    setCropRight(10);
    setCropTop(10);
    setCropBottom(10);

    try {
      const proxy = await loadPDFForRendering(selectedFile);
      setPdfProxy(proxy);
      
      const page = await proxy.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
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
      if (!pdfProxy || !canvasRef.current) return;
      const page = await pdfProxy.getPage(1);
      
      // Scale to fit screen preview width (~300px)
      const scale = 300 / pageWidth;
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport } as any).promise;
    };

    if (pdfProxy && pageWidth > 0) {
      renderPage();
    }
  }, [pdfProxy, pageWidth]);

  const applyCrop = async () => {
    if (!file) return;
    setIsSaving(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      const pages = pdfDoc.getPages();

      pages.forEach(page => {
        const { width, height } = page.getSize();
        
        // Calculate crop bounds in points
        const left = (cropLeft / 100) * width;
        const right = (cropRight / 100) * width;
        const top = (cropTop / 100) * height;
        const bottom = (cropBottom / 100) * height;

        const cropX = left;
        const cropY = bottom;
        const cropW = width - left - right;
        const cropH = height - top - bottom;

        if (cropW > 10 && cropH > 10) {
          page.setCropBox(cropX, cropY, cropW, cropH);
          page.setMediaBox(cropX, cropY, cropW, cropH);
        }
      });

      const croppedBytes = await pdfDoc.save();
      const blob = new Blob([croppedBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to crop PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPdfProxy(null);
    setResultUrl(null);
    setError(null);
  };

  // Preview dimensions scale
  const previewWidth = 300;
  const previewHeight = pageWidth > 0 ? (pageHeight / pageWidth) * previewWidth : 400;

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`cropped-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="PDF pages cropped successfully!"
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to crop pages"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading PDF preview..." />}
      {isSaving && <ProcessingOverlay message="Cropping PDF pages..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pdfProxy && (
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 900, margin: '0 auto' }}>
          
          {/* Left: Preview Panel */}
          <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ marginBottom: 12, fontSize: '0.9rem', color: '#64748b' }}>Page 1 Preview</h4>
            <div style={{ position: 'relative', width: previewWidth, height: previewHeight, background: '#f8fafc', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)', borderRadius: 6, overflow: 'hidden' }}>
              <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
              
              {/* Crop box overlay */}
              <div 
                style={{
                  position: 'absolute',
                  left: `${cropLeft}%`,
                  top: `${cropTop}%`,
                  width: `${100 - cropLeft - cropRight}%`,
                  height: `${100 - cropTop - cropBottom}%`,
                  border: `2px dashed ${tool.color}`,
                  background: 'rgba(37, 99, 235, 0.05)',
                  boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.4)',
                  pointerEvents: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 12 }}>Dashed line shows the cropped output area</span>
          </div>

          {/* Right: Controls Panel */}
          <div className="controls-panel" style={{ flex: '1 1 350px', marginTop: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <div>
                <strong style={{ fontSize: '1.05rem' }}>{file.name}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Original Size: {Math.round(pageWidth)} x {Math.round(pageHeight)} pt</div>
              </div>
              <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  <span>Crop Left</span>
                  <span>{cropLeft}%</span>
                </div>
                <input type="range" className="range-slider" min="0" max="45" value={cropLeft} onChange={e => setCropLeft(Number(e.target.value))} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  <span>Crop Right</span>
                  <span>{cropRight}%</span>
                </div>
                <input type="range" className="range-slider" min="0" max="45" value={cropRight} onChange={e => setCropRight(Number(e.target.value))} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  <span>Crop Top</span>
                  <span>{cropTop}%</span>
                </div>
                <input type="range" className="range-slider" min="0" max="45" value={cropTop} onChange={e => setCropTop(Number(e.target.value))} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  <span>Crop Bottom</span>
                  <span>{cropBottom}%</span>
                </div>
                <input type="range" className="range-slider" min="0" max="45" value={cropBottom} onChange={e => setCropBottom(Number(e.target.value))} />
              </div>
            </div>

            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={applyCrop}
              style={{ background: tool.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Crop size={18} /> Crop PDF
            </button>
          </div>

        </div>
      )}
    </ToolPage>
  );
};
