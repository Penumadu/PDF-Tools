import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import type * as pdfjs from 'pdfjs-dist';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, generateThumbnail } from '../utils/pdfUtils';
import { 
  Type, Image as ImageIcon, Square, Circle, Minus, MousePointer2, X, 
  Trash2, PenTool, Highlighter, Eraser, ArrowRight, ChevronLeft, ChevronRight, Download
} from 'lucide-react';

interface BaseAnnotation {
  id: string;
  type: 'text' | 'shape' | 'image';
  pageIndex: number;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage
  height: number; // percentage
}

interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  color: string;
  fontSize: number;
  bgColor: string;
  borderColor: string;
  borderWidth: number;
}

interface ShapeAnnotation extends BaseAnnotation {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'line' | 'arrow';
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
}

interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  dataUrl: string;
}

type Annotation = TextAnnotation | ShapeAnnotation | ImageAnnotation;

interface DrawingPath {
  points: { x: number; y: number }[]; // percentage (0 - 100)
  color: string;
  width: number;
  opacity: number;
}

const PALETTE_COLORS = [
  '#000000', // Black
  '#ffffff', // White
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#8b5cf6', // Purple
  'transparent' // Transparent
];

function hexToRgb(hex: string) {
  if (hex === 'transparent') return undefined;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  
  for (const para of paragraphs) {
    const words = para.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  return lines;
}

function drawArrowHead(page: any, startX: number, startY: number, endX: number, endY: number, thickness: number, color: any) {
  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx);
  const arrowLength = Math.max(10, thickness * 3);
  const arrowAngle = Math.PI / 6; // 30 degrees
  
  const x1 = endX - arrowLength * Math.cos(angle - arrowAngle);
  const y1 = endY - arrowLength * Math.sin(angle - arrowAngle);
  
  const x2 = endX - arrowLength * Math.cos(angle + arrowAngle);
  const y2 = endY - arrowLength * Math.sin(angle + arrowAngle);
  
  page.drawLine({
    start: { x: endX, y: endY },
    end: { x: x1, y: y1 },
    color,
    thickness
  });
  
  page.drawLine({
    start: { x: endX, y: endY },
    end: { x: x2, y: y2 },
    color,
    thickness
  });
}

