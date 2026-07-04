import React, { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFForRendering, pageToImageBlob, createZipFromBlobs } from '../utils/pdfUtils';
import { Download, Image as ImageIcon } from 'lucide-react';

interface ConvertedImage {
  pageNum: number;
  blob: Blob;
  url: string;
}

export const PDFToJPG: React.FC = () => {
  const tool = getToolBySlug('pdf-to-jpg')!;
  
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setImages([]);

    try {
      const pdfProxy = await loadPDFForRendering(selectedFile);
      const numPages = pdfProxy.numPages;
      const converted: ConvertedImage[] = [];

      for (let i = 1; i <= numPages; i++) {
        // High quality scale=2
        const blob = await pageToImageBlob(pdfProxy, i, 'image/jpeg', 0.95, 2);
        converted.push({
          pageNum: i,
          blob,
          url: URL.createObjectURL(blob)
        });
        setProgress(Math.round((i / numPages) * 100));
      }

      setImages(converted);
    } catch (err) {
      console.error(err);
      setError('Failed to convert PDF to JPG.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAllAsZip = async () => {
    if (images.length === 0 || !file) return;
    
    setIsProcessing(true);
    try {
      const filesToZip = images.map(img => ({
        name: `page-${img.pageNum}.jpg`,
        blob: img.blob
      }));
      
      const zipBlob = await createZipFromBlobs(filesToZip);
      const url = URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}-jpgs.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setError('Failed to create ZIP file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setImages([]);
    setProgress(0);
    setError(null);
  };

  return (
    <ToolPage tool={tool}>
      {!isProcessing && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to convert to JPG"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      
      {isProcessing && (
        <ProcessingOverlay 
          message={progress > 0 ? `Converting... ${progress}%` : "Loading PDF..."} 
          progress={progress} 
        />
      )}

      {!isProcessing && file && images.length > 0 && (
        <>
          <div className="result-section" style={{ background: tool.colorLight, borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className="result-icon" style={{ background: tool.color }}>
              <ImageIcon size={28} />
            </div>
            <div className="result-title" style={{ color: '#1e3a8a' }}>Conversion Complete!</div>
            <div className="result-subtitle" style={{ color: '#1e40af' }}>
              Converted {images.length} {images.length === 1 ? 'page' : 'pages'} to JPG format
            </div>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={downloadAllAsZip} style={{ background: tool.color }}>
                <Download size={20} />
                Download ZIP
              </button>
              <button className="btn btn-secondary btn-lg" onClick={reset}>
                Convert Another PDF
              </button>
            </div>
          </div>

          <h3 style={{ marginTop: 40, marginBottom: 16 }}>Individual Pages</h3>
          <div className="page-thumbnails-grid">
            {images.map((img) => (
              <div key={img.pageNum} className="page-thumbnail" style={{ height: 'auto', padding: 8 }}>
                <img src={img.url} alt={`Page ${img.pageNum}`} style={{ width: '100%', height: 'auto', borderRadius: 4 }} />
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <a 
                    href={img.url} 
                    download={`page-${img.pageNum}.jpg`}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%' }}
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ToolPage>
  );
};
