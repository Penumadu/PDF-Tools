import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { getToolBySlug } from '../data/tools';
import { Globe, FileText } from 'lucide-react';

export const HTMLToPDF: React.FC = () => {
  const tool = getToolBySlug('html-to-pdf')!;
  
  const [htmlContent, setHtmlContent] = useState('');
  
  const handlePrint = () => {
    if (!htmlContent.trim()) return;

    // Create a new window or iframe to render the HTML and print it
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>HTML to PDF Print</title>
          <style>
            body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
            img { max-width: 100%; }
            @media print {
              body { padding: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() { 
              setTimeout(function() { 
                window.print(); 
                window.close();
              }, 500); 
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <ToolPage tool={tool}>
      <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: '50%', 
            background: tool.colorLight, color: tool.color, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Globe size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Print HTML to PDF</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Paste HTML content below. We'll render it and open the browser's native print dialog where you can choose "Save as PDF".
          </p>
        </div>

        <div className="input-group" style={{ marginBottom: 24 }}>
          <label className="input-label">HTML Content</label>
          <textarea 
            className="text-input" 
            rows={10} 
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="<h1>Hello World</h1><p>This is a paragraph.</p>"
            style={{ resize: 'vertical' }}
          />
        </div>

        <button 
          className="btn btn-primary btn-full btn-lg" 
          onClick={handlePrint}
          disabled={!htmlContent.trim()}
          style={{ background: tool.color }}
        >
          <FileText size={20} />
          Preview & Print to PDF
        </button>
      </div>
    </ToolPage>
  );
};
