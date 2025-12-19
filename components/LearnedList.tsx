
import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { Word } from '../types';
import { Volume2, Bell, BellRing, ExternalLink, Search, X, Eye } from 'lucide-react';
import { playTextToSpeech } from '../services/geminiService';

interface LearnedListProps {
  words: Word[];
  onToggleReview: (id: string) => void;
  onOpenFlashcard: (id: string) => void;
  initialScroll: number;
  onSaveScroll: (pos: number) => void;
}

const LearnedList: React.FC<LearnedListProps> = ({ words, onToggleReview, onOpenFlashcard, initialScroll, onSaveScroll }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Restore scroll position immediately when component mounts
  useLayoutEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTop = initialScroll;
    }
  }, []);

  // Save scroll position when unmounting
  useEffect(() => {
    return () => {
        if (containerRef.current) {
            onSaveScroll(containerRef.current.scrollTop);
        }
    };
  }, [onSaveScroll]);

  // Filter words based on search term (Romanian or Turkish)
  const filteredWords = useMemo(() => {
    if (!searchTerm.trim()) return words;
    
    const lowerTerm = searchTerm.toLowerCase();
    return words.filter(word => 
      word.romanian.toLowerCase().includes(lowerTerm) || 
      word.turkish.toLowerCase().includes(lowerTerm) ||
      word.exampleRo.toLowerCase().includes(lowerTerm)
    );
  }, [words, searchTerm]);

  const handlePlayAudio = (e: React.MouseEvent, word: Word) => {
      e.stopPropagation();
      if (playingId === word.id) return;

      setPlayingId(word.id);
      playTextToSpeech(word.romanian, 'ro');

      setTimeout(() => {
          setPlayingId(null);
      }, 1500);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300 w-full">
      
      {/* Fixed Header Section */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 z-10 shrink-0 transition-colors duration-300">
          <div className="flex justify-between items-center mb-4 max-w-7xl mx-auto w-full">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Öğrendiklerim ({words.length})
            </h2>
            <button 
                onClick={() => {
                    setIsSearchOpen(!isSearchOpen);
                    if (isSearchOpen) setSearchTerm(''); // Clear when closing
                }}
                className={`p-3 rounded-full transition-all duration-300 active:scale-90 ${isSearchOpen ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-700'}`}
                title="Kelime Ara"
            >
                {isSearchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
          </div>

          {/* Search Input Area */}
          {isSearchOpen && (
              <div className="mb-2 animate-in slide-in-from-top-2 duration-200 max-w-7xl mx-auto w-full">
                  <div className="relative">
                      <input 
                          type="text" 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Romence veya Türkçe kelime ara..."
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all shadow-sm"
                          autoFocus
                      />
                      <div className="absolute left-3 top-3.5 text-indigo-400">
                          <Search size={18} />
                      </div>
                      {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:scale-90 transition-transform"
                          >
                              <X size={18} />
                          </button>
                      )}
                  </div>
                  {searchTerm && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                          "{searchTerm}" için {filteredWords.length} sonuç bulundu.
                      </p>
                  )}
              </div>
          )}
      </div>

      {/* Scrollable Content Section */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 pt-0 w-full"
      >
        <div className="max-w-7xl mx-auto">
            {words.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-xl font-medium mb-2">Henüz öğrenilen kelime yok.</p>
                    <p className="text-sm">Flash kartları kullanarak kelime dağarcığını geliştirmeye başla!</p>
                </div>
            ) : filteredWords.length === 0 && searchTerm ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                    <Search size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Aradığınız kriterlere uygun kelime bulunamadı.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredWords.map((word) => (
                    <div 
                        key={word.id} 
                        onClick={() => {
                            // Save scroll before navigating away (optional, but robust)
                            if (containerRef.current) onSaveScroll(containerRef.current.scrollTop);
                            onOpenFlashcard(word.id);
                        }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow group relative h-full"
                    >
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center text-3xl select-none relative">
                            {word.emoji || '🇷🇴'}
                            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-600 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink size={12} className="text-indigo-600 dark:text-indigo-300"/>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div className="truncate">
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate">{word.romanian}</h3>
                                        <span className="text-sm text-gray-400 font-mono truncate hidden sm:inline">{word.pronunciation}</span>
                                    </div>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-medium truncate">{word.turkish}</p>
                                </div>
                                
                                <div className="flex flex-col gap-2 items-end shrink-0 pl-2">
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={(e) => handlePlayAudio(e, word)}
                                            className={`p-2 rounded-full transition-all active:scale-90 ${
                                                playingId === word.id 
                                                ? 'text-green-600 bg-green-100 dark:bg-green-900/30' 
                                                : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                                            }`}
                                        >
                                            <Volume2 size={20} className={playingId === word.id ? 'animate-pulse' : ''} />
                                        </button>
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                onToggleReview(word.id); 
                                            }}
                                            className={`p-2 rounded-full transition-all active:scale-90 ${word.needsReview ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/30' : 'text-gray-300 hover:text-orange-400'}`}
                                        >
                                            {word.needsReview ? <BellRing size={20} /> : <Bell size={20} />}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-600">
                                        <Eye size={12} />
                                        {word.reviewCount || 0}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 text-sm border-t border-gray-50 dark:border-gray-700 pt-2">
                                <p className="text-gray-600 dark:text-gray-300 truncate"><span className="font-semibold text-gray-400 text-xs">RO:</span> {word.exampleRo}</p>
                                <p className="text-gray-500 dark:text-gray-400 italic truncate"><span className="font-semibold text-gray-400 text-xs">TR:</span> {word.exampleTr}</p>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LearnedList;
