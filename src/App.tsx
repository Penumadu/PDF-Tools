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
import { GrayscaleImage } from './tools/GrayscaleImage';
import { RotateImage } from './tools/RotateImage';
import { ImageToBase64 } from './tools/ImageToBase64';
import { WatermarkImage } from './tools/WatermarkImage';
import { RemoveWatermarkImage } from './tools/RemoveWatermarkImage';

// New missing tools
import { AIPDFAssistant } from './tools/AIPDFAssistant';
import { ChatWithPDF } from './tools/ChatWithPDF';
import { AIPDFSummarizer } from './tools/AIPDFSummarizer';
import { TranslatePDF } from './tools/TranslatePDF';
import { AIQuestionGenerator } from './tools/AIQuestionGenerator';
import { ExtractPDFPages } from './tools/ExtractPDFPages';
import { PDFAnnotator } from './tools/PDFAnnotator';
import { CropPDF } from './tools/CropPDF';
import { RedactPDF } from './tools/RedactPDF';
import { SharePDF } from './tools/SharePDF';
import { PDFToWord } from './tools/PDFToWord';
import { PDFToExcel } from './tools/PDFToExcel';
import { PDFToPPT } from './tools/PDFToPPT';
import { WordToPDF } from './tools/WordToPDF';
import { ExcelToPDF } from './tools/ExcelToPDF';
import { PPTToPDF } from './tools/PPTToPDF';
import { PDFOCR } from './tools/PDFOCR';
import { TXTToPDF } from './tools/TXTToPDF';
import { RTFToPDF } from './tools/RTFToPDF';
import { ODTToPDF } from './tools/ODTToPDF';
import { EPUBToPDF } from './tools/EPUBToPDF';
import { RequestSignatures } from './tools/RequestSignatures';
import { PDFScanner } from './tools/PDFScanner';
import { PDFConverter } from './tools/PDFConverter';

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
          <Route path="/tool/grayscale-image" element={<GrayscaleImage />} />
          <Route path="/tool/rotate-image" element={<RotateImage />} />
          <Route path="/tool/image-to-base64" element={<ImageToBase64 />} />
          <Route path="/tool/watermark-image" element={<WatermarkImage />} />
          <Route path="/tool/remove-watermark-image" element={<RemoveWatermarkImage />} />
          
          {/* New Tools from Screenshot */}
          <Route path="/tool/ai-pdf-assistant" element={<AIPDFAssistant />} />
          <Route path="/tool/chat-with-pdf" element={<ChatWithPDF />} />
          <Route path="/tool/ai-pdf-summarizer" element={<AIPDFSummarizer />} />
          <Route path="/tool/translate-pdf" element={<TranslatePDF />} />
          <Route path="/tool/ai-question-generator" element={<AIQuestionGenerator />} />
          <Route path="/tool/extract-pdf-pages" element={<ExtractPDFPages />} />
          <Route path="/tool/pdf-annotator" element={<PDFAnnotator />} />
          <Route path="/tool/crop-pdf" element={<CropPDF />} />
          <Route path="/tool/redact-pdf" element={<RedactPDF />} />
          <Route path="/tool/share-pdf" element={<SharePDF />} />
          <Route path="/tool/pdf-to-word" element={<PDFToWord />} />
          <Route path="/tool/pdf-to-excel" element={<PDFToExcel />} />
          <Route path="/tool/pdf-to-ppt" element={<PDFToPPT />} />
          <Route path="/tool/word-to-pdf" element={<WordToPDF />} />
          <Route path="/tool/excel-to-pdf" element={<ExcelToPDF />} />
          <Route path="/tool/ppt-to-pdf" element={<PPTToPDF />} />
          <Route path="/tool/pdf-ocr" element={<PDFOCR />} />
          <Route path="/tool/txt-to-pdf" element={<TXTToPDF />} />
          <Route path="/tool/rtf-to-pdf" element={<RTFToPDF />} />
          <Route path="/tool/odt-to-pdf" element={<ODTToPDF />} />
          <Route path="/tool/epub-to-pdf" element={<EPUBToPDF />} />
          <Route path="/tool/request-signatures" element={<RequestSignatures />} />
          <Route path="/tool/pdf-scanner" element={<PDFScanner />} />
          <Route path="/tool/pdf-converter" element={<PDFConverter />} />
          
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
