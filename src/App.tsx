import React, { useState } from 'react';
import { Layers, Scissors, FileType } from 'lucide-react';
import { PDFMerger } from './components/PDFMerger';
import { PDFSplitter } from './components/PDFSplitter';

function App() {
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge');

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <FileType size={32} color="#8b5cf6" />
          <span>PDF Studio Pro</span>
        </div>
        
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'merge' ? 'active' : ''}`}
            onClick={() => setActiveTab('merge')}
          >
            <Layers size={18} />
            Merge PDF
          </button>
          <button 
            className={`nav-tab ${activeTab === 'split' ? 'active' : ''}`}
            onClick={() => setActiveTab('split')}
          >
            <Scissors size={18} />
            Split PDF
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'merge' ? <PDFMerger /> : <PDFSplitter />}
      </main>

      <footer>
        <p>Built securely. All processing happens locally in your browser. No files are uploaded to any server.</p>
      </footer>
    </div>
  );
}

export default App;
