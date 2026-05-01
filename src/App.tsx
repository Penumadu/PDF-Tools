import { useState } from 'react';
import { Layers, Scissors, FileType, Edit3 } from 'lucide-react';
import { PDFMerger } from './components/PDFMerger';
import { PDFSplitter } from './components/PDFSplitter';
import { PDFEntry } from './components/PDFEntry';

function App() {
  const [activeTab, setActiveTab] = useState<'merge' | 'split' | 'entry'>('merge');

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
          <button 
            className={`nav-tab ${activeTab === 'entry' ? 'active' : ''}`}
            onClick={() => setActiveTab('entry')}
          >
            <Edit3 size={18} />
            PDF Entry
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'merge' && <PDFMerger />}
        {activeTab === 'split' && <PDFSplitter />}
        {activeTab === 'entry' && <PDFEntry />}
      </main>

      <footer>
        <p>Built securely. All processing happens locally in your browser. No files are uploaded to any server.</p>
      </footer>
    </div>
  );
}

export default App;
