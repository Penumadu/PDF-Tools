import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Configure PDF.js worker - use Vite's new URL() asset resolution with CDN fallback
try {
  const workerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
} catch {
  // Fallback to CDN if local resolution fails
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/**
 * Load a PDF file into a PDFDocument (pdf-lib)
 */
export async function loadPDFDocument(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  return PDFDocument.load(arrayBuffer);
}

/**
 * Load a PDF file into a PDFDocument from Uint8Array
 */
export async function loadPDFFromBytes(bytes: Uint8Array, password?: string): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, password } as any);
  return pdfDoc;
}

/**
 * Load a PDF file for rendering with pdfjs
 */
export async function loadPDFForRendering(file: File): Promise<pdfjs.PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  return pdfjs.getDocument({ data: arrayBuffer }).promise;
}

/**
 * Render a single PDF page to a canvas element
 */
export async function renderPageToCanvas(
  pdfDoc: pdfjs.PDFDocumentProxy,
  pageNum: number,
  scale: number = 1.5
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport } as any).promise;
  return canvas;
}

/**
 * Generate a thumbnail for a PDF page
 */
export async function generateThumbnail(
  pdfDoc: pdfjs.PDFDocumentProxy,
  pageNum: number,
  maxWidth: number = 200
): Promise<string> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  await page.render({ canvasContext: context, viewport: scaledViewport } as any).promise;
  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Convert a PDF page to an image blob
 */
export async function pageToImageBlob(
  pdfDoc: pdfjs.PDFDocumentProxy,
  pageNum: number,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.92,
  scale: number = 2
): Promise<Blob> {
  const canvas = await renderPageToCanvas(pdfDoc, pageNum, scale);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert page to image'));
      },
      format,
      quality
    );
  });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

/**
 * Download PDF bytes as a file
 */
export function downloadPDFBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  saveAs(blob, filename);
}

/**
 * Create a ZIP file from multiple blobs
 */
export async function createZipFromBlobs(
  files: Array<{ name: string; blob: Blob }>
): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.blob);
  }
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file name without extension
 */
export function getFileBaseName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}
