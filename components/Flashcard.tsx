
import React, { useState, useRef, useEffect } from 'react';
import { Word } from '../types';
import { Volume2, CheckCircle, RotateCcw, PlayCircle, Bell, BellRing, Camera, Share2, X, Loader2, ChevronLeft, ChevronRight, Activity, Volume1 } from 'lucide-react';
import { playTextToSpeech } from '../services/geminiService';
import { playClickSound, playSuccessSound } from '../services/audioEffects';

interface FlashcardProps {
  word: Word;
  onMarkLearned: (id: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoPrev: boolean;
  onUpdateWord: (id: string, updates: Partial<Word>) => void;
  onToggleReview: (id: string) => void;
}

const Flashcard: React.FC<FlashcardProps> = ({ word, onMarkLearned, onNext, onPrev, canGoPrev, onUpdateWord, onToggleReview }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Snapshot states
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotImage, setSnapshotImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  // Animation State for Bell Click
  const [isMarkingDifficult, setIsMarkingDifficult] = useState(false);

  // Audio Playing States for visual feedback
  const [playingState, setPlayingState] = useState<'none' | 'word' | 'example'>('none');

  // Helper to determine badge status
  const getStatusBadge = () => {
      if (word.needsReview) {
          return { text: 'ÖĞRENİLİYOR', classes: 'bg-orange-50/90 text-orange-600 border-orange-200 dark:bg-orange-900/60 dark:text-orange-200 dark:border-orange-800' };
      }
      if (word.isLearned) {
          return { text: 'ÖĞRENİLDİ', classes: 'bg-green-50/90 text-green-600 border-green-200 dark:bg-green-900/60 dark:text-green-200 dark:border-green-800' };
      }
      return { text: 'ÖĞRENİLMEDİ', classes: 'bg-gray-50/90 text-gray-400 border-gray-200 dark:bg-gray-700/60 dark:text-gray-300 dark:border-gray-600' };
  };

  const statusBadge = getStatusBadge();

  // Reset states when word changes
  useEffect(() => {
    setIsFlipped(false);
    setIsMarkingDifficult(false);
    setPlayingState('none');
  }, [word.id]);

  const handlePlayWordAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingState === 'word') return;

    setPlayingState('word');
    playTextToSpeech(word.romanian, 'ro');
    
