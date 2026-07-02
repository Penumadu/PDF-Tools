import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { Code, Copy, Check } from 'lucide-react';

export const ImageToBase64: React.FC = () => {
  const tool = getToolBySlug('image-to-base64')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [base64, setBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    setFile(imageFiles[0]);
    setError(null);
    processToBase64(imageFiles[0]);
  };

  const processToBase64 = (targetFile: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setBase64(e.target.result as string);
      } else {
        setError('Failed to convert image to Base64.');
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(targetFile);
  };

  const reset = () => {
    setFile(null);
    setBase64(null);
    setError(null);
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (base64) {
      navigator.clipboard.writeText(base64).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={null} // Not using standard result layout
      resultFilename=""
      onReset={reset}
      showResult={false}
    >
      {!isProcessing && !base64 && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          accept="image/*"
          label="Drop image here to get Base64 string"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Converting to Base64..." />}

      {!isProcessing && base64 && file && (
        <div className="controls-panel" style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Code size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Base64 String</span>
              <button 
                onClick={copyToClipboard}
                style={{
                  background: 'none', border: 'none', 
                  color: tool.color, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: '0.9rem', fontWeight: 600
                }}
              >
                {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy to Clipboard</>}
              </button>
            </label>
            <textarea 
              readOnly 
              value={base64}
              style={{
                width: '100%',
                height: 200,
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                resize: 'vertical',
                background: '#f8fafc',
                color: '#334155'
              }}
            />
          </div>

          <button 
            className="btn btn-outline btn-full btn-lg" 
            onClick={reset}
          >
            Process Another Image
          </button>
        </div>
      )}
    </ToolPage>
  );
};
