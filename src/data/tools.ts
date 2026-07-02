import {
  Layers, Scissors, RotateCw, Trash2, GripVertical,
  Image, ImageDown, ImageUp, Globe,
  Edit3, Hash, Droplets, BookOpen,
  Lock, Unlock, PenTool, Minimize2,
  FileDown, Wrench,
  FormInput, ListChecks,
  ImageMinus, Maximize2, Crop, Replace,
  Palette, Code,
  Bot, MessageSquare, AlignLeft, Languages, HelpCircle, FileOutput, 
  EyeOff, Share2, FileText, Table, Presentation, Scan, FileCode, Search,
  Eraser
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ToolInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  color: string;
  colorLight: string;
  icon: LucideIcon;
}

export type ToolCategory =
  | 'organize'
  | 'convert-from'
  | 'convert-to'
  | 'edit'
  | 'security'
  | 'optimize'
  | 'forms'
  | 'image'
  | 'ai'
  | 'scan';

export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  color: string;
  colorLight: string;
}

export const categories: CategoryInfo[] = [
  { id: 'organize', name: 'Organize', color: '#ef4444', colorLight: '#fef2f2' },
  { id: 'convert-from', name: 'Convert from PDF', color: '#3b82f6', colorLight: '#eff6ff' },
  { id: 'convert-to', name: 'Convert to PDF', color: '#8b5cf6', colorLight: '#f5f3ff' },
  { id: 'edit', name: 'Edit & View', color: '#10b981', colorLight: '#ecfdf5' },
  { id: 'security', name: 'Security', color: '#f59e0b', colorLight: '#fffbeb' },
  { id: 'optimize', name: 'Optimize', color: '#06b6d4', colorLight: '#ecfeff' },
  { id: 'forms', name: 'Form Tools', color: '#ec4899', colorLight: '#fdf2f8' },
  { id: 'image', name: 'Image Tools', color: '#14b8a6', colorLight: '#f0fdfa' },
  { id: 'ai', name: 'AI PDF', color: '#6366f1', colorLight: '#e0e7ff' },
  { id: 'scan', name: 'Scan Tools', color: '#14b8a6', colorLight: '#ccfbf1' },
];