export const EditPDF: React.FC = () => {
  const tool = getToolBySlug('edit-pdf')!;
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // PDF.js rendering states
  const [pdfProxy, setPdfProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  
  // Canvas refs and sizing
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(800);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawings, setDrawings] = useState<{ [pageIndex: number]: DrawingPath[] }>({});
  
  // Active tools & properties
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow'>('select');
  const [strokeColor, setStrokeColor] = useState('#ef4444');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(18);

  // Element interaction states
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Dragging / Resizing
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [initPos, setInitPos] = useState({ x: 0, y: 0 });
  const [initSize, setInitSize] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [activeHandle, setActiveHandle] = useState<string>('');

  // Freehand drawing states
  const [isDrawing, setIsDrawing] = useState(false);

  // Initial files loading
  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    const selectedFile = files[0];
    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setAnnotations([]);
    setDrawings({});
    setCurrentPage(1);
    setThumbnails([]);

    try {
      const proxy = await loadPDFForRendering(selectedFile);
      setPdfProxy(proxy);
      setNumPages(proxy.numPages);

      // Generate page thumbnails
      const thumbList: string[] = [];
      for (let i = 1; i <= proxy.numPages; i++) {
        const thumb = await generateThumbnail(proxy, i, 120);
        thumbList.push(thumb);
      }
      setThumbnails(thumbList);
    } catch (err) {
      console.error(err);
      setError('Failed to load PDF. It might be corrupted or protected.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render current PDF page to canvas
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfProxy || !pdfCanvasRef.current) return;
      
      try {
        const page = await pdfProxy.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = pdfCanvasRef.current;
        const context = canvas.getContext('2d')!;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        setCanvasWidth(viewport.width);
        setCanvasHeight(viewport.height);
        
        await page.render({ canvasContext: context, viewport } as any).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    if (pdfProxy) {
      renderPage();
    }
  }, [pdfProxy, currentPage]);

  // Synchronize size of transparent drawing canvas
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }
  }, [canvasWidth, canvasHeight]);

  // Render drawings (freehand)
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const pagePaths = drawings[currentPage - 1] || [];
    pagePaths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = path.opacity;
      
      const start = path.points[0];
      ctx.moveTo(start.x * canvas.width / 100, start.y * canvas.height / 100);
      for (let i = 1; i < path.points.length; i++) {
        const pt = path.points[i];
        ctx.lineTo(pt.x * canvas.width / 100, pt.y * canvas.height / 100);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }, [drawings, currentPage, canvasWidth, canvasHeight]);

  // Dragging and resizing updates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && selectedId && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
        const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
        
        setAnnotations(prev => prev.map(ann => {
          if (ann.id !== selectedId) return ann;
          return {
            ...ann,
            x: Math.max(0, Math.min(100 - ann.width, initPos.x + dx)),
            y: Math.max(0, Math.min(100 - ann.height, initPos.y + dy))
          };
        }));
      }
      
      if (isResizing && selectedId && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - resizeStart.x) / rect.width) * 100;
        const dy = ((e.clientY - resizeStart.y) / rect.height) * 100;
        
        setAnnotations(prev => prev.map(ann => {
          if (ann.id !== selectedId) return ann;
          
          let newX = ann.x;
          let newY = ann.y;
          let newW = ann.width;
          let newH = ann.height;
          
          if (activeHandle.includes('r')) {
            newW = Math.max(2, initSize.w + dx);
          }
          if (activeHandle.includes('b')) {
            newH = Math.max(2, initSize.h + dy);
          }
          if (activeHandle.includes('l')) {
            const potentialW = initSize.w - dx;
            if (potentialW >= 2) {
              newX = initSize.x + dx;
              newW = potentialW;
            }
          }
          if (activeHandle.includes('t')) {
            const potentialH = initSize.h - dy;
            if (potentialH >= 2) {
              newY = initSize.y + dy;
              newH = potentialH;
            }
          }
          
          return { ...ann, x: newX, y: newY, width: newW, height: newH };
        }));
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, selectedId, dragStart, resizeStart, initPos, initSize, activeHandle]);

  // Click canvas for shapes and text placements
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || activeTool === 'select' || activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'text') {
      const newAnn: TextAnnotation = {
        id: Math.random().toString(36).substring(7),
        type: 'text',
        pageIndex: currentPage - 1,
        x: Math.max(0, Math.min(80, x)),
        y: Math.max(0, Math.min(90, y)),
        width: 25,
        height: 8,
        text: 'New Text Box',
        color: strokeColor,
        fontSize,
        bgColor: fillColor,
        borderColor: strokeColor === '#000000' ? 'transparent' : strokeColor,
        borderWidth: strokeColor === '#000000' ? 0 : 2
      };
      setAnnotations(prev => [...prev, newAnn]);
      setSelectedId(newAnn.id);
      setEditingId(newAnn.id);
    } else {
      // Shape annotations
      const newAnn: ShapeAnnotation = {
        id: Math.random().toString(36).substring(7),
        type: 'shape',
        shapeType: activeTool as any,
        pageIndex: currentPage - 1,
        x: Math.max(0, Math.min(80, x)),
        y: Math.max(0, Math.min(80, y)),
        width: activeTool === 'line' || activeTool === 'arrow' ? 25 : 15,
        height: activeTool === 'line' || activeTool === 'arrow' ? 12 : 15,
        strokeColor,
        strokeWidth,
        fillColor: activeTool === 'line' || activeTool === 'arrow' ? 'transparent' : fillColor
      };
      setAnnotations(prev => [...prev, newAnn]);
      setSelectedId(newAnn.id);
    }
    setActiveTool('select');
  };

  // Drawing pad handlings
  const getPointerPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleDrawingStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'pen' && activeTool !== 'highlighter' && activeTool !== 'eraser') return;
    
    const pos = getPointerPos(e);
    
    if (activeTool === 'eraser') {
      setIsDrawing(true);
      performErase(pos.x, pos.y);
      return;
    }

    const newPath: DrawingPath = {
      points: [pos],
      color: strokeColor,
      width: strokeWidth,
      opacity: activeTool === 'highlighter' ? 0.45 : 1
    };

    setDrawings(prev => {
      const pageIndex = currentPage - 1;
      const currentPaths = prev[pageIndex] || [];
      return { ...prev, [pageIndex]: [...currentPaths, newPath] };
    });
    setIsDrawing(true);
  };

  const handleDrawingMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);

    if (activeTool === 'eraser') {
      performErase(pos.x, pos.y);
      return;
    }

    setDrawings(prev => {
      const pageIndex = currentPage - 1;
      const currentPaths = prev[pageIndex] || [];
      if (currentPaths.length === 0) return prev;
      
      const updatedPaths = [...currentPaths];
      const activePath = { ...updatedPaths[updatedPaths.length - 1] };
      activePath.points = [...activePath.points, pos];
      updatedPaths[updatedPaths.length - 1] = activePath;
      
      return { ...prev, [pageIndex]: updatedPaths };
    });
  };

  const handleDrawingEnd = () => {
    setIsDrawing(false);
  };

  const performErase = (x: number, y: number) => {
    setDrawings(prev => {
      const pageIndex = currentPage - 1;
      const pagePaths = prev[pageIndex] || [];
      const remainingPaths = pagePaths.filter(path => {
        return !path.points.some(pt => {
          const dx = pt.x - x;
          const dy = pt.y - y;
          return Math.sqrt(dx * dx + dy * dy) < 2.5; // Erase threshold
        });
      });
      return { ...prev, [pageIndex]: remainingPaths };
    });
  };

  // Dragging event initializers
  const startDrag = (e: React.MouseEvent, ann: Annotation) => {
    if (activeTool !== 'select' || editingId === ann.id) return;
    e.stopPropagation();
    setSelectedId(ann.id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitPos({ x: ann.x, y: ann.y });
    setIsDragging(true);
  };

  // Resizing event initializers
  const startResize = (e: React.MouseEvent, ann: Annotation, handle: string) => {
    e.stopPropagation();
    setSelectedId(ann.id);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setInitSize({ x: ann.x, y: ann.y, w: ann.width, h: ann.height });
    setActiveHandle(handle);
    setIsResizing(true);
  };

  // Image insertion triggers
  const triggerImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAnn: ImageAnnotation = {
            id: Math.random().toString(36).substring(7),
            type: 'image',
            pageIndex: currentPage - 1,
            x: 35,
            y: 35,
            width: 30,
            height: 30,
            dataUrl: event.target.result as string
          };
          setAnnotations(prev => [...prev, newAnn]);
          setSelectedId(newAnn.id);
          setActiveTool('select');
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    if (e.target) e.target.value = '';
  };

  // Property setters for active element
  const updateSelectedProperty = (key: string, value: any) => {
    if (!selectedId) return;
    setAnnotations(prev => prev.map(ann => {
      if (ann.id !== selectedId) return ann;
      return { ...ann, [key]: value };
    }));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setAnnotations(prev => prev.filter(ann => ann.id !== selectedId));
    setSelectedId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && editingId !== selectedId) {
      deleteSelected();
    }
  };

  // Reset tool state
  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
    setPdfProxy(null);
    setThumbnails([]);
    setAnnotations([]);
    setDrawings({});
    setSelectedId(null);
    setEditingId(null);
  };

  // Generate finalized PDF with edits burned in
  const savePDF = async () => {
    if (!file) return;
    setIsSaving(true);
    setError(null);

    try {
      const pdfDoc = await loadPDFDocument(file);
      const pages = pdfDoc.getPages();
      
      const proxy = await loadPDFForRendering(file);

      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const page = pages[pageIdx];
        const { width, height } = page.getSize();
        
        // 1. Burn Drawings (Freehand markup)
        const pagePaths = drawings[pageIdx] || [];
        if (pagePaths.length > 0) {
          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = width * 3.5; // High resolution
          offscreenCanvas.height = height * 3.5;
          const ctx = offscreenCanvas.getContext('2d');
          if (ctx) {
            ctx.scale(3.5, 3.5);
            pagePaths.forEach(path => {
              if (path.points.length < 2) return;
              ctx.beginPath();
              ctx.strokeStyle = path.color;
              ctx.lineWidth = path.width;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.globalAlpha = path.opacity;
              
              const start = path.points[0];
              ctx.moveTo(start.x * width / 100, start.y * height / 100);
              for (let i = 1; i < path.points.length; i++) {
                const pt = path.points[i];
                ctx.lineTo(pt.x * width / 100, pt.y * height / 100);
              }
              ctx.stroke();
            });
            ctx.globalAlpha = 1;
            
            const dataUrl = offscreenCanvas.toDataURL('image/png');
            const drawingBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
            const embeddedPng = await pdfDoc.embedPng(drawingBytes);
            page.drawImage(embeddedPng, {
              x: 0,
              y: 0,
              width,
              height
            });
          }
        }

        // 2. Burn Annotations
        const pageAnns = annotations.filter(ann => ann.pageIndex === pageIdx);
        for (const ann of pageAnns) {
          const pdfX = (ann.x / 100) * width;
          const pdfW = (ann.width / 100) * width;
          const pdfH = (ann.height / 100) * height;
          const pdfY = height - ((ann.y / 100) * height) - pdfH;

          if (ann.type === 'text') {
            if (ann.bgColor !== 'transparent') {
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                color: hexToRgb(ann.bgColor)
              });
            }
            
            if (ann.borderColor !== 'transparent' && ann.borderWidth > 0) {
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                borderColor: hexToRgb(ann.borderColor),
                borderWidth: ann.borderWidth
              });
            }

            const font = await pdfDoc.embedFont('Helvetica');
            const textFontSize = ann.fontSize * (height / canvasHeight);
            const wrappedLines = wrapText(ann.text, pdfW - 12, textFontSize, font);
            let currentY = pdfY + pdfH - textFontSize - 6;

            for (const line of wrappedLines) {
              if (currentY >= pdfY) {
                page.drawText(line, {
                  x: pdfX + 6,
                  y: currentY,
                  size: textFontSize,
                  font,
                  color: hexToRgb(ann.color)
                });
                currentY -= (textFontSize * 1.25);
              }
            }
          } else if (ann.type === 'shape') {
            if (ann.shapeType === 'rect') {
              page.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                color: ann.fillColor === 'transparent' ? undefined : hexToRgb(ann.fillColor),
                borderColor: hexToRgb(ann.strokeColor),
                borderWidth: ann.strokeWidth
              });
            } else if (ann.shapeType === 'circle') {
              page.drawEllipse({
                x: pdfX + pdfW / 2,
                y: pdfY + pdfH / 2,
                xScale: pdfW / 2,
                yScale: pdfH / 2,
                color: ann.fillColor === 'transparent' ? undefined : hexToRgb(ann.fillColor),
                borderColor: hexToRgb(ann.strokeColor),
                borderWidth: ann.strokeWidth
              });
            } else if (ann.shapeType === 'line') {
              page.drawLine({
                start: { x: pdfX, y: pdfY + pdfH },
                end: { x: pdfX + pdfW, y: pdfY },
                color: hexToRgb(ann.strokeColor),
                thickness: ann.strokeWidth
              });
            } else if (ann.shapeType === 'arrow') {
              const startX = pdfX;
              const startY = pdfY + pdfH;
              const endX = pdfX + pdfW;
              const endY = pdfY;
              
              page.drawLine({
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
                color: hexToRgb(ann.strokeColor),
                thickness: ann.strokeWidth
              });
              
              drawArrowHead(page, startX, startY, endX, endY, ann.strokeWidth, hexToRgb(ann.strokeColor)!);
            }
          } else if (ann.type === 'image') {
            const imageBytes = await fetch(ann.dataUrl).then(res => res.arrayBuffer());
            const isPng = ann.dataUrl.includes('image/png');
            const embeddedImage = isPng 
              ? await pdfDoc.embedPng(imageBytes) 
              : await pdfDoc.embedJpg(imageBytes);
            
            page.drawImage(embeddedImage, {
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH
            });
          }
        }
      }

      const newPdfBytes = await pdfDoc.save();
      const blob = new Blob([newPdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError('Failed to save edited PDF. Please check if file is password protected.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedAnnotation = annotations.find(a => a.id === selectedId);

  return (
    <ToolPage
      tool={tool}
      resultUrl={resultUrl}
      resultFilename={`edited-${file?.name || 'document.pdf'}`}
      onReset={reset}
      showResult={!!resultUrl}
    >
      {!isProcessing && !isSaving && !resultUrl && !file && (
        <DropZone
          onFiles={handleFiles}
          multiple={false}
          label="Drop PDF here to edit"
          color={tool.color}
          colorLight={tool.colorLight}
        />
      )}

      {error && <div className="message message-error">{error}</div>}
      {isProcessing && <ProcessingOverlay message="Loading PDF pages..." />}
      {isSaving && <ProcessingOverlay message="Exporting your edited PDF..." />}

      {!isProcessing && !isSaving && !resultUrl && file && pdfProxy && (
        <div 
          className="editor-layout" 
          onKeyDown={handleKeyDown} 
          tabIndex={0}
          style={{ display: 'flex', height: '82vh', gap: 16, outline: 'none' }}
        >
          {/* 1. Page Switcher Left Sidebar */}
          <div 
            className="sidebar-left" 
            style={{ 
              width: 140, 
              background: '#f8fafc', 
              borderRadius: 12, 
              border: '1px solid #e2e8f0', 
              padding: '16px 8px', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              alignItems: 'center'
            }}
          >
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pages</h4>
            {thumbnails.map((thumb, idx) => (
              <div 
                key={idx} 
                onClick={() => { setCurrentPage(idx + 1); setSelectedId(null); }}
                style={{ 
                  cursor: 'pointer',
                  border: `2px solid ${currentPage === idx + 1 ? tool.color : '#cbd5e1'}`,
                  borderRadius: 8,
                  padding: 4,
                  background: 'white',
                  transition: 'all 0.2s',
                  transform: currentPage === idx + 1 ? 'scale(1.03)' : 'none',
                  boxShadow: currentPage === idx + 1 ? '0 4px 12px -2px rgba(16, 185, 129, 0.2)' : 'none'
                }}
              >
                <img src={thumb} alt={`Page ${idx + 1}`} style={{ maxWidth: 100, height: 'auto', borderRadius: 4 }} />
                <div style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: 4, fontWeight: currentPage === idx + 1 ? 600 : 400 }}>{idx + 1}</div>
              </div>
            ))}
          </div>

          {/* 2. Main Editor Panel */}
          <div 
            className="editor-main" 
            style={{ 
              flex: 1, 
              background: '#f1f5f9', 
              borderRadius: 12, 
              border: '1px solid #e2e8f0', 
              position: 'relative', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden' 
            }}
          >
            {/* Top Toolbar */}
            <div 
              className="editor-toolbar-floating"
              style={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                borderRadius: 9999,
                padding: '6px 12px',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                zIndex: 40
              }}
            >
              {/* Select Tool */}
              <button 
                className={`icon-btn ${activeTool === 'select' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'select' ? tool.color : 'transparent',
                  color: activeTool === 'select' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('select'); setSelectedId(null); }}
                title="Select Elements"
              >
                <MousePointer2 size={18} />
              </button>

              {/* Add Text */}
              <button 
                className={`icon-btn ${activeTool === 'text' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'text' ? tool.color : 'transparent',
                  color: activeTool === 'text' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('text'); setSelectedId(null); }}
                title="Add Text"
              >
                <Type size={18} />
              </button>

              <div style={{ height: 20, width: 1, background: '#cbd5e1', margin: '0 4px' }} />

              {/* Freehand Pen */}
              <button 
                className={`icon-btn ${activeTool === 'pen' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'pen' ? tool.color : 'transparent',
                  color: activeTool === 'pen' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('pen'); setSelectedId(null); }}
                title="Pen tool"
              >
                <PenTool size={18} />
              </button>

              {/* Freehand Highlighter */}
              <button 
                className={`icon-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'highlighter' ? tool.color : 'transparent',
                  color: activeTool === 'highlighter' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('highlighter'); setSelectedId(null); }}
                title="Highlighter"
              >
                <Highlighter size={18} />
              </button>

              {/* Eraser */}
              <button 
                className={`icon-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'eraser' ? tool.color : 'transparent',
                  color: activeTool === 'eraser' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('eraser'); setSelectedId(null); }}
                title="Erase markings"
              >
                <Eraser size={18} />
              </button>

              <div style={{ height: 20, width: 1, background: '#cbd5e1', margin: '0 4px' }} />

              {/* Shapes */}
              <button 
                className={`icon-btn ${activeTool === 'rect' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'rect' ? tool.color : 'transparent',
                  color: activeTool === 'rect' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('rect'); setSelectedId(null); }}
                title="Add Rectangle"
              >
                <Square size={18} />
              </button>

              <button 
                className={`icon-btn ${activeTool === 'circle' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'circle' ? tool.color : 'transparent',
                  color: activeTool === 'circle' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('circle'); setSelectedId(null); }}
                title="Add Circle"
              >
                <Circle size={18} />
              </button>

              <button 
                className={`icon-btn ${activeTool === 'line' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'line' ? tool.color : 'transparent',
                  color: activeTool === 'line' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('line'); setSelectedId(null); }}
                title="Add Line"
              >
                <Minus size={18} />
              </button>

              <button 
                className={`icon-btn ${activeTool === 'arrow' ? 'active' : ''}`}
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: activeTool === 'arrow' ? tool.color : 'transparent',
                  color: activeTool === 'arrow' ? 'white' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => { setActiveTool('arrow'); setSelectedId(null); }}
                title="Add Arrow"
              >
                <ArrowRight size={18} />
              </button>

              <div style={{ height: 20, width: 1, background: '#cbd5e1', margin: '0 4px' }} />

              {/* Add Image */}
              <button 
                className="icon-btn"
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  background: 'transparent',
                  color: '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={triggerImageUpload}
                title="Insert Image"
              >
                <ImageIcon size={18} />
              </button>
              <input 
                type="file" 
                ref={imageInputRef} 
                onChange={handleImageUpload} 
                accept="image/png,image/jpeg,image/webp" 
                style={{ display: 'none' }} 
              />
            </div>

            {/* Canvas Container Workspace */}
            <div 
              style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '80px 24px 24px 24px', 
                display: 'flex', 
                alignItems: 'flex-start', 
                justifyContent: 'center' 
              }}
            >
              <div 
                ref={containerRef}
                onClick={handleOverlayClick}
                style={{ 
                  position: 'relative', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  width: canvasWidth,
                  height: canvasHeight,
                  cursor: activeTool === 'select' ? 'default' : (activeTool === 'text' ? 'text' : 'crosshair'),
                  userSelect: 'none'
                }}
              >
                {/* PDF Page Canvas */}
                <canvas 
                  ref={pdfCanvasRef} 
                  style={{ display: 'block', width: '100%', height: '100%', background: 'white' }} 
                />

                {/* Freehand transparent drawing canvas */}
                <canvas 
                  ref={drawingCanvasRef}
                  onMouseDown={handleDrawingStart}
                  onMouseMove={handleDrawingMove}
                  onMouseUp={handleDrawingEnd}
                  onMouseLeave={handleDrawingEnd}
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    zIndex: (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') ? 25 : 5,
                    pointerEvents: (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') ? 'auto' : 'none'
                  }}
                />

                {/* SVG Marker Definitions for Arrows */}
                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                  <defs>
                    <marker id="arrow-marker" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill={strokeColor} />
                    </marker>
                  </defs>
                </svg>

                {/* Structured elements overlay (draggable, resizable annotations) */}
                <div 
                  className="annotations-overlay-layer"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 15,
                    pointerEvents: activeTool === 'select' ? 'auto' : 'none'
                  }}
                >
                  {annotations.filter(ann => ann.pageIndex === currentPage - 1).map(ann => {
                    const isSelected = ann.id === selectedId;
                    const isEditing = ann.id === editingId;

                    return (
                      <div
                        key={ann.id}
                        onMouseDown={(e) => startDrag(e, ann)}
                        onDoubleClick={(e) => {
                          if (ann.type === 'text') {
                            e.stopPropagation();
                            setEditingId(ann.id);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: `${ann.x}%`,
                          top: `${ann.y}%`,
                          width: `${ann.width}%`,
                          height: `${ann.height}%`,
                          border: isSelected ? `2px dashed ${tool.color}` : '1px transparent solid',
                          boxSizing: 'border-box',
                          cursor: activeTool === 'select' ? 'move' : 'inherit',
                          pointerEvents: 'auto'
                        }}
                      >
                        {/* 1. TEXT Element */}
                        {ann.type === 'text' && (
                          <div 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              color: ann.color, 
                              fontSize: ann.fontSize,
                              background: ann.bgColor,
                              border: ann.borderWidth > 0 ? `${ann.borderWidth}px solid ${ann.borderColor}` : 'none',
                              padding: 4,
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                              wordBreak: 'break-word',
                              fontFamily: 'sans-serif'
                            }}
                          >
                            {isEditing ? (
                              <textarea
                                value={ann.text}
                                onChange={(e) => updateSelectedProperty('text', e.target.value)}
                                onBlur={() => setEditingId(null)}
                                autoFocus
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  color: ann.color,
                                  fontSize: ann.fontSize,
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                  resize: 'none',
                                  padding: 0,
                                  margin: 0,
                                  fontFamily: 'sans-serif'
                                }}
                              />
                            ) : (
                              ann.text
                            )}
                          </div>
                        )}

                        {/* 2. SHAPE Element */}
                        {ann.type === 'shape' && (
                          <div style={{ width: '100%', height: '100%' }}>
                            {ann.shapeType === 'rect' && (
                              <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                                <rect 
                                  x={ann.strokeWidth / 2} 
                                  y={ann.strokeWidth / 2} 
                                  width={`calc(100% - ${ann.strokeWidth}px)`}
                                  height={`calc(100% - ${ann.strokeWidth}px)`}
                                  stroke={ann.strokeColor} 
                                  strokeWidth={ann.strokeWidth} 
                                  fill={ann.fillColor} 
                                />
                              </svg>
                            )}
                            {ann.shapeType === 'circle' && (
                              <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                                <ellipse 
                                  cx="50%" 
                                  cy="50%" 
                                  rx={`calc(50% - ${ann.strokeWidth / 2}px)`}
                                  ry={`calc(50% - ${ann.strokeWidth / 2}px)`}
                                  stroke={ann.strokeColor} 
                                  strokeWidth={ann.strokeWidth} 
                                  fill={ann.fillColor} 
                                />
                              </svg>
                            )}
                            {ann.shapeType === 'line' && (
                              <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                                <line 
                                  x1="0" 
                                  y1="100%" 
                                  x2="100%" 
                                  y2="0" 
                                  stroke={ann.strokeColor} 
                                  strokeWidth={ann.strokeWidth} 
                                />
                              </svg>
                            )}
                            {ann.shapeType === 'arrow' && (
                              <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                                <line 
                                  x1="0" 
                                  y1="100%" 
                                  x2="100%" 
                                  y2="0" 
                                  stroke={ann.strokeColor} 
                                  strokeWidth={ann.strokeWidth}
                                  markerEnd="url(#arrow-marker)" 
                                />
                              </svg>
                            )}
                          </div>
                        )}

                        {/* 3. IMAGE Element */}
                        {ann.type === 'image' && (
                          <img 
                            src={ann.dataUrl} 
                            alt="Uploaded insertion" 
                            style={{ width: '100%', height: '100%', objectFit: 'fill' }} 
                          />
                        )}

                        {/* Resize Handles (Only rendered when selected) */}
                        {isSelected && !isEditing && (
                          <>
                            {/* Top Left */}
                            <div 
                              onMouseDown={(e) => startResize(e, ann, 'tl')}
                              style={{ position: 'absolute', width: 8, height: 8, background: tool.color, left: -4, top: -4, cursor: 'nwse-resize', zIndex: 10 }} 
                            />
                            {/* Top Right */}
                            <div 
                              onMouseDown={(e) => startResize(e, ann, 'tr')}
                              style={{ position: 'absolute', width: 8, height: 8, background: tool.color, right: -4, top: -4, cursor: 'nesw-resize', zIndex: 10 }} 
                            />
                            {/* Bottom Left */}
                            <div 
                              onMouseDown={(e) => startResize(e, ann, 'bl')}
                              style={{ position: 'absolute', width: 8, height: 8, background: tool.color, left: -4, bottom: -4, cursor: 'nesw-resize', zIndex: 10 }} 
                            />
                            {/* Bottom Right */}
                            <div 
                              onMouseDown={(e) => startResize(e, ann, 'br')}
                              style={{ position: 'absolute', width: 8, height: 8, background: tool.color, right: -4, bottom: -4, cursor: 'nwse-resize', zIndex: 10 }} 
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom page switcher indicator */}
            <div 
              style={{ 
                padding: 12, 
                background: 'white', 
                borderTop: '1px solid #e2e8f0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 16 
              }}
            >
              <button 
                className="btn btn-secondary" 
                disabled={currentPage <= 1} 
                onClick={() => { setCurrentPage(p => p - 1); setSelectedId(null); }}
                style={{ padding: '6px 12px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Page {currentPage} of {numPages}</span>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage >= numPages} 
                onClick={() => { setCurrentPage(p => p + 1); setSelectedId(null); }}
                style={{ padding: '6px 12px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* 3. Properties Sidebar Panel (Right) */}
          <div 
            className="sidebar-right" 
            style={{ 
              width: 260, 
              background: '#f8fafc', 
              borderRadius: 12, 
              border: '1px solid #e2e8f0', 
              padding: 16, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between' 
            }}
          >
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', marginBottom: 16 }}>Properties</h3>

              {/* Active element controls */}
              {selectedAnnotation ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Type:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>
                      {selectedAnnotation.type === 'shape' ? (selectedAnnotation as ShapeAnnotation).shapeType : selectedAnnotation.type}
                    </span>
                  </div>

                  {/* Colors for Text & Shape Borders */}
                  {(selectedAnnotation.type === 'text' || selectedAnnotation.type === 'shape') && (
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Color</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                        {PALETTE_COLORS.filter(c => c !== 'transparent').map(c => (
                          <button
                            key={c}
                            onClick={() => updateSelectedProperty(selectedAnnotation.type === 'text' ? 'color' : 'strokeColor', c)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: c,
                              border: (selectedAnnotation.type === 'text' ? (selectedAnnotation as TextAnnotation).color : (selectedAnnotation as ShapeAnnotation).strokeColor) === c ? `3px solid ${tool.color}` : '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors for Shape Background Fill & Text Background */}
                  {(selectedAnnotation.type === 'text' || (selectedAnnotation.type === 'shape' && (selectedAnnotation as ShapeAnnotation).shapeType !== 'line' && (selectedAnnotation as ShapeAnnotation).shapeType !== 'arrow')) && (
                    <div className="input-group" style={{ marginTop: 8 }}>
                      <label className="input-label" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Fill / Background</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                        {PALETTE_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => updateSelectedProperty(selectedAnnotation.type === 'text' ? 'bgColor' : 'fillColor', c)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : c,
                              backgroundSize: c === 'transparent' ? '8px 8px' : 'auto',
                              backgroundColor: c === 'transparent' ? 'white' : 'transparent',
                              border: (selectedAnnotation.type === 'text' ? (selectedAnnotation as TextAnnotation).bgColor : (selectedAnnotation as ShapeAnnotation).fillColor) === c ? `3px solid ${tool.color}` : '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Size adjustments */}
                  {selectedAnnotation.type === 'text' && (
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Font Size ({(selectedAnnotation as TextAnnotation).fontSize}px)</label>
                      <input
                        type="range"
                        min="10"
                        max="48"
                        value={(selectedAnnotation as TextAnnotation).fontSize}
                        onChange={(e) => updateSelectedProperty('fontSize', Number(e.target.value))}
                        className="range-slider"
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  )}

                  {selectedAnnotation.type === 'shape' && (
                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Thickness ({(selectedAnnotation as ShapeAnnotation).strokeWidth}px)</label>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        value={(selectedAnnotation as ShapeAnnotation).strokeWidth}
                        onChange={(e) => updateSelectedProperty('strokeWidth', Number(e.target.value))}
                        className="range-slider"
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  )}

                  <button
                    className="btn btn-danger btn-full"
                    onClick={deleteSelected}
                    style={{ background: '#ef4444', color: 'white', marginTop: 8 }}
                  >
                    <Trash2 size={16} /> Delete Object
                  </button>
                </div>
              ) : (
                /* Global Tool Settings (when drawing or nothing selected) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {activeTool === 'pen' || activeTool === 'highlighter' 
                      ? 'Adjust properties for drawing strokes:' 
                      : 'Select an element to customize properties or choose drawing options below:'}
                  </p>

                  {/* Draw Colors */}
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Stroke Color</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                      {PALETTE_COLORS.filter(c => c !== 'transparent').map(c => (
                        <button
                          key={c}
                          onClick={() => setStrokeColor(c)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: c,
                            border: strokeColor === c ? `3px solid ${tool.color}` : '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Draw Widths */}
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Stroke Width / Font ({strokeWidth}px)</label>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      value={strokeWidth}
                      onChange={(e) => {
                        setStrokeWidth(Number(e.target.value));
                        setFontSize(Number(e.target.value) * 1.5 + 10);
                      }}
                      className="range-slider"
                      style={{ marginTop: 8 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save and Download triggers */}
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={savePDF}
              style={{ background: tool.color }}
            >
              <Download size={18} /> Apply & Save PDF
            </button>
          </div>
        </div>
      )}
    </ToolPage>
  );
};
