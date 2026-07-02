const fs = require('fs');
const path = require('path');

const tools = [
  { name: 'AIPDFAssistant', slug: 'ai-pdf-assistant' },
  { name: 'ChatWithPDF', slug: 'chat-with-pdf' },
  { name: 'AIPDFSummarizer', slug: 'ai-pdf-summarizer' },
  { name: 'TranslatePDF', slug: 'translate-pdf' },
  { name: 'AIQuestionGenerator', slug: 'ai-question-generator' },
  { name: 'ExtractPDFPages', slug: 'extract-pdf-pages' },
  { name: 'PDFAnnotator', slug: 'pdf-annotator' },
  { name: 'CropPDF', slug: 'crop-pdf' },
  { name: 'RedactPDF', slug: 'redact-pdf' },
  { name: 'SharePDF', slug: 'share-pdf' },
  { name: 'PDFToWord', slug: 'pdf-to-word' },
  { name: 'PDFToExcel', slug: 'pdf-to-excel' },
  { name: 'PDFToPPT', slug: 'pdf-to-ppt' },
  { name: 'WordToPDF', slug: 'word-to-pdf' },
  { name: 'ExcelToPDF', slug: 'excel-to-pdf' },
  { name: 'PPTToPDF', slug: 'ppt-to-pdf' },
  { name: 'PDFOCR', slug: 'pdf-ocr' },
  { name: 'TXTToPDF', slug: 'txt-to-pdf' },
  { name: 'RTFToPDF', slug: 'rtf-to-pdf' },
  { name: 'ODTToPDF', slug: 'odt-to-pdf' },
  { name: 'EPUBToPDF', slug: 'epub-to-pdf' },
  { name: 'RequestSignatures', slug: 'request-signatures' },
  { name: 'PDFScanner', slug: 'pdf-scanner' },
  { name: 'PDFConverter', slug: 'pdf-converter' }
];

const template = (name, slug) => `import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';

export const ${name}: React.FC = () => {
  const tool = getToolBySlug('${slug}')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: File[]) => {
    setFile(files[0]);
    setError(null);
  };

  const processFile = () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    // Mock processing delay
    setTimeout(() => {
      setResultUrl(URL.createObjectURL(file));
      setIsProcessing(false);
    }, 1500);
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
      resultFilename={\`processed-\${file?.name}\`}
      onReset={reset}
      showResult={!!resultUrl}
      resultMessage="Processing Complete (Simulation)"
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="*/*"
          label={\`Drop file here for \${tool.name}\`}
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message={\`\${tool.name} in progress...\`} />}

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
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={processFile}
            style={{ background: tool.color }}
          >
            Start {tool.name}
          </button>
        </div>
      )}
    </ToolPage>
  );
};
`;

tools.forEach(t => {
  fs.writeFileSync(path.join(__dirname, '../src/tools', t.name + '.tsx'), template(t.name, t.slug));
});

console.log('Successfully generated 24 tool components.');