export const tools: ToolInfo[] = [
  // Organize
  {
    id: 'merge-pdf',
    slug: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into a single document',
    category: 'organize',
    color: '#ef4444',
    colorLight: '#fef2f2',
    icon: Layers,
  },
  {
    id: 'split-pdf',
    slug: 'split-pdf',
    name: 'Split PDF',
    description: 'Extract pages from your PDF into separate files',
    category: 'organize',
    color: '#ef4444',
    colorLight: '#fef2f2',
    icon: Scissors,
  },
  {
    id: 'rotate-pdf',
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate PDF pages to any orientation',
    category: 'organize',
    color: '#ef4444',
    colorLight: '#fef2f2',
    icon: RotateCw,
  },
  {
    id: 'delete-pages',
    slug: 'delete-pages',
    name: 'Delete Pages',
    description: 'Remove unwanted pages from your PDF',
    category: 'organize',
    color: '#ef4444',
    colorLight: '#fef2f2',
    icon: Trash2,
  },
  {
    id: 'organize-pages',
    slug: 'organize-pages',
    name: 'Organize Pages',
    description: 'Reorder PDF pages by dragging and dropping',
    category: 'organize',
    color: '#ef4444',
    colorLight: '#fef2f2',
    icon: GripVertical,
  },

  // Convert from PDF
  {
    id: 'pdf-to-jpg',
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert each PDF page into a JPG image',
    category: 'convert-from',
    color: '#3b82f6',
    colorLight: '#eff6ff',
    icon: Image,
  },
  {
    id: 'pdf-to-png',
    slug: 'pdf-to-png',
    name: 'PDF to PNG',
    description: 'Convert each PDF page into a PNG image',
    category: 'convert-from',
    color: '#3b82f6',
    colorLight: '#eff6ff',
    icon: ImageDown,
  },

  // Convert to PDF
  {
    id: 'image-to-pdf',
    slug: 'image-to-pdf',
    name: 'JPG to PDF',
    description: 'Convert JPG and PNG images into a PDF document',
    category: 'convert-to',
    color: '#8b5cf6',
    colorLight: '#f5f3ff',
    icon: ImageUp,
  },
  {
    id: 'html-to-pdf',
    slug: 'html-to-pdf',
    name: 'HTML to PDF',
    description: 'Save any webpage as a PDF document',
    category: 'convert-to',
    color: '#8b5cf6',
    colorLight: '#f5f3ff',
    icon: Globe,
  },

  // Edit & View
  {
    id: 'edit-pdf',
    slug: 'edit-pdf',
    name: 'Edit PDF',
    description: 'Add text, images, shapes, and annotations to any PDF',
    category: 'edit',
    color: '#10b981',
    colorLight: '#ecfdf5',
    icon: Edit3,
  },
  {
    id: 'add-page-numbers',
    slug: 'add-page-numbers',
    name: 'Page Numbers',
    description: 'Add page numbers to your PDF document',
    category: 'edit',
    color: '#10b981',
    colorLight: '#ecfdf5',
    icon: Hash,
  },
  {
    id: 'add-watermark',
    slug: 'add-watermark',
    name: 'Watermark',
    description: 'Add text or image watermarks to your PDF',
    category: 'edit',
    color: '#10b981',
    colorLight: '#ecfdf5',
    icon: Droplets,
  },
  {
    id: 'pdf-reader',
    slug: 'pdf-reader',
    name: 'PDF Reader',
    description: 'View and read PDFs with zoom and navigation',
    category: 'edit',
    color: '#10b981',
    colorLight: '#ecfdf5',
    icon: BookOpen,
  },

  // Security
  {
    id: 'protect-pdf',
    slug: 'protect-pdf',
    name: 'Protect PDF',
    description: 'Add password encryption to your PDF',
    category: 'security',
    color: '#f59e0b',
    colorLight: '#fffbeb',
    icon: Lock,
  },
  {
    id: 'unlock-pdf',
    slug: 'unlock-pdf',
    name: 'Unlock PDF',
    description: 'Remove password protection from a PDF',
    category: 'security',
    color: '#f59e0b',
    colorLight: '#fffbeb',
    icon: Unlock,
  },
  {
    id: 'sign-pdf',
    slug: 'sign-pdf',
    name: 'Sign PDF',
    description: 'Draw, type, or upload your signature on a PDF',
    category: 'security',
    color: '#f59e0b',
    colorLight: '#fffbeb',
    icon: PenTool,
  },
  {
    id: 'flatten-pdf',
    slug: 'flatten-pdf',
    name: 'Flatten PDF',
    description: 'Flatten form fields and annotations permanently',
    category: 'security',
    color: '#f59e0b',
    colorLight: '#fffbeb',
    icon: Minimize2,
  },

  // Optimize
  {
    id: 'compress-pdf',
    slug: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while keeping quality',
    category: 'optimize',
    color: '#06b6d4',
    colorLight: '#ecfeff',
    icon: FileDown,
  },
  {
    id: 'repair-pdf',
    slug: 'repair-pdf',
    name: 'Repair PDF',
    description: 'Fix and recover corrupted PDF files',
    category: 'optimize',
    color: '#06b6d4',
    colorLight: '#ecfeff',
    icon: Wrench,
  },

  // Form Tools
  {
    id: 'fill-pdf-form',
    slug: 'fill-pdf-form',
    name: 'Fill PDF Form',
    description: 'Fill out interactive PDF form fields',
    category: 'forms',
    color: '#ec4899',
    colorLight: '#fdf2f8',
    icon: FormInput,
  },
  {
    id: 'pdf-form-creator',
    slug: 'pdf-form-creator',
    name: 'Form Creator',
    description: 'Add form fields like text inputs and checkboxes',
    category: 'forms',
    color: '#ec4899',
    colorLight: '#fdf2f8',
    icon: ListChecks,
  },

  // Image Tools
  {
    id: 'compress-image',
    slug: 'compress-image',
    name: 'Compress Image',
    description: 'Reduce image file size with smart compression',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: ImageMinus,
  },
  {
    id: 'resize-image',
    slug: 'resize-image',
    name: 'Resize Image',
    description: 'Change image dimensions easily',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: Maximize2,
  },
  {
    id: 'crop-image',
    slug: 'crop-image',
    name: 'Crop Image',
    description: 'Crop out unwanted areas of an image',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: Crop,
  },
  {
    id: 'convert-image',
    slug: 'convert-image',
    name: 'Convert Image',
    description: 'Convert between JPG, PNG, WebP, etc.',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: Replace,
  },
  {
    id: 'grayscale-image',
    slug: 'grayscale-image',
    name: 'Grayscale Image',
    description: 'Convert your image to black and white',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: Palette,
  },
  {
    id: 'rotate-image',
    slug: 'rotate-image',
    name: 'Rotate Image',
    description: 'Rotate your image to any angle',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: RotateCw,
  },
  {
    id: 'image-to-base64',
    slug: 'image-to-base64',
    name: 'Image to Base64',
    description: 'Convert an image file to Base64 string',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: Code,
  },
  {
    id: 'watermark-image',
    slug: 'watermark-image',
    name: 'Watermark Image',
    description: 'Add text or logo watermark to your image',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: Droplets,
  },
  {
    id: 'remove-watermark-image',
    slug: 'remove-watermark-image',
    name: 'Remove Watermark',
    description: 'Remove watermarks or unwanted objects from image',
    category: 'image',
    color: '#14b8a6',
    colorLight: '#f0fdfa',
    icon: Eraser,
  },
  
  // AI PDF
  { id: 'ai-pdf-assistant', slug: 'ai-pdf-assistant', name: 'AI PDF Assistant', description: 'Your personal AI assistant for PDF tasks', category: 'ai', color: '#6366f1', colorLight: '#e0e7ff', icon: Bot },
  { id: 'chat-with-pdf', slug: 'chat-with-pdf', name: 'Chat with PDF', description: 'Ask questions and converse with your PDF document', category: 'ai', color: '#6366f1', colorLight: '#e0e7ff', icon: MessageSquare },
  { id: 'ai-pdf-summarizer', slug: 'ai-pdf-summarizer', name: 'AI PDF Summarizer', description: 'Automatically summarize lengthy PDF documents', category: 'ai', color: '#6366f1', colorLight: '#e0e7ff', icon: AlignLeft },
  { id: 'translate-pdf', slug: 'translate-pdf', name: 'Translate PDF', description: 'Translate PDF content into multiple languages', category: 'ai', color: '#6366f1', colorLight: '#e0e7ff', icon: Languages },
  { id: 'ai-question-generator', slug: 'ai-question-generator', name: 'AI Question Generator', description: 'Generate quiz questions from your PDF content', category: 'ai', color: '#6366f1', colorLight: '#e0e7ff', icon: HelpCircle },

  // Organize (Additions)
  { id: 'extract-pdf-pages', slug: 'extract-pdf-pages', name: 'Extract PDF Pages', description: 'Extract specific pages from your document', category: 'organize', color: '#ef4444', colorLight: '#fef2f2', icon: FileOutput },

  // View & Edit (Additions)
  { id: 'pdf-annotator', slug: 'pdf-annotator', name: 'PDF Annotator', description: 'Highlight and annotate PDF documents', category: 'edit', color: '#10b981', colorLight: '#ecfdf5', icon: Edit3 },
  { id: 'crop-pdf', slug: 'crop-pdf', name: 'Crop PDF', description: 'Crop page margins or unwanted areas', category: 'edit', color: '#10b981', colorLight: '#ecfdf5', icon: Crop },
  { id: 'redact-pdf', slug: 'redact-pdf', name: 'Redact PDF', description: 'Permanently hide sensitive information', category: 'edit', color: '#10b981', colorLight: '#ecfdf5', icon: EyeOff },
  { id: 'share-pdf', slug: 'share-pdf', name: 'Share PDF', description: 'Securely share PDF files online', category: 'edit', color: '#10b981', colorLight: '#ecfdf5', icon: Share2 },

  // Convert from PDF (Additions)
  { id: 'pdf-to-word', slug: 'pdf-to-word', name: 'PDF to Word', description: 'Convert PDF to editable Word document', category: 'convert-from', color: '#3b82f6', colorLight: '#eff6ff', icon: FileText },
  { id: 'pdf-to-excel', slug: 'pdf-to-excel', name: 'PDF to Excel', description: 'Convert PDF tables to Excel spreadsheets', category: 'convert-from', color: '#3b82f6', colorLight: '#eff6ff', icon: Table },
  { id: 'pdf-to-ppt', slug: 'pdf-to-ppt', name: 'PDF to PPT', description: 'Convert PDF to PowerPoint presentation', category: 'convert-from', color: '#3b82f6', colorLight: '#eff6ff', icon: Presentation },

  // Convert to PDF (Additions)
  { id: 'word-to-pdf', slug: 'word-to-pdf', name: 'Word to PDF', description: 'Convert Word documents to PDF', category: 'convert-to', color: '#8b5cf6', colorLight: '#f5f3ff', icon: FileText },
  { id: 'excel-to-pdf', slug: 'excel-to-pdf', name: 'Excel to PDF', description: 'Convert Excel spreadsheets to PDF', category: 'convert-to', color: '#8b5cf6', colorLight: '#f5f3ff', icon: Table },
  { id: 'ppt-to-pdf', slug: 'ppt-to-pdf', name: 'PPT to PDF', description: 'Convert PowerPoint to PDF', category: 'convert-to', color: '#8b5cf6', colorLight: '#f5f3ff', icon: Presentation },
  { id: 'pdf-ocr', slug: 'pdf-ocr', name: 'PDF OCR', description: 'Make scanned PDFs searchable and selectable', category: 'convert-to', color: '#8b5cf6', colorLight: '#f5f3ff', icon: Search },
  { id: 'txt-to-pdf', slug: 'txt-to-pdf', name: 'TXT to PDF', description: 'Convert plain text files to PDF', category: 'convert-to', color: '#8b5cf6', colorLight: '#f5f3ff', icon: FileText },
  { id: 'rtf-to-pdf', slug: 'rtf-to-pdf', name: 'RTF to PDF', description: 'Convert Rich Text Format to PDF', category: 'convert-to', color: '#8b5cf6', colorLight: '#f5f3ff', icon: FileText },
  { id: 'odt-to-pdf', slug: 'odt-to-pdf', name: 'ODT to PDF', description: 'Convert OpenDocument Text to PDF', category: 'convert-to', color: '#8b5cf6', colorLight: '#f5f3ff', icon: FileText },
  { id: 'epub-to-pdf', slug: 'epub-to-pdf', name: 'EPUB to PDF', description: 'Convert EPUB eBooks to PDF', category: 'convert-to', color: '#8b5cf6', colorLight: '#f5f3ff', icon: BookOpen },

  // Security (Additions)
  { id: 'request-signatures', slug: 'request-signatures', name: 'Request Signatures', description: 'Send PDF for e-signatures', category: 'security', color: '#f59e0b', colorLight: '#fffbeb', icon: PenTool },

  // Scan (New Category)
  { id: 'pdf-scanner', slug: 'pdf-scanner', name: 'PDF Scanner', description: 'Scan documents to PDF from camera', category: 'scan', color: '#14b8a6', colorLight: '#ccfbf1', icon: Scan },
  
  // Generic Converter (Additions)
  { id: 'pdf-converter', slug: 'pdf-converter', name: 'PDF Converter', description: 'Universal tool for all PDF conversions', category: 'convert-from', color: '#3b82f6', colorLight: '#eff6ff', icon: FileCode },
];

export function getToolBySlug(slug: string): ToolInfo | undefined {
  return tools.find(t => t.slug === slug);
}

export function getToolsByCategory(category: ToolCategory): ToolInfo[] {
  return tools.filter(t => t.category === category);
}

export function getCategoryInfo(category: ToolCategory): CategoryInfo | undefined {
  return categories.find(c => c.id === category);
}
