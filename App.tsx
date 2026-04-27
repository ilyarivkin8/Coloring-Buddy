
import React, { useState, useRef } from 'react';
import { Difficulty, Orientation, ColoringPage } from './types';
import { VoiceInput } from './components/VoiceInput';
import { ImageInput } from './components/ImageInput';
import { generateColoringImage } from './services/geminiService';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [correctionPrompt, setCorrectionPrompt] = useState('');
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [orientation, setOrientation] = useState<Orientation>(Orientation.PORTRAIT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState<ColoringPage | null>(null);
  const [history, setHistory] = useState<ColoringPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (finalPrompt?: string, isCorrection: boolean = false) => {
    const textToUse = finalPrompt || (isCorrection ? correctionPrompt : prompt);
    
    if (!textToUse.trim() && !selectedReferenceImage && !isCorrection) return;

    setIsGenerating(true);
    setError(null);
    try {
      const baseImage = isCorrection ? currentPage?.imageUrl : undefined;
      const imageUrl = await generateColoringImage(
        textToUse, 
        difficulty, 
        orientation,
        baseImage, 
        selectedReferenceImage || undefined
      );
      
      const newPage = { imageUrl, prompt: textToUse || 'תמונה שלי', difficulty, orientation };
      
      if (currentPage) {
        setHistory(prev => [...prev, currentPage]);
      }
      
      setCurrentPage(newPage);
      setCorrectionPrompt('');
      setSelectedReferenceImage(null);
      setShowCorrection(true);
    } catch (err) {
      setError("אופס! נראה שהקסם התעייף. אפשר לנסות שוב?");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGoBack = () => {
    if (history.length === 0) return;
    const prevPage = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentPage(prevPage);
    setDifficulty(prevPage.difficulty);
    setOrientation(prevPage.orientation);
  };

  const handleTranscript = (text: string, isCorrection: boolean) => {
    if (isCorrection) {
      setCorrectionPrompt(text);
      handleGenerate(text, true);
    } else {
      setPrompt(text);
      handleGenerate(text, false);
    }
  };

  const handleImageSelected = (base64: string) => {
    setSelectedReferenceImage(base64);
  };

  const handleDownload = async () => {
    if (!currentPage) return;
    
    try {
      const base64Response = await fetch(currentPage.imageUrl);
      const blob = await base64Response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const safePrompt = currentPage.prompt.slice(0, 20).replace(/[^\u0590-\u05FFa-zA-Z0-9]/g, '-');
      const fileName = `צביעה-בכיף-${safePrompt || 'דף-צביעה'}.png`;
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      const link = document.createElement('a');
      link.href = currentPage.imageUrl;
      link.download = 'coloring-page.png';
      link.click();
    }
  };

  const handlePrint = () => {
    if (!currentPage) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback if popup is blocked
      window.print();
      return;
    }

    const isLandscape = currentPage.orientation === Orientation.LANDSCAPE;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>צביעה בכיף - ${currentPage.prompt}</title>
          <style>
            body { 
              margin: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
              background: white;
            }
            img { 
              max-width: 100%; 
              max-height: 100%; 
              object-fit: contain; 
            }
            @page { 
              margin: 0; 
              size: ${isLandscape ? 'landscape' : 'portrait'};
            }
            @media print {
              body { margin: 0; padding: 0; }
              img { width: 100%; height: 100%; object-fit: contain; }
            }
          </style>
        </head>
        <body>
          <img src="${currentPage.imageUrl}" />
          <script>
            const img = document.querySelector('img');
            const doPrint = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
            if (img.complete) {
              doPrint();
            } else {
              img.onload = doPrint;
              img.onerror = () => window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const reset = () => {
    setCurrentPage(null);
    setHistory([]);
    setPrompt('');
    setCorrectionPrompt('');
    setSelectedReferenceImage(null);
    setDifficulty(Difficulty.MEDIUM);
    setOrientation(Orientation.PORTRAIT);
    setError(null);
    setShowCorrection(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8" dir="rtl">
      {/* Header */}
      <header className="w-full max-w-2xl text-center mb-8 no-print">
        <h1 className="text-5xl md:text-6xl kids-font text-indigo-600 drop-shadow-sm mb-2">צביעה בכיף</h1>
        <p className="text-indigo-400 font-medium">דפי צביעה קסומים רק בשבילך! ✨</p>
      </header>

      {!currentPage ? (
        <main className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-6 md:p-10 space-y-8 no-print border-4 border-indigo-100">
          <section className="space-y-4">
            <label className="block text-2xl kids-font text-gray-700 text-center">מה נצבע היום?</label>
            
            <div className="relative flex flex-col gap-4">
              <div className="relative group flex items-center gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="דינוזאור בחלל..."
                  className="flex-1 text-xl p-3 md:p-5 rounded-2xl border-4 border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-right shadow-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate(prompt, false)}
                />
                <VoiceInput onTranscript={(text) => handleTranscript(text, false)} isProcessing={isGenerating} />
              </div>

              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50">
                <p className="text-indigo-700 kids-font mb-3 text-center">או צלמו תמונה והפכו אותה לדף צביעה!</p>
                <div className="flex items-center gap-4">
                  <ImageInput onImageSelected={handleImageSelected} isProcessing={isGenerating} />
                  {selectedReferenceImage && (
                    <div className="relative group">
                      <img src={selectedReferenceImage} className="w-16 h-16 object-cover rounded-xl border-2 border-indigo-400" alt="נבחר" />
                      <button 
                        onClick={() => setSelectedReferenceImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Orientation Selection */}
          <section className="space-y-4">
            <label className="block text-2xl kids-font text-gray-700 text-center">איך הדף יעמוד?</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setOrientation(Orientation.PORTRAIT)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
                  orientation === Orientation.PORTRAIT ? 'border-indigo-400 bg-indigo-50' : 'border-transparent bg-gray-50'
                }`}
              >
                <div className="w-8 h-10 border-2 border-current mb-2 rounded-sm"></div>
                <span className="kids-font">לאורך</span>
              </button>
              <button
                onClick={() => setOrientation(Orientation.LANDSCAPE)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
                  orientation === Orientation.LANDSCAPE ? 'border-indigo-400 bg-indigo-50' : 'border-transparent bg-gray-50'
                }`}
              >
                <div className="w-10 h-8 border-2 border-current mb-2 rounded-sm"></div>
                <span className="kids-font">לרוחב</span>
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <label className="block text-2xl kids-font text-gray-700 text-center">מה גודל שטחי הצביעה?</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: Difficulty.LARGE, label: 'גדולים', border: 'border-green-400', desc: 'קל' },
                { id: Difficulty.MEDIUM, label: 'בינוניים', border: 'border-yellow-400', desc: 'רגיל' },
                { id: Difficulty.SMALL, label: 'קטנים', border: 'border-red-400', desc: 'קשה!' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDifficulty(opt.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
                    difficulty === opt.id ? opt.border + ' ring-4 ring-indigo-50' : 'border-transparent bg-gray-50'
                  } hover:scale-105`}
                >
                  <span className={`text-xl kids-font ${difficulty === opt.id ? '' : 'text-gray-500'}`}>{opt.label}</span>
                  <span className="text-xs uppercase font-bold opacity-60">{opt.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={() => handleGenerate(prompt, false)}
            disabled={isGenerating || (!prompt && !selectedReferenceImage)}
            className={`w-full py-5 rounded-2xl text-2xl kids-font text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
              isGenerating ? 'bg-gray-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>מצייר...</span>
              </>
            ) : (
              <>
                <span>צור</span>
                <span className="text-3xl">🎨</span>
              </>
            )}
          </button>

          {error && <p className="text-red-500 text-center font-bold animate-bounce">{error}</p>}
        </main>
      ) : (
        <main className="w-full max-w-4xl flex flex-col items-center space-y-6">
          <div className="w-full flex justify-between items-center no-print">
            <button 
              onClick={reset}
              className="flex items-center gap-2 text-indigo-600 font-bold hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 16.707a1 1 0 011.414 0l6-6a1 1 0 010-1.414l-6-6a1 1 0 111.414 1.414L14.586 9H3a1 1 0 110 2h11.586l-4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              להתחיל מחדש
            </button>
            
            <div className="flex gap-2 md:gap-4">
              <button 
                onClick={handlePrint}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-full shadow-lg kids-font text-lg md:text-2xl flex items-center gap-2 transition-transform hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>הדפס</span>
              </button>
              
              <button 
                onClick={handleDownload}
                className="bg-green-500 hover:bg-green-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-full shadow-lg kids-font text-lg md:text-2xl flex items-center gap-2 transition-transform hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>שמור</span>
              </button>
            </div>
          </div>

          <div 
            ref={printRef}
            className={`bg-white shadow-2xl rounded-sm flex flex-col items-center w-full ${currentPage.orientation === Orientation.LANDSCAPE ? 'max-w-[297mm] aspect-[1.414/1]' : 'max-w-[210mm] aspect-[1/1.414]'}`}
          >
            <div className="w-full h-full border-4 border-black relative flex flex-col">
              <img 
                src={currentPage.imageUrl} 
                alt={currentPage.prompt}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>

          {showCorrection && (
            <section className="w-full max-w-xl bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-indigo-300 no-print sticky bottom-4 relative">
              <button 
                onClick={() => setShowCorrection(false)}
                className="absolute -top-3 -left-3 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-10"
                title="מזער"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl kids-font text-indigo-700 flex-1 text-center">רוצים לשפר משהו?</h3>
                  {history.length > 0 && (
                    <button 
                      onClick={handleGoBack}
                      className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 hover:bg-indigo-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      חזור
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: Difficulty.LARGE, label: 'גדולים', border: 'border-green-400' },
                    { id: Difficulty.MEDIUM, label: 'בינוניים', border: 'border-yellow-400' },
                    { id: Difficulty.SMALL, label: 'קטנים', border: 'border-red-400' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDifficulty(opt.id)}
                      className={`py-2 px-1 rounded-xl border-2 transition-all text-sm kids-font ${
                        difficulty === opt.id ? opt.border + ' bg-indigo-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={correctionPrompt}
                    onChange={(e) => setCorrectionPrompt(e.target.value)}
                    placeholder=""
                    className="flex-1 p-4 rounded-xl border-2 border-indigo-100 focus:border-indigo-400 outline-none text-lg text-right"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate(correctionPrompt, true)}
                  />
                  <VoiceInput onTranscript={(text) => handleTranscript(text, true)} isProcessing={isGenerating} />
                  <button
                    onClick={() => handleGenerate(correctionPrompt, true)}
                    disabled={isGenerating || !correctionPrompt.trim()}
                    className="bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center justify-center min-w-[70px]"
                  >
                    {isGenerating ? (
                       <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="kids-font">צור</span>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}

          {!showCorrection && (
            <button 
              onClick={() => setShowCorrection(true)}
              className="no-print fixed bottom-4 left-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </main>
      )}

      <footer className="mt-auto py-6 text-indigo-300 text-sm font-medium no-print">
        נוצר באהבה עבור אמנים קטנים 🎨
      </footer>
    </div>
  );
};

export default App;
