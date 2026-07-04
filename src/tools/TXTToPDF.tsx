import React, { useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { X } from 'lucide-react';

export const TXTToPDF: React.FC = () => {
  const tool = getToolBySlug('txt-to-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState<number>(11);
  const [fontColor, setFontColor] = useState<string>('#1e293b');

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    setFile(files[0]);
    setError(null);
  };

  const processFile = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read text file.'));
        reader.readAsText(file);
      });

      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Letter size: 612 x 792 points
      const pageWidth = 612;
      const pageHeight = 792;
      const margin = 50;
      const maxLineWidth = pageWidth - margin * 2;
      const lineHeight = fontSize * 1.4;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      // Hex to RGB
      const r = parseInt(fontColor.slice(1, 3), 16) / 255;
      const g = parseInt(fontColor.slice(3, 5), 16) / 255;
      const b = parseInt(fontColor.slice(5, 7), 16) / 255;

      const paragraphs = text.split(/\r?\n/);

      for (const para of paragraphs) {
        // If empty line
        if (!para.trim()) {
          y -= lineHeight;
          if (y < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          continue;
        }

        const words = para.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const width = helveticaFont.widthOfTextAtSize(testLine, fontSize);

          if (width > maxLineWidth && currentLine) {
            page.drawText(currentLine, {
              x: margin,
              y,
              size: fontSize,
              font: helveticaFont,
              color: rgb(r, g, b)
            });
            y -= lineHeight;
            if (y < margin) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font: helveticaFont,
            color: rgb(r, g, b)
          });
          y -= lineHeight;
          if (y < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to convert Text to PDF.');
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
      resultFilename={`${file?.name.replace(/\.[^/.]+$/, '') || 'document'}.pdf`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="Text file converted to PDF successfully!"
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept=".txt"
          label="Drop your text (.txt) file here"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Converting text to PDF..." />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <tool.icon size={32} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
              <button className="icon-btn danger" onClick={reset} title="Remove file" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Font Size ({fontSize}px)</label>
            <input 
              type="range" 
              min="9" 
              max="24" 
              value={fontSize} 
              onChange={e => setFontSize(Number(e.target.value))} 
              className="range-slider"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Text Color</label>
            <input 
              type="color" 
              value={fontColor} 
              onChange={e => setFontColor(e.target.value)} 
              style={{ width: '100%', height: 40, border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}
            />
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={processFile}
            style={{ background: tool.color }}
          >
            Convert to PDF
          </button>
        </div>
      )}
    </ToolPage>
  );
};
