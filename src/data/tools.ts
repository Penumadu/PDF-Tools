import {
  Layers, Scissors, RotateCw, Trash2, GripVertical,
  Image, ImageDown, ImageUp, Globe,
  Edit3, Hash, Droplets, BookOpen,
  Lock, Unlock, PenTool, Minimize2,
  FileDown, Wrench,
  FormInput, ListChecks,
  ImageMinus, Maximize2, Crop, Replace
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
  | 'image';

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
