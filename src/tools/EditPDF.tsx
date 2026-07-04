import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import type * as pdfjs from 'pdfjs-dist';
import { ToolPage } from '../components/ToolPage';
import { DropZone } from '../components/DropZone';
import { ProcessingOverlay } from '../components/ProcessingOverlay';
import { getToolBySlug } from '../data/tools';
import { loadPDFDocument, loadPDFForRendering, generateThumbnail } from '../utils/pdfUtils';
import { 
  Type, Image as ImageIcon, Square, Circle, Minus, MousePointer2, X, 
  Trash2, PenTool, Highlighter, Eraser, ArrowRight, ChevronLeft, ChevronRight,
  Download, Undo2, Redo2, Grid, ZoomIn, ZoomOut, Plus, Copy, RotateCw, Check, Cloud, Share2, Award
} from 'lucide-react';

interface PageState {
  id: string; // unique page instance ID
  originalIndex: number | null; // index in original PDF, null if blank page
  rotation: number; // 0, 90, 180, 270 degrees
}

interface BaseAnnotation {
  id: string;
  type: 'text' | 'shape' | 'image';
  pageId: string; // unique page ID
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

interface HistoryState {
  annotations: Annotation[];
  drawings: { [pageId: string]: DrawingPath[] };
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
  const [currentPage, setCurrentPage] = useState(1); // 1-based index in pages array
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  
  // Page structure state
  const [pages, setPages] = useState<PageState[]>([]);

  // Canvas refs and sizing
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [scale, setScale] = useState(1.0);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawings, setDrawings] = useState<{ [pageId: string]: DrawingPath[] }>({});
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Toolbar toggles
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow'>('select');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(16);

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

  // Push snapshot to undo history
  const pushToHistory = (newAnns: Annotation[], newDraws: { [pageId: string]: DrawingPath[] }) => {
    const snap: HistoryState = {
      annotations: JSON.parse(JSON.stringify(newAnns)),
      drawings: JSON.parse(JSON.stringify(newDraws))
    };
    setHistory(prev => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      return [...nextHistory, snap];
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevSnap = history[historyIndex - 1];
      setAnnotations(JSON.parse(JSON.stringify(prevSnap.annotations)));
      setDrawings(JSON.parse(JSON.stringify(prevSnap.drawings)));
      setHistoryIndex(historyIndex - 1);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextSnap = history[historyIndex + 1];
      setAnnotations(JSON.parse(JSON.stringify(nextSnap.annotations)));
      setDrawings(JSON.parse(JSON.stringify(nextSnap.drawings)));
      setHistoryIndex(historyIndex + 1);
      setSelectedId(null);
    }
  };

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
    setHistory([]);
    setHistoryIndex(-1);

    try {
      const proxy = await loadPDFForRendering(selectedFile);
      setPdfProxy(proxy);

      // Create initial page structures
      const initialPages: PageState[] = [];
      const thumbList: string[] = [];
      for (let i = 0; i < proxy.numPages; i++) {
        const pageId = Math.random().toString(36).substring(7);
        initialPages.push({
          id: pageId,
          originalIndex: i,
          rotation: 0
        });
        const thumb = await generateThumbnail(proxy, i + 1, 120);
        thumbList.push(thumb);
      }
      setPages(initialPages);
      setThumbnails(thumbList);

      // Seed first history entry
      const initialSnap: HistoryState = { annotations: [], drawings: {} };
      setHistory([initialSnap]);
      setHistoryIndex(0);
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
      if (!pdfProxy || !pdfCanvasRef.current || pages.length === 0) return;
      
      const activePage = pages[currentPage - 1];
      if (!activePage) return;

      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext('2d')!;

      if (activePage.originalIndex === null) {
        // Blank page - default aspect ratio of standard letter/A4
        const w = 612 * scale;
        const h = 792 * scale;
        canvas.width = w;
        canvas.height = h;
        setCanvasWidth(w);
        setCanvasHeight(h);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, w, h);
        return;
      }

