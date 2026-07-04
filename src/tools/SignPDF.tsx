import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import type * as pdfjs from 'pdfjs-dist';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering } from '../utils/pdfUtils';
import { PenTool, Type, Image as ImageIcon } from 'lucide-react';

export const SignPDF: React.FC = () => {
  const tool = getToolBySlug('sign-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pdfProxy, setPdfProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sigPadRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [typedSignature, setTypedSignature] = useState('John Doe');

  const [signaturePosition, setSignaturePosition] = useState<{x: number, y: number} | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);

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
      if (!pdfProxy || !pdfCanvasRef.current) return;
      
      const page = await pdfProxy.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d')!;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport } as any).promise;
    };

    if (pdfProxy && pdfCanvasRef.current) {
      renderPage();
    }
  }, [pdfProxy, currentPage]);

  // Drawing Pad Logic
  useEffect(() => {
    if (activeTab === 'draw' && sigPadRef.current) {
      const canvas = sigPadRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000000';
    }
  }, [activeTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImage(null);
  };

  const saveSignature = () => {
    if (activeTab === 'draw' && sigPadRef.current) {
      setSignatureImage(sigPadRef.current.toDataURL('image/png'));
    } else if (activeTab === 'type') {
      // Create a canvas to render the typed text as an image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.font = 'italic 48px serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(typedSignature, 20, 60);
      setSignatureImage(canvas.toDataURL('image/png'));
    }
  };

  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!signatureImage || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSignaturePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const saveSignedPdf = async () => {
    if (!file || !signatureImage || !signaturePosition) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      
      const proxy = await loadPDFForRendering(file);
      const pdfPageProxy = await proxy.getPage(currentPage);
      const viewport = pdfPageProxy.getViewport({ scale: 1.5 });
      
      const page = pdfDoc.getPage(currentPage - 1);
      const { width, height } = page.getSize();
      
      const scaleX = width / viewport.width;
      const scaleY = height / viewport.height;

      // Fetch the signature image data URL and embed it
      const sigImageBytes = await fetch(signatureImage).then(res => res.arrayBuffer());
      const pdfImage = await pdfDoc.embedPng(sigImageBytes);
      
      const sigDims = pdfImage.scale(0.5); // Adjust size as needed

      page.drawImage(pdfImage, {
        x: signaturePosition.x * scaleX,
        y: height - (signaturePosition.y * scaleY) - (sigDims.height * scaleY),
        width: sigDims.width * scaleX,
        height: sigDims.height * scaleY,
      });
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to save signed PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPdfProxy(null);
    setSignatureImage(null);
    setSignaturePosition(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`signed-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to sign"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading PDF..." />}
      {isSaving && <ProcessingOverlay message="Applying signature..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pdfProxy && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Main Viewer Area */}
          <div style={{ flex: '1 1 auto', overflow: 'hidden', background: '#e2e8f0', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
              <button className="btn btn-secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <span>Page {currentPage} of {numPages}</span>
              <button className="btn btn-secondary" disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>

            <div 
              ref={containerRef}
              style={{ position: 'relative', display: 'inline-block', cursor: signatureImage ? 'crosshair' : 'default', boxShadow: 'var(--shadow-xl)' }}
              onClick={handlePdfClick}
            >
              <canvas ref={pdfCanvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto', background: 'white' }} />
              
              {/* Render Signature Preview */}
              {signatureImage && signaturePosition && (
                <div 
                  style={{
                    position: 'absolute',
                    left: signaturePosition.x,
                    top: signaturePosition.y,
                    pointerEvents: 'none',
                    border: '1px dashed #10b981'
                  }}
                >
                  <img src={signatureImage} alt="Signature Preview" style={{ width: 200, height: 'auto' }} />
                </div>
              )}
            </div>
          </div>

          {/* Tools Sidebar */}
          <div className="controls-panel" style={{ flex: '0 0 320px', marginTop: 0, position: 'sticky', top: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: '1.05rem' }}>Create Signature</h3>
            
            <div className="tabs">
              <button className={`tab ${activeTab === 'draw' ? 'active' : ''}`} onClick={() => setActiveTab('draw')}><PenTool size={16} /></button>
              <button className={`tab ${activeTab === 'type' ? 'active' : ''}`} onClick={() => setActiveTab('type')}><Type size={16} /></button>
              <button className={`tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}><ImageIcon size={16} /></button>
            </div>

            <div style={{ marginBottom: 24 }}>
              {activeTab === 'draw' && (
                <div className="signature-pad-container">
                  <canvas 
                    ref={sigPadRef} 
                    className="signature-pad"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                  />
                  <div className="signature-controls">
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={clearSignature}>Clear</button>
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem', background: tool.color }} onClick={saveSignature}>Create</button>
                  </div>
                </div>
              )}

              {activeTab === 'type' && (
                <div>
                  <input 
                    type="text" 
                    className="text-input" 
                    style={{ width: '100%', marginBottom: 12, fontSize: '1.2rem', fontFamily: 'serif', fontStyle: 'italic' }} 
                    value={typedSignature}
                    onChange={e => setTypedSignature(e.target.value)}
                  />
                  <button className="btn btn-primary btn-full" onClick={saveSignature} style={{ background: tool.color }}>Create</button>
                </div>
              )}

              {activeTab === 'upload' && (
                <div>
                  <input type="file" accept="image/png,image/jpeg" onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setSignatureImage(event.target?.result as string);
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                </div>
              )}
            </div>

            {signatureImage && (
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 24, textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Current Signature</p>
                <img src={signatureImage} alt="Signature" style={{ maxWidth: '100%', maxHeight: 80, background: 'white', border: '1px solid var(--border-light)' }} />
                <p style={{ fontSize: '0.8rem', color: tool.color, marginTop: 8, fontWeight: 500 }}>
                  Click anywhere on the PDF to place
                </p>
              </div>
            )}

            <button 
              className="btn btn-primary btn-full btn-lg" 
              onClick={saveSignedPdf}
              disabled={!signatureImage || !signaturePosition}
              style={{ background: tool.color }}
            >
              Finish & Download
            </button>
          </div>
        </div>
      )}
    </ToolPage>
  );
};