    // Simulate playing duration visual feedback
    setTimeout(() => {
        setPlayingState('none');
    }, 1500);
  };

  const handlePlayExampleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingState === 'example') return;

    setPlayingState('example');
    playTextToSpeech(word.exampleRo, 'ro');

    // Simulate playing duration visual feedback
    setTimeout(() => {
        setPlayingState('none');
    }, 2500);
  }

  const handleCardClick = () => {
    playClickSound();
    setIsFlipped(!isFlipped);
  };

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playClickSound();

    // If already marked as difficult (needsReview is true), we are toggling it OFF.
    // Do this immediately without long animation.
    if (word.needsReview) {
        onToggleReview(word.id);
        return;
    }

    // If marking AS difficult (adding to list):
    // 1. Show animation
    setIsMarkingDifficult(true);
    
    // 2. Wait for animation, then trigger logic
    setTimeout(() => {
        onToggleReview(word.id);
        // We don't need to set isMarkingDifficult(false) here necessarily 
        // because the parent might switch the card or re-render, 
        // but it's safe to do so for stability.
        setIsMarkingDifficult(false);
    }, 1200);
  };

  const handleCapture = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playClickSound();
    setIsCapturing(true);

    // Wait for a brief moment to ensure any UI updates are done
    setTimeout(async () => {
      try {
        if (captureRef.current && (window as any).html2canvas) {
          const canvas = await (window as any).html2canvas(captureRef.current, {
            scale: 2, // Better quality
            backgroundColor: '#ffffff',
            useCORS: true // Try to capture emoji/fonts correctly
          });
          const imgData = canvas.toDataURL('image/png');
          setSnapshotImage(imgData);
          setShowSnapshotModal(true);
        } else {
            alert("Ekran görüntüsü alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
        }
      } catch (err) {
        console.error("Snapshot failed", err);
      } finally {
        setIsCapturing(false);
      }
    }, 100);
  };

  const handleShare = async () => {
    if (!snapshotImage) return;
    playClickSound();

    try {
      // Convert DataURL to Blob
      const res = await fetch(snapshotImage);
      const blob = await res.blob();
      const file = new File([blob], `roturk-${word.romanian}.png`, { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          title: 'RoTurk Kelime Kartı',
          text: `RoTurk ile yeni bir Romence kelime öğrendim: ${word.romanian}`,
          files: [file]
        });
      } else {
        // Fallback for desktop: Download
        const link = document.createElement('a');
        link.href = snapshotImage;
        link.download = `roturk-${word.romanian}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("Resim cihazınıza indirildi.");
      }
    } catch (error) {
      console.error("Sharing failed", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 perspective-1000 relative">
      
      {/* --- SIDE NAVIGATION BUTTONS --- 
          Placed outside the flip container so they don't rotate 
      */}
      
      {/* PREV BUTTON (Left Middle) */}
      <button
        onClick={(e) => {
            e.stopPropagation();
            playClickSound();
            onPrev();
        }}
        disabled={!canGoPrev}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full shadow-lg border transition-all duration-200 active:scale-90
            ${canGoPrev 
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:scale-110' 
                : 'bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'}`}
        title="Önceki Kelime"
      >
        <ChevronLeft size={28} strokeWidth={2.5} />
      </button>

      {/* NEXT BUTTON (Right Middle) */}
      <button
        onClick={(e) => {
            e.stopPropagation();
            playClickSound();
            onNext();
        }}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full shadow-lg border border-indigo-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:scale-110 active:scale-90 transition-all duration-200"
        title="Sonraki Kelime"
      >
        <ChevronRight size={28} strokeWidth={2.5} />
      </button>


      {/* --- HIDDEN CAPTURE CONTAINER --- 
          This is positioned off-screen but rendered so html2canvas can snap it.
      */}
      <div 
        ref={captureRef}
        style={{ position: 'fixed', top: 0, left: '-9999px', width: '500px' }}
        className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-3xl border-8 border-indigo-600 flex flex-col gap-6 items-center text-center shadow-2xl"
      >
         <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🇷🇴</span>
            <h1 className="text-3xl font-bold text-indigo-900">RoTurk</h1>
            <span className="text-3xl">🇹🇷</span>
         </div>
         
         <div className="w-full bg-white rounded-2xl p-6 shadow-md border border-indigo-100 flex flex-col items-center">
             <div className="text-8xl mb-4">{word.emoji}</div>
             <h2 className="text-5xl font-extrabold text-gray-800 mb-2">{word.romanian}</h2>
             <p className="text-gray-500 font-mono text-2xl mb-4">{word.pronunciation}</p>
             <div className="h-1 w-20 bg-indigo-200 rounded-full mb-4"></div>
             <h2 className="text-4xl font-bold text-indigo-600 mb-2">{word.turkish}</h2>
         </div>

         <div className="w-full bg-indigo-600 rounded-2xl p-6 text-white text-left shadow-md">
             <p className="text-xs uppercase tracking-widest text-indigo-200 mb-2 font-bold">Örnek Cümle</p>
             <p className="text-xl font-medium mb-2">"{word.exampleRo}"</p>
             <p className="text-lg italic opacity-90 border-t border-indigo-400 pt-2">{word.exampleTr}</p>
         </div>

         <div className="mt-4 text-gray-400 text-sm font-medium">
             RoTurk ile Romence öğreniyorum!
         </div>
      </div>

      {/* --- SNAPSHOT PREVIEW MODAL --- */}
      {showSnapshotModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 max-w-sm w-full relative shadow-2xl flex flex-col items-center">
                  <button 
                    onClick={() => setShowSnapshotModal(false)}
                    className="absolute top-2 right-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                      <X size={20} />
                  </button>
                  
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Kart Paylaş</h3>
                  
                  {snapshotImage && (
                      <img src={snapshotImage} alt="Snapshot" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6" />
                  )}

                  <button 
                    onClick={handleShare}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition flex items-center justify-center gap-3 shadow-lg active:scale-95"
                  >
                      <Share2 size={24} />
                      Paylaş / İndir
                  </button>
              </div>
          </div>
      )}

      {/* Card Container */}
      <div 
        className={`relative w-full aspect-[3/4] transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={handleCardClick}
      >
        
        {/* --- DIFFICULT MARKING OVERLAY --- */}
        {isMarkingDifficult && (
            <div 
                className="absolute inset-0 z-50 rounded-2xl bg-orange-50/95 dark:bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 pointer-events-none transform-style-3d translate-z-10"
                style={{ transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
            >
                <div className="bg-white dark:bg-gray-800 p-6 rounded-full shadow-xl mb-4 animate-bounce">
                    <BellRing size={48} className="text-orange-500" />
                </div>
                <h3 className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tight mb-2">ÖĞRENİLİYOR</h3>
                <p className="text-orange-400 dark:text-orange-300 font-medium">Listeye Ekleniyor...</p>
            </div>
        )}


        {/* Front of Card */}
        {/* Added 'pointer-events-none' when flipped to prevent ghost clicks on the back face */}
        <div className={`absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col items-center justify-between p-6 backface-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-300 ${isFlipped ? 'pointer-events-none' : 'z-20'}`}>
           {/* Learned Status Badge - Front - Moved to top-2 to avoid overlap */}
           <div className="absolute top-2 left-0 w-full flex justify-center pointer-events-none z-10">
             <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shadow-sm backdrop-blur-sm ${statusBadge.classes}`}>
                {statusBadge.text}
             </span>
           </div>

           {/* Button Container - Increased Z-index to 30 to stay above badge */}
           <div className="w-full flex justify-between items-start z-30 relative">
             <div className="flex gap-2">
                <button
                    onClick={handleBellClick}
                    className={`p-2 rounded-full transition-all border shadow-sm active:scale-90 ${word.needsReview ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-300 border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                    title="Sık Hatırlat"
                >
                    {word.needsReview ? <BellRing size={20} /> : <Bell size={20} />}
                </button>
             </div>
             
             {/* Camera Button on Front */}
             <button
                onClick={handleCapture}
                disabled={isCapturing}
                className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800 transition-all shadow-sm active:scale-90"
                title="Kartın Fotoğrafını Çek"
             >
                {isCapturing ? <Loader2 size={20} className="animate-spin"/> : <Camera size={20} />}
             </button>
           </div>

           <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full mt-4">
              {/* Emoji Visual */}
              <div className="w-48 h-48 rounded-full bg-indigo-50 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-600 shadow-inner">
                <span className="text-8xl select-none filter drop-shadow-sm">{word.emoji || '🇷🇴'}</span>
              </div>

              <div className="text-center">
                  <h2 className="text-5xl font-bold text-gray-800 dark:text-gray-100 mb-2 tracking-tight">{word.romanian}</h2>
                  {word.pronunciation && (
                      <p className="text-gray-500 dark:text-gray-400 font-mono text-xl">{word.pronunciation}</p>
                  )}
              </div>
              
              <button 
                onClick={handlePlayWordAudio}
                className={`p-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 z-10 flex items-center justify-center border-2 
                    ${playingState === 'word' 
                        ? 'bg-green-500 border-green-400 text-white shadow-green-200 dark:shadow-green-900/50' 
                        : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700'
                    }`}
                title="Kelimeyi Dinle"
              >
                {playingState === 'word' ? <Volume2 size={28} className="animate-pulse"/> : <Volume2 size={28} />}
              </button>
           </div>

           <div className="text-gray-400 dark:text-gray-500 text-sm animate-bounce mt-4">
             Çeviri için dokun
           </div>
        </div>

        {/* Back of Card */}
        {/* Added 'pointer-events-none' when NOT flipped to prevent ghost clicks from the front */}
        <div className={`absolute inset-0 w-full h-full bg-indigo-50 dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col items-center justify-start pt-10 p-6 backface-hidden rotate-y-180 border border-indigo-100 dark:border-gray-700 transition-colors duration-300 ${isFlipped ? 'z-20' : 'pointer-events-none'}`}>
           {/* Learned Status Badge - Back - Moved to top-2 */}
           <div className="absolute top-2 left-0 w-full flex justify-center pointer-events-none z-10">
             <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border shadow-sm backdrop-blur-sm ${statusBadge.classes}`}>
                {statusBadge.text}
             </span>
           </div>

           {/* Button Container - Increased Z-index to 30 */}
           <div className="w-full flex justify-between items-start z-30 relative mb-4">
             <div className="flex gap-2">
                <button
                    onClick={handleBellClick}
                    className={`p-2 rounded-full transition-all border shadow-sm active:scale-90 ${word.needsReview ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-300 border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                >
                    {word.needsReview ? <BellRing size={20} /> : <Bell size={20} />}
                </button>
             </div>
             
             {/* Camera Button on Back */}
             <button
                onClick={handleCapture}
                disabled={isCapturing}
                className="p-2 rounded-full bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-all shadow-sm active:scale-90"
             >
                {isCapturing ? <Loader2 size={20} className="animate-spin"/> : <Camera size={20} />}
             </button>
           </div>

           <div className="flex-1 flex flex-col items-center justify-start w-full text-center space-y-4">
              <div className="flex flex-col items-center">
                {/* Mini Emoji on Back */}
                <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl shadow-sm border border-indigo-100 dark:border-gray-600 mb-2">
                    {word.emoji}
                </div>
                <h3 className="text-sm text-indigo-400 dark:text-indigo-300 uppercase tracking-wider mb-2">Anlamı</h3>
                <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100">{word.turkish}</h2>
              </div>

              <div className="w-full bg-white dark:bg-gray-700 p-5 rounded-2xl border border-indigo-100 dark:border-gray-600 shadow-sm relative group flex flex-col items-center transition-all">
                <h3 className="text-xs text-gray-400 dark:text-gray-400 uppercase mb-3 font-bold w-full text-left flex items-center gap-2">
                    <span className="w-1 h-4 bg-indigo-400 rounded-full inline-block"></span>
                    Örnek Cümle
                </h3>
                
                <div className="w-full mb-3">
                     <p className="text-xl text-indigo-900 dark:text-indigo-100 font-medium mb-2 leading-tight text-left">"{word.exampleRo}"</p>
                     <p className="text-md text-gray-600 dark:text-gray-300 italic border-t border-gray-100 dark:border-gray-600 pt-2 text-left">{word.exampleTr}</p>
                </div>

                <button 
                   onClick={handlePlayExampleAudio}
                   className={`p-3 rounded-full transition-all flex items-center justify-center shadow-sm active:scale-90
                        ${playingState === 'example' 
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 ring-2 ring-green-200 dark:ring-green-800' 
                            : 'bg-indigo-50 dark:bg-gray-600 text-indigo-600 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-gray-500'
                        }`}
                   title="Örnek Cümleyi Dinle"
                >
                    {playingState === 'example' ? <Volume2 size={24} className="animate-pulse"/> : <Volume1 size={24} />}
                </button>
              </div>
           </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mt-8 w-full">
        <button 
          onClick={(e) => { 
              e.stopPropagation(); 
              playClickSound(); 
              onNext(); 
          }}
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 h-14 rounded-xl font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw size={20} />
          Atla
        </button>
        <button 
          onClick={(e) => { 
              e.stopPropagation(); 
              playClickSound(); 
              onMarkLearned(word.id); 
          }}
          className="flex-1 bg-green-500 text-white h-14 rounded-xl font-semibold shadow-lg hover:bg-green-600 active:scale-95 active:bg-green-700 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle size={20} />
          Öğrendim
        </button>
      </div>
    </div>
  );
};

export default Flashcard;
