import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';

import { MergePDF } from './tools/MergePDF';
import { SplitPDF } from './tools/SplitPDF';
import { RotatePDF } from './tools/RotatePDF';
import { DeletePages } from './tools/DeletePages';
import { OrganizePages } from './tools/OrganizePages';
import { PDFToJPG } from './tools/PDFToJPG';
import { PDFToPNG } from './tools/PDFToPNG';
import { ImageToPDF } from './tools/ImageToPDF';
import { HTMLToPDF } from './tools/HTMLToPDF';
import { EditPDF } from './tools/EditPDF';
import { AddPageNumbers } from './tools/AddPageNumbers';
import { AddWatermark } from './tools/AddWatermark';
import { PDFReader } from './tools/PDFReader';
import { ProtectPDF } from './tools/ProtectPDF';
import { UnlockPDF } from './tools/UnlockPDF';
import { SignPDF } from './tools/SignPDF';
import { FlattenPDF } from './tools/FlattenPDF';
import { CompressPDF } from './tools/CompressPDF';
import { RepairPDF } from './tools/RepairPDF';
import { FillPDFForm } from './tools/FillPDFForm';
import { PDFFormCreator } from './tools/PDFFormCreator';

// Image Tools
import { CompressImage } from './tools/CompressImage';
import { ResizeImage } from './tools/ResizeImage';
import { CropImage } from './tools/CropImage';
import { ConvertImage } from './tools/ConvertImage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          
          {/* Organize Tools */}
          <Route path="tool/merge-pdf" element={<MergePDF />} />
          <Route path="tool/split-pdf" element={<SplitPDF />} />
          <Route path="tool/rotate-pdf" element={<RotatePDF />} />
          <Route path="tool/delete-pages" element={<DeletePages />} />
          <Route path="tool/organize-pages" element={<OrganizePages />} />
          
          {/* Conversion Tools */}
          <Route path="tool/pdf-to-jpg" element={<PDFToJPG />} />
          <Route path="tool/pdf-to-png" element={<PDFToPNG />} />
          <Route path="tool/image-to-pdf" element={<ImageToPDF />} />
          <Route path="tool/html-to-pdf" element={<HTMLToPDF />} />
          
          {/* Edit & View Tools */}
          <Route path="tool/edit-pdf" element={<EditPDF />} />
          <Route path="tool/add-page-numbers" element={<AddPageNumbers />} />
          <Route path="tool/add-watermark" element={<AddWatermark />} />
          <Route path="tool/pdf-reader" element={<PDFReader />} />
          
          {/* Security Tools */}
          <Route path="tool/protect-pdf" element={<ProtectPDF />} />
          <Route path="tool/unlock-pdf" element={<UnlockPDF />} />
          <Route path="tool/sign-pdf" element={<SignPDF />} />
          <Route path="tool/flatten-pdf" element={<FlattenPDF />} />
          
          {/* Optimize & Form Tools */}
          <Route path="tool/compress-pdf" element={<CompressPDF />} />
          <Route path="/tool/repair-pdf" element={<RepairPDF />} />
          <Route path="/tool/fill-pdf-form" element={<FillPDFForm />} />
          <Route path="/tool/pdf-form-creator" element={<PDFFormCreator />} />
          
          {/* Image Tools */}
          <Route path="/tool/compress-image" element={<CompressImage />} />
          <Route path="/tool/resize-image" element={<ResizeImage />} />
          <Route path="/tool/crop-image" element={<CropImage />} />
          <Route path="/tool/convert-image" element={<ConvertImage />} />
          
          <Route path="*" element={
            <div style={{ padding: 100, textAlign: 'center' }}>
              <h2>404 - Page Not Found</h2>
              <p>The tool you are looking for does not exist.</p>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