      try {
        const page = await pdfProxy.getPage(activePage.originalIndex + 1);
        const viewport = page.getViewport({ scale: 1.5 * scale, rotation: activePage.rotation });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        setCanvasWidth(viewport.width);
        setCanvasHeight(viewport.height);
        
        await page.render({ canvasContext: context, viewport } as any).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    if (pdfProxy && pages.length > 0) {
      renderPage();
    }
  }, [pdfProxy, currentPage, pages, scale]);

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
    if (!canvas || pages.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const activePage = pages[currentPage - 1];
    if (!activePage) return;

    const pagePaths = drawings[activePage.id] || [];
    pagePaths.forEach(path => {
      if (path.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width * scale;
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
  }, [drawings, currentPage, pages, canvasWidth, canvasHeight, scale]);

  // Dragging and resizing updates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && selectedId && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
        const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
        
        setAnnotations(prev => {
          const updated = prev.map(ann => {
            if (ann.id !== selectedId) return ann;
            return {
              ...ann,
              x: Math.max(0, Math.min(100 - ann.width, initPos.x + dx)),
              y: Math.max(0, Math.min(100 - ann.height, initPos.y + dy))
            };
          });
          return updated;
        });
      }
      
      if (isResizing && selectedId && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dx = ((e.clientX - resizeStart.x) / rect.width) * 100;
        const dy = ((e.clientY - resizeStart.y) / rect.height) * 100;
        
        setAnnotations(prev => {
          const updated = prev.map(ann => {
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
          });
          return updated;
        });
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        pushToHistory(annotations, drawings);
      }
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
  }, [isDragging, isResizing, selectedId, dragStart, resizeStart, initPos, initSize, activeHandle, annotations, drawings]);

  // Click canvas for shapes and text placements
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || activeTool === 'select' || activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser' || pages.length === 0) return;

    const activePage = pages[currentPage - 1];
    if (!activePage) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'text') {
      const newAnn: TextAnnotation = {
        id: Math.random().toString(36).substring(7),
        type: 'text',
        pageId: activePage.id,
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
      const updatedAnns = [...annotations, newAnn];
      setAnnotations(updatedAnns);
      setSelectedId(newAnn.id);
      setEditingId(newAnn.id);
      pushToHistory(updatedAnns, drawings);
    } else {
      // Shape annotations
      const newAnn: ShapeAnnotation = {
        id: Math.random().toString(36).substring(7),
        type: 'shape',
        shapeType: activeTool as any,
        pageId: activePage.id,
        x: Math.max(0, Math.min(80, x)),
        y: Math.max(0, Math.min(80, y)),
        width: activeTool === 'line' || activeTool === 'arrow' ? 25 : 15,
        height: activeTool === 'line' || activeTool === 'arrow' ? 12 : 15,
        strokeColor,
        strokeWidth,
        fillColor: activeTool === 'line' || activeTool === 'arrow' ? 'transparent' : fillColor
      };
      const updatedAnns = [...annotations, newAnn];
      setAnnotations(updatedAnns);
      setSelectedId(newAnn.id);
      pushToHistory(updatedAnns, drawings);
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
    if (pages.length === 0) return;
    
    const activePage = pages[currentPage - 1];
    if (!activePage) return;

    const pos = getPointerPos(e);
    
    if (activeTool === 'eraser') {
      setIsDrawing(true);
      performErase(pos.x, pos.y);
      return;
    }

    const newPath: DrawingPath = {
      points: [pos],
      color: strokeColor,
      width: strokeWidth / scale, // Normalize width relative to scale
      opacity: activeTool === 'highlighter' ? 0.45 : 1
    };

    setDrawings(prev => {
      const pageId = activePage.id;
      const currentPaths = prev[pageId] || [];
      return { ...prev, [pageId]: [...currentPaths, newPath] };
    });
    setIsDrawing(true);
  };

  const handleDrawingMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || pages.length === 0) return;
    const activePage = pages[currentPage - 1];
    if (!activePage) return;

    const pos = getPointerPos(e);

    if (activeTool === 'eraser') {
      performErase(pos.x, pos.y);
      return;
    }

    setDrawings(prev => {
      const pageId = activePage.id;
      const currentPaths = prev[pageId] || [];
      if (currentPaths.length === 0) return prev;
      
      const updatedPaths = [...currentPaths];
      const activePath = { ...updatedPaths[updatedPaths.length - 1] };
      activePath.points = [...activePath.points, pos];
      updatedPaths[updatedPaths.length - 1] = activePath;
      
      return { ...prev, [pageId]: updatedPaths };
    });
  };

  const handleDrawingEnd = () => {
    if (isDrawing) {
      pushToHistory(annotations, drawings);
    }
    setIsDrawing(false);
  };

  const performErase = (x: number, y: number) => {
    if (pages.length === 0) return;
    const activePage = pages[currentPage - 1];
    if (!activePage) return;

    setDrawings(prev => {
      const pageId = activePage.id;
      const pagePaths = prev[pageId] || [];
      const remainingPaths = pagePaths.filter(path => {
        return !path.points.some(pt => {
          const dx = pt.x - x;
          const dy = pt.y - y;
          return Math.sqrt(dx * dx + dy * dy) < 2.5; // Erase threshold
        });
      });
      return { ...prev, [pageId]: remainingPaths };
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
    if (e.target.files && e.target.files[0] && pages.length > 0) {
      const activePage = pages[currentPage - 1];
      if (!activePage) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAnn: ImageAnnotation = {
            id: Math.random().toString(36).substring(7),
            type: 'image',
            pageId: activePage.id,
            x: 35,
            y: 35,
            width: 30,
            height: 30,
            dataUrl: event.target.result as string
          };
          const updatedAnns = [...annotations, newAnn];
          setAnnotations(updatedAnns);
          setSelectedId(newAnn.id);
          setActiveTool('select');
          pushToHistory(updatedAnns, drawings);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    if (e.target) e.target.value = '';
  };

  // Property setters for active element
  const updateSelectedProperty = (key: string, value: any) => {
    if (!selectedId) return;
    const updated = annotations.map(ann => {
      if (ann.id !== selectedId) return ann;
      return { ...ann, [key]: value };
    });
    setAnnotations(updated);
    pushToHistory(updated, drawings);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const updated = annotations.filter(ann => ann.id !== selectedId);
    setAnnotations(updated);
    setSelectedId(null);
    pushToHistory(updated, drawings);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && editingId !== selectedId) {
      deleteSelected();
    }
  };

  // --- Page Manipulations ---
  const duplicatePage = (index: number) => {
    const pageToDuplicate = pages[index];
    const newId = Math.random().toString(36).substring(7);
    const newPage: PageState = {
      id: newId,
      originalIndex: pageToDuplicate.originalIndex,
      rotation: pageToDuplicate.rotation
    };

    // Duplicate annotations
    const pageAnns = annotations.filter(ann => ann.pageId === pageToDuplicate.id);
    const clonedAnns = pageAnns.map(ann => ({
      ...ann,
      id: Math.random().toString(36).substring(7),
      pageId: newId
    }));

    // Duplicate drawings
    const pageDrawings = drawings[pageToDuplicate.id] || [];
    const clonedDrawings = pageDrawings.map(path => ({
      ...path,
      points: path.points.map(pt => ({ ...pt }))
    }));

    setPages(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newPage);
      return updated;
    });

    setThumbnails(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, prev[index]);
      return updated;
    });

    setAnnotations(prev => [...prev, ...clonedAnns]);
    setDrawings(prev => ({ ...prev, [newId]: clonedDrawings }));
    setCurrentPage(index + 2); // Switch to the cloned page
  };

  const rotatePage = (index: number) => {
    setPages(prev => prev.map((p, idx) => {
      if (idx !== index) return p;
      return { ...p, rotation: (p.rotation + 90) % 360 };
    }));
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) return;
    const pageToDelete = pages[index];

    setPages(prev => prev.filter((_, idx) => idx !== index));
    setThumbnails(prev => prev.filter((_, idx) => idx !== index));
    setAnnotations(prev => prev.filter(ann => ann.pageId !== pageToDelete.id));
    setDrawings(prev => {
      const updated = { ...prev };
      delete updated[pageToDelete.id];
      return updated;
    });

    if (currentPage > pages.length - 1) {
      setCurrentPage(pages.length - 1);
    } else if (currentPage > index + 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const insertBlankPage = (index: number) => {
    const newId = Math.random().toString(36).substring(7);
    const newPage: PageState = {
      id: newId,
      originalIndex: null, // Blank
      rotation: 0
    };

    setPages(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, newPage);
      return updated;
    });

    setThumbnails(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, 'blank'); // White placeholder flag
      return updated;
    });

    setCurrentPage(index + 2);
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
    setPdfProxy(null);
    setThumbnails([]);
    setPages([]);
    setAnnotations([]);
    setDrawings({});
    setSelectedId(null);
    setEditingId(null);
    setHistory([]);
    setHistoryIndex(-1);
  };

  // Generate finalized PDF with edits burned in
  const savePDF = async () => {
    if (!file) return;
    setIsSaving(true);
    setError(null);

    try {
      const originalPdfDoc = await loadPDFDocument(file);
      const outputPdfDoc = await PDFDocument.create();
      
      const proxy = await loadPDFForRendering(file);

      for (let i = 0; i < pages.length; i++) {
        const pageState = pages[i];
        
        let targetPage: any;
        if (pageState.originalIndex !== null) {
          // Copy original page
          const [copiedPage] = await outputPdfDoc.copyPages(originalPdfDoc, [pageState.originalIndex]);
          targetPage = outputPdfDoc.addPage(copiedPage);
        } else {
          // Insert a blank letter size page
          targetPage = outputPdfDoc.addPage([612, 792]);
        }

        // Apply rotation
        targetPage.setRotation(degrees(pageState.rotation));
        
        const { width, height } = targetPage.getSize();
        
        // 1. Burn Drawings (Freehand markup)
        const pagePaths = drawings[pageState.id] || [];
        if (pagePaths.length > 0) {
          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = width * 3.5;
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
            const embeddedPng = await outputPdfDoc.embedPng(drawingBytes);
            targetPage.drawImage(embeddedPng, {
              x: 0,
              y: 0,
              width,
              height
            });
          }
        }

        // 2. Burn Annotations
        const pageAnns = annotations.filter(ann => ann.pageId === pageState.id);
        for (const ann of pageAnns) {
          const pdfX = (ann.x / 100) * width;
          const pdfW = (ann.width / 100) * width;
          const pdfH = (ann.height / 100) * height;
          const pdfY = height - ((ann.y / 100) * height) - pdfH;

          if (ann.type === 'text') {
            if (ann.bgColor !== 'transparent') {
              targetPage.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                color: hexToRgb(ann.bgColor)
              });
            }
            
            if (ann.borderColor !== 'transparent' && ann.borderWidth > 0) {
              targetPage.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                borderColor: hexToRgb(ann.borderColor),
                borderWidth: ann.borderWidth
              });
            }

            const font = await outputPdfDoc.embedFont('Helvetica');
            const textFontSize = ann.fontSize * (height / canvasHeight);
            const wrappedLines = wrapText(ann.text, pdfW - 12, textFontSize, font);
            let currentY = pdfY + pdfH - textFontSize - 6;

            for (const line of wrappedLines) {
              if (currentY >= pdfY) {
                targetPage.drawText(line, {
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
              targetPage.drawRectangle({
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                color: ann.fillColor === 'transparent' ? undefined : hexToRgb(ann.fillColor),
                borderColor: hexToRgb(ann.strokeColor),
                borderWidth: ann.strokeWidth
              });
            } else if (ann.shapeType === 'circle') {
              targetPage.drawEllipse({
                x: pdfX + pdfW / 2,
                y: pdfY + pdfH / 2,
                xScale: pdfW / 2,
                yScale: pdfH / 2,
                color: ann.fillColor === 'transparent' ? undefined : hexToRgb(ann.fillColor),
                borderColor: hexToRgb(ann.strokeColor),
                borderWidth: ann.strokeWidth
              });
            } else if (ann.shapeType === 'line') {
              targetPage.drawLine({
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
              
              targetPage.drawLine({
                start: { x: startX, y: startY },
                end: { x: endX, y: endY },
                color: hexToRgb(ann.strokeColor),
                thickness: ann.strokeWidth
              });
              
              drawArrowHead(targetPage, startX, startY, endX, endY, ann.strokeWidth, hexToRgb(ann.strokeColor)!);
            }
          } else if (ann.type === 'image') {
            const imageBytes = await fetch(ann.dataUrl).then(res => res.arrayBuffer());
            const isPng = ann.dataUrl.includes('image/png');
            const embeddedImage = isPng 
              ? await outputPdfDoc.embedPng(imageBytes) 
              : await outputPdfDoc.embedJpg(imageBytes);
            
            targetPage.drawImage(embeddedImage, {
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH
            });
          }
        }
      }

      const newPdfBytes = await outputPdfDoc.save();
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

      {/* Rebuilt High-Fidelity Editor UI */}
      {!isProcessing && !isSaving && !resultUrl && file && pages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '90vh', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
          
          {/* 1. Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div onClick={reset} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#64748b' }}>
                <X size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{file.name}</strong>
                  <Cloud size={16} color="#10b981" />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Saving locally</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, fontSize: '0.9rem' }}>
                <Share2 size={16} /> Share
              </button>
              <button 
                onClick={savePDF} 
                className="btn btn-primary" 
                style={{ 
                  background: '#2563eb', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '8px 20px', 
                  borderRadius: 8, 
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' 
                }}
              >
                <Download size={16} /> Download
              </button>
            </div>
          </div>

          {/* 2. Top Toolbar Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Sidebar toggle */}
              <button 
                onClick={() => setShowSidebar(!showSidebar)} 
                style={{ border: 'none', padding: 8, borderRadius: 6, background: showSidebar ? '#f1f5f9' : 'transparent', color: '#475569', cursor: 'pointer' }}
                title="Toggle Sidebar"
              >
                <Grid size={18} />
              </button>

              <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 8px' }} />

              {/* Cursor / Select */}
              <button 
                onClick={() => { setActiveTool('select'); setSelectedId(null); }}
                style={{ border: 'none', padding: '6px 12px', borderRadius: 6, background: activeTool === 'select' ? '#eff6ff' : 'transparent', color: activeTool === 'select' ? '#2563eb' : '#475569', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <MousePointer2 size={16} /> Select
              </button>

              {/* Edit Text */}
              <button 
                onClick={() => { setActiveTool('select'); setSelectedId(null); }}
                style={{ border: 'none', padding: '6px 12px', borderRadius: 6, background: 'transparent', color: '#475569', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Award size={16} color="#f59e0b" /> Edit Text
              </button>

              {/* Add Text */}
              <button 
                onClick={() => { setActiveTool('text'); setSelectedId(null); }}
                style={{ border: 'none', padding: '6px 12px', borderRadius: 6, background: activeTool === 'text' ? '#eff6ff' : 'transparent', color: activeTool === 'text' ? '#2563eb' : '#475569', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Type size={16} /> Text
              </button>

              {/* Pen tool */}
              <button 
                onClick={() => { setActiveTool('pen'); setSelectedId(null); }}
                style={{ border: 'none', padding: '6px 12px', borderRadius: 6, background: activeTool === 'pen' ? '#eff6ff' : 'transparent', color: activeTool === 'pen' ? '#2563eb' : '#475569', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <PenTool size={16} /> Draw
              </button>

              {/* Highlighter */}
              <button 
                onClick={() => { setActiveTool('highlighter'); setSelectedId(null); }}
                style={{ border: 'none', padding: '6px 12px', borderRadius: 6, background: activeTool === 'highlighter' ? '#eff6ff' : 'transparent', color: activeTool === 'highlighter' ? '#2563eb' : '#475569', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Highlighter size={16} /> Highlight
              </button>

              {/* Eraser */}
              <button 
                onClick={() => { setActiveTool('eraser'); setSelectedId(null); }}
                style={{ border: 'none', padding: '6px 12px', borderRadius: 6, background: activeTool === 'eraser' ? '#eff6ff' : 'transparent', color: activeTool === 'eraser' ? '#2563eb' : '#475569', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Eraser size={16} /> Erase
              </button>

              {/* Shape tool dropdown / triggers */}
              <button 
                onClick={() => { setActiveTool('rect'); setSelectedId(null); }}
                style={{ border: 'none', padding: '6px 12px', borderRadius: 6, background: activeTool === 'rect' ? '#eff6ff' : 'transparent', color: activeTool === 'rect' ? '#2563eb' : '#475569', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Square size={16} /> Shape
              </button>

              {/* Add Image */}
              <button 
                onClick={triggerImageUpload}
                style={{ border: 'none', padding: '6px 12px', borderRadius: 6, background: 'transparent', color: '#475569', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ImageIcon size={16} /> Image
              </button>
              <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Undo / Redo */}
              <button 
                onClick={undo} 
                disabled={historyIndex <= 0}
                style={{ border: 'none', padding: 8, borderRadius: 6, background: 'transparent', color: historyIndex > 0 ? '#475569' : '#cbd5e1', cursor: historyIndex > 0 ? 'pointer' : 'default' }}
                title="Undo"
              >
                <Undo2 size={16} />
              </button>
              <button 
                onClick={redo} 
                disabled={historyIndex >= history.length - 1}
                style={{ border: 'none', padding: 8, borderRadius: 6, background: 'transparent', color: historyIndex < history.length - 1 ? '#475569' : '#cbd5e1', cursor: historyIndex < history.length - 1 ? 'pointer' : 'default' }}
                title="Redo"
              >
                <Redo2 size={16} />
              </button>
            </div>
          </div>

          {/* 3. Main Workspace Area */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#f1f5f9' }}>
            
            {/* Sidebar Left: Page Navigation with Duplicate/Delete/Rotation */}
            {showSidebar && (
              <div 
                style={{ 
                  width: 220, 
                  background: 'white', 
                  borderRight: '1px solid #e2e8f0', 
                  padding: 16, 
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}
              >
                {pages.map((pageState, idx) => (
                  <div key={pageState.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div 
                      onClick={() => { setCurrentPage(idx + 1); setSelectedId(null); }}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        border: `2px solid ${currentPage === idx + 1 ? '#2563eb' : '#e2e8f0'}`,
                        borderRadius: 8,
                        padding: 4,
                        background: 'white',
                        transform: `rotate(${pageState.rotation}deg)`,
                        transition: 'transform 0.2s, border-color 0.2s',
                        width: 120,
                        height: 150,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                      }}
                    >
                      {pageState.originalIndex !== null ? (
                        <img 
                          src={thumbnails[pageState.originalIndex]} 
                          alt={`Page ${idx + 1}`} 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1', borderRadius: 4 }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Blank Page</span>
                        </div>
                      )}

                      {/* Thumbnail action overlays on hover (always rendered but visible cleanly) */}
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(15, 23, 42, 0.85)',
                          borderRadius: 6,
                          padding: '2px 6px',
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                          zIndex: 10
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Duplicate */}
                        <button onClick={() => duplicatePage(idx)} style={{ border: 'none', background: 'transparent', color: 'white', padding: 2, cursor: 'pointer' }} title="Duplicate Page">
                          <Copy size={12} />
                        </button>
                        {/* Rotate */}
                        <button onClick={() => rotatePage(idx)} style={{ border: 'none', background: 'transparent', color: 'white', padding: 2, cursor: 'pointer' }} title="Rotate Page">
                          <RotateCw size={12} />
                        </button>
                        {/* Delete */}
                        <button onClick={() => deletePage(idx)} style={{ border: 'none', background: 'transparent', color: 'white', padding: 2, cursor: 'pointer' }} title="Delete Page">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: 8, fontWeight: currentPage === idx + 1 ? 600 : 400, color: currentPage === idx + 1 ? '#2563eb' : '#475569' }}>
                      Page {idx + 1}
                    </div>

                    {/* Insert Page Button below thumbnail */}
                    <button 
                      onClick={() => insertBlankPage(idx)}
                      style={{ 
                        marginTop: 8, 
                        border: '1px dashed #cbd5e1', 
                        background: 'transparent', 
                        color: '#94a3b8', 
                        borderRadius: 6, 
                        padding: '4px 12px', 
                        fontSize: '0.75rem', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Plus size={10} /> Add blank page
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Main Canvas Viewport (Center) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', position: 'relative', outline: 'none' }} onKeyDown={handleKeyDown} tabIndex={0}>
              <div 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: 40 
                }}
              >
                <div 
                  ref={containerRef}
                  onClick={handleOverlayClick}
                  style={{ 
                    position: 'relative', 
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    width: canvasWidth,
                    height: canvasHeight,
                    cursor: activeTool === 'select' ? 'default' : (activeTool === 'text' ? 'text' : 'crosshair'),
                    userSelect: 'none'
                  }}
                >
                  <canvas ref={pdfCanvasRef} style={{ display: 'block', width: '100%', height: '100%', background: 'white' }} />

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

                  {/* SVG overlay elements for text, shapes, images */}
                  <div 
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
                    {pages.length > 0 && annotations.filter(ann => ann.pageId === pages[currentPage - 1]?.id).map(ann => {
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
                            border: isSelected ? '2px dashed #2563eb' : '1px transparent solid',
                            boxSizing: 'border-box',
                            cursor: activeTool === 'select' ? 'move' : 'inherit',
                            pointerEvents: 'auto'
                          }}
                        >
                          {ann.type === 'text' && (
                            <div 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                color: ann.color, 
                                fontSize: ann.fontSize * scale,
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
                                    fontSize: ann.fontSize * scale,
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

                          {ann.type === 'image' && (
                            <img 
                              src={ann.dataUrl} 
                              alt="Uploaded insertion" 
                              style={{ width: '100%', height: '100%', objectFit: 'fill' }} 
                            />
                          )}

                          {/* Resizing handles */}
                          {isSelected && !isEditing && (
                            <>
                              <div onMouseDown={(e) => startResize(e, ann, 'tl')} style={{ position: 'absolute', width: 8, height: 8, background: '#2563eb', left: -4, top: -4, cursor: 'nwse-resize', zIndex: 10 }} />
                              <div onMouseDown={(e) => startResize(e, ann, 'tr')} style={{ position: 'absolute', width: 8, height: 8, background: '#2563eb', right: -4, top: -4, cursor: 'nesw-resize', zIndex: 10 }} />
                              <div onMouseDown={(e) => startResize(e, ann, 'bl')} style={{ position: 'absolute', width: 8, height: 8, background: '#2563eb', left: -4, bottom: -4, cursor: 'nesw-resize', zIndex: 10 }} />
                              <div onMouseDown={(e) => startResize(e, ann, 'br')} style={{ position: 'absolute', width: 8, height: 8, background: '#2563eb', right: -4, bottom: -4, cursor: 'nwse-resize', zIndex: 10 }} />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Floating Page & Zoom Control Overlay */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 9999,
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  color: 'white',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                  zIndex: 30
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button 
                    disabled={currentPage <= 1} 
                    onClick={() => { setCurrentPage(p => p - 1); setSelectedId(null); }}
                    style={{ border: 'none', background: 'transparent', color: currentPage > 1 ? 'white' : '#64748b', cursor: currentPage > 1 ? 'pointer' : 'default', padding: 4 }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.85rem', minWidth: 60, textAlign: 'center' }}>
                    {currentPage} / {pages.length}
                  </span>
                  <button 
                    disabled={currentPage >= pages.length} 
                    onClick={() => { setCurrentPage(p => p + 1); setSelectedId(null); }}
                    style={{ border: 'none', background: 'transparent', color: currentPage < pages.length ? 'white' : '#64748b', cursor: currentPage < pages.length ? 'pointer' : 'default', padding: 4 }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                
                <div style={{ width: 1, height: 16, background: '#475569' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} style={{ border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', padding: 4 }}>
                    <ZoomOut size={16} />
                  </button>
                  <span style={{ fontSize: '0.8rem', minWidth: 36, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} style={{ border: 'none', background: 'transparent', color: 'white', cursor: 'pointer', padding: 4 }}>
                    <ZoomIn size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Right: Active Property Controller */}
            <div 
              style={{ 
                width: 240, 
                background: 'white', 
                borderLeft: '1px solid #e2e8f0', 
                padding: 16, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between' 
              }}
            >
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: 16 }}>Properties</h3>

                {selectedAnnotation ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>Selected:</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>
                        {selectedAnnotation.type === 'shape' ? (selectedAnnotation as ShapeAnnotation).shapeType : selectedAnnotation.type}
                      </span>
                    </div>

                    {(selectedAnnotation.type === 'text' || selectedAnnotation.type === 'shape') && (
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Color</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                          {PALETTE_COLORS.filter(c => c !== 'transparent').map(c => (
                            <button
                              key={c}
                              onClick={() => updateSelectedProperty(selectedAnnotation.type === 'text' ? 'color' : 'strokeColor', c)}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: c,
                                border: (selectedAnnotation.type === 'text' ? (selectedAnnotation as TextAnnotation).color : (selectedAnnotation as ShapeAnnotation).strokeColor) === c ? '3px solid #2563eb' : '1px solid #cbd5e1',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedAnnotation.type === 'text' || (selectedAnnotation.type === 'shape' && (selectedAnnotation as ShapeAnnotation).shapeType !== 'line' && (selectedAnnotation as ShapeAnnotation).shapeType !== 'arrow')) && (
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Background / Fill</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                          {PALETTE_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => updateSelectedProperty(selectedAnnotation.type === 'text' ? 'bgColor' : 'fillColor', c)}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : c,
                                backgroundSize: c === 'transparent' ? '6px 6px' : 'auto',
                                backgroundColor: c === 'transparent' ? 'white' : 'transparent',
                                border: (selectedAnnotation.type === 'text' ? (selectedAnnotation as TextAnnotation).bgColor : (selectedAnnotation as ShapeAnnotation).fillColor) === c ? '3px solid #2563eb' : '1px solid #cbd5e1',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedAnnotation.type === 'text' && (
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Font Size ({(selectedAnnotation as TextAnnotation).fontSize}px)</label>
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
                        <label className="input-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Thickness ({(selectedAnnotation as ShapeAnnotation).strokeWidth}px)</label>
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
                      <Trash2 size={14} /> Delete Object
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {activeTool === 'pen' || activeTool === 'highlighter' 
                        ? 'Configure Pen/Highlighter styles below:' 
                        : 'Select any added element on the canvas to configure colors, sizes, or to delete it.'}
                    </p>

                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Stroke Color</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                        {PALETTE_COLORS.filter(c => c !== 'transparent').map(c => (
                          <button
                            key={c}
                            onClick={() => setStrokeColor(c)}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: c,
                              border: strokeColor === c ? '3px solid #2563eb' : '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Thickness ({strokeWidth}px)</label>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                  Total {pages.length} Pages
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </ToolPage>
  );
};
