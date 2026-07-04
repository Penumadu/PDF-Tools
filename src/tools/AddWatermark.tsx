import React, { useState } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument } from '../utils/pdfUtils';
import { X } from 'lucide-react';

export const AddWatermark: React.FC = () => {
  const tool = getToolBySlug('add-watermark')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState<string>('CONFIDENTIAL');
  const [opacity, setOpacity] = useState<number>(0.3);
  const [rotation, setRotation] = useState<number>(45);
  const [fontSize, setFontSize] = useState<number>(72);
  const [color, setColor] = useState<string>('#000000');

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    setFile(files[0]);
    setError(null);
  };

  const applyWatermark = async () => {
    if (!file || !text) return;

    setIsSaving(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pages = pdfDoc.getPages();
      
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);
      const textHeight = helveticaFont.heightAtSize(fontSize);

      pages.forEach((page) => {
        const { width, height } = page.getSize();
        
        page.drawText(text, {
          x: width / 2 - (textWidth / 2 * Math.cos((rotation * Math.PI) / 180)),
          y: height / 2 - (textWidth / 2 * Math.sin((rotation * Math.PI) / 180)),
          size: fontSize,
          font: helveticaFont,
          color: rgb(r, g, b),
          opacity: opacity,
          rotate: degrees(rotation),
        });
      });
      
      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to add watermark.');
    } finally {
      setIsSaving(false);
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
      resultFilename={`watermarked-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to add watermark"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isSaving && <ProcessingOverlay message="Stamping watermark..." />}

      {!isSaving && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
              <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Watermark Text</label>
            <input 
              type="text" 
              className="text-input" 
              value={text} 
              onChange={e => setText(e.target.value)} 
              placeholder="e.g. DRAFT, CONFIDENTIAL"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Color</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '100%', height: 40, cursor: 'pointer' }} />
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Opacity ({Math.round(opacity * 100)}%)</label>
            <input type="range" className="range-slider" min="0.05" max="1" step="0.05" value={opacity} onChange={e => setOpacity(Number(e.target.value))} />
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Rotation ({rotation}°)</label>
            <input type="range" className="range-slider" min="0" max="360" value={rotation} onChange={e => setRotation(Number(e.target.value))} />
          </div>
          
          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Font Size ({fontSize}px)</label>
            <input type="range" className="range-slider" min="12" max="144" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={applyWatermark}
            disabled={!text.trim()}
            style={{ background: tool.color }}
          >
            Apply Watermark
          </button>
        </div>
      )}
    </ToolPage>
  );
};
