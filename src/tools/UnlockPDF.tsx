import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { Unlock } from 'lucide-react';

export const UnlockPDF: React.FC = () => {
  const tool = getToolBySlug('unlock-pdf')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    
    // Quick check if file is actually encrypted
    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      if (!pdfDoc.isEncrypted) {
        setError('This PDF is not password protected.');
        return;
      }
    } catch (e) {
      // It's likely encrypted, which is what we want
    }

    setFile(selectedFile);
    setError(null);
  };

  const attemptUnlock = async () => {
    if (!file || !password) return;

    setIsProcessing(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      // Try to load with the provided password
      const pdfDoc = await PDFDocument.load(buffer, { password } as any);
      
      // Save it (this removes the encryption by default in pdf-lib)
      const unlockedBytes = await pdfDoc.save();
      const blob = new Blob([unlockedBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('password')) {
        setError('Incorrect password. Please try again.');
      } else {
        setError('Failed to unlock PDF. The file might be corrupted.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
    setPassword('');
  };

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`unlocked-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop protected PDF here to unlock"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Verifying password..." />}

      {!isProcessing && !resultUrl && file && (
        <div className="controls-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: tool.colorLight, color: tool.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Unlock size={32} />
            </div>
            <strong style={{ fontSize: '1.1rem' }}>{file.name}</strong>
            <p style={{ color: 'var(--text-secondary)' }}>Enter the password to remove protection</p>
          </div>

          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="text-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter current password"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && attemptUnlock()}
            />
          </div>

          <button 
            className="btn btn-primary btn-full btn-lg" 
            onClick={attemptUnlock}
            disabled={!password}
            style={{ background: tool.color }}
          >
            Unlock PDF
          </button>
        </div>
      )}
    </ToolPage>
  );
};
