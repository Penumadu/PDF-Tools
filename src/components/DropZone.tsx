import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  color?: string;
  colorLight?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFiles,
  accept = 'application/pdf',
  multiple = false,
  label = 'Click or drag files here',
  sublabel = 'Your files are processed locally in your browser',
  color = '#2563eb',
  colorLight = '#dbeafe',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(Array.from(e.dataTransfer.files));
    }
  }, [onFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onFiles]);

  return (
    <div
      className={`dropzone ${isDragging ? 'active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="dropzone-icon" style={{ background: colorLight, color }}>
        <UploadCloud size={28} />
      </div>
      <p className="dropzone-text">{label}</p>
      <p className="dropzone-subtext">{sublabel}</p>
      <button className="dropzone-btn" style={{ background: color }} type="button">
        Choose {multiple ? 'Files' : 'File'}
      </button>
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden-input"
        ref={fileInputRef}
        onChange={handleChange}
      />
    </div>
  );
};
