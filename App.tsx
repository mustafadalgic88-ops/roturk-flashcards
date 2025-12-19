
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Word, AppView, UserStats, Achievement, BackupData, SessionLog } from './types';
import Flashcard from './components/Flashcard';
import LearnedList from './components/LearnedList';
import DifficultList from './components/DifficultList';
import Quiz from './components/Quiz';
import AchievementsList from './components/AchievementsList';
import BrainStats from './components/BrainStats';
import ActivityLog from './components/ActivityLog';
import { Layers, List, GraduationCap, Loader2, AlertCircle, ArrowLeft, Trophy, Settings, Download, Upload, X, Save, Minimize, Maximize, Database, Play, Brain, AlertTriangle, Moon, Sun, Check, Info, Clock, Bell, User, History, Users, Activity, FileSearch, FolderOpen, PlusCircle, LogOut } from 'lucide-react';
import { generateVocabularyBatch } from './services/geminiService';
import { playClickSound, playFanfareSound } from './services/audioEffects';
import { saveProgressToLocalFile, loadProgressFromLocalFile, saveToBrowserStorage, loadFromBrowserStorage, clearBrowserStorage } from './services/storageService';
import { OFFLINE_VOCABULARY } from './data/offlineVocabulary';

// --- Achievements Configuration ---
const ACHIEVEMENTS_DATA: Achievement[] = [
    { id: 'first_step', title: 'İlk Adım', description: 'İlk kelimeni öğrendin.', icon: '🌱', condition: (stats) => stats.totalLearned >= 1 },
    { id: 'vocab_builder', title: 'Kelime Avcısı', description: '10 kelime öğrendin.', icon: '📚', condition: (stats) => stats.totalLearned >= 10 },
    { id: 'master_mind', title: 'Usta Zihin', description: '50 kelime öğrendin.', icon: '🧠', condition: (stats) => stats.totalLearned >= 50 },
    { id: 'quiz_rookie', title: 'Test Çırağı', description: 'Testlerde toplam 10 doğru yaptın.', icon: '📝', condition: (stats) => stats.quizScore >= 10 },
    { id: 'on_fire', title: 'Alev Aldın', description: 'Testte 5 seri yakaladın.', icon: '🔥', condition: (stats) => stats.bestStreak >= 5 }
];

const App: React.FC = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [view, setView] = useState<AppView>(AppView.FLASHCARDS);
  
  // -- Navigation & History State --
  const [cardHistory, setCardHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [liveIndex, setLiveIndex] = useState(0);

  // -- Scroll Persistence State --
  const [learnedListScroll, setLearnedListScroll] = useState(0);
  const [difficultListScroll, setDifficultListScroll] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // -- Save State --
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // -- Reminder State --
  const lastSaveTimeRef = useRef<number>(Date.now());
  const [showSaveReminder, setShowSaveReminder] = useState(false);
  const [reminderElapsedMinutes, setReminderElapsedMinutes] = useState(0);

  // -- User & Session State --
  const [userName, setUserName] = useState<string>('');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const currentSessionIdRef = useRef<string>(crypto.randomUUID());
  
  // -- Real Data: Daily Active Users --
  const [dailyActiveUsers, setDailyActiveUsers] = useState(1);

  // -- Theme State --
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      if (typeof window !== 'undefined') {
          return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
      }
      return 'light';
  });
  
  // Splash & Restore States
  const [showSplash, setShowSplash] = useState(true);
  const [foundSaveData, setFoundSaveData] = useState<BackupData | null>(null);
  const [showStartupOptions, setShowStartupOptions] = useState(false); // New state for manual load option
  
  // UI Feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ file: File; data: BackupData } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startupFileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Stats and Achievements
  const [userStats, setUserStats] = useState<UserStats>({
      totalLearned: 0,
      quizScore: 0,
      currentStreak: 0,
      bestStreak: 0,
      achievements: [],
      targetWordCount: 100 // Default target
  });

  const [reviewWordId, setReviewWordId] = useState<string | null>(null);

  // Derived Lists
  const unlearnedWords = useMemo(() => words.filter(w => !w.isLearned && !w.needsReview), [words]);
  const learnedWords = useMemo(() => words.filter(w => w.isLearned && !w.needsReview), [words]);
  const difficultWords = useMemo(() => words.filter(w => w.needsReview), [words]);

  // Current Active Word Logic
  const currentFlashcardWord = useMemo(() => {
      if (reviewWordId) return words.find(w => w.id === reviewWordId);
      if (historyIndex >= 0 && historyIndex < cardHistory.length) {
          const id = cardHistory[historyIndex];
          return words.find(w => w.id === id);
      }
      if (unlearnedWords.length > 0) {
          const safeIndex = Math.min(liveIndex, unlearnedWords.length - 1);
          return unlearnedWords[Math.max(0, safeIndex)];
      }
      return undefined;
  }, [historyIndex, cardHistory, words, unlearnedWords, liveIndex, reviewWordId]);

  // Offline stats
  const offlineStats = useMemo(() => {
      const total = OFFLINE_VOCABULARY.length;
      const currentWordSet = new Set(words.map(w => w.romanian.toLowerCase().trim()));
      const usedCount = OFFLINE_VOCABULARY.filter(w => currentWordSet.has(w.romanian.toLowerCase().trim())).length;
      return { total, remaining: total - usedCount };
  }, [words]);

  // --- DEVICE HELPER ---
  const getDeviceInfo = () => {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) return "Android Cihaz";
      if (/iPad|iPhone|iPod/.test(ua)) return "iOS Cihaz";
      if (/windows/i.test(ua)) return "Windows PC";
      if (/macintosh/i.test(ua)) return "Mac";
      return "Web Tarayıcısı";
  };

  // --- VIEW COUNT TRACKING ---
  useEffect(() => {
    if (currentFlashcardWord && (view === AppView.FLASHCARDS || reviewWordId)) {
        setWords(prevWords => prevWords.map(w => {
            if (w.id === currentFlashcardWord.id) {
                return { ...w, reviewCount: (w.reviewCount || 0) + 1 };
            }
            return w;
        }));
    }
  }, [currentFlashcardWord?.id, view, reviewWordId]); 

  // --- THEME EFFECT ---
  useEffect(() => {
      const root = window.document.documentElement;
      if (theme === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      playClickSound();
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // --- AUTO SAVE EFFECT & DIRTY STATE ---
  useEffect(() => {
      if (hasInitialized && words.length > 0) {
          // Mark as unsaved whenever data changes
          setHasUnsavedChanges(true);

          const timeoutId = setTimeout(() => {
              saveToBrowserStorage(words, userStats);
              // Also save logs to local storage if needed (we can store them separately or part of main object)
              localStorage.setItem('roturk_session_logs', JSON.stringify(sessionLogs));
          }, 1000); 
          return () => clearTimeout(timeoutId);
      }
  }, [words, userStats, hasInitialized, sessionLogs]);

  // --- 10 MINUTE REMINDER LOGIC ---
  useEffect(() => {
      const interval = setInterval(() => {
          if (!hasUnsavedChanges || showSaveReminder) return;

          const now = Date.now();
          const diff = now - lastSaveTimeRef.current;
          const TEN_MINUTES = 10 * 60 * 1000;

          if (diff >= TEN_MINUTES) {
              setReminderElapsedMinutes(Math.floor(diff / 60000));
              setShowSaveReminder(true);
              playClickSound();
          }
      }, 30000);

      return () => clearInterval(interval);
  }, [hasUnsavedChanges, showSaveReminder]);

  // --- CALCULATE UNIQUE USERS LAST 24H ---
  useEffect(() => {
      if (sessionLogs.length === 0) return;

      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

      const uniqueUsers = new Set();
      
      sessionLogs.forEach(log => {
          if (log.loginTime >= twentyFourHoursAgo) {
              // Combine name and device model to be more specific, or just name
              // Assuming 'userName' is the differentiator for "users"
              if (log.userName) {
                  uniqueUsers.add(log.userName);
              }
          }
      });

      // Ensure at least 1 (the current user) is counted if logs are weird
      setDailyActiveUsers(Math.max(1, uniqueUsers.size));

  }, [sessionLogs]);

  // --- HELPER: Trigger Mobile Fullscreen ---
  // Browsers require a user gesture (click) to enter fullscreen.
  // We call this on "Start", "Resume", etc.
  const triggerMobileFullscreen = () => {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen) {
          (docEl as any).webkitRequestFullscreen();
      }
  };

  // --- INITIALIZATION & SESSION START ---
  useEffect(() => {
      // 1. Check for Auto-Save
      const autoSavedData = loadFromBrowserStorage();
      
      // Load saved logs
      const savedLogs = localStorage.getItem('roturk_session_logs');
      if (savedLogs) {
          try {
              const parsedLogs = JSON.parse(savedLogs);
              setSessionLogs(parsedLogs);
          } catch(e) {}
      }

      // Load User Name
      const savedName = localStorage.getItem('roturk_username');
      
      // 2. Splash Screen Timer
      const timer = setTimeout(() => {
          setShowSplash(false);
          
          if (savedName) {
              setUserName(savedName);
              // Start Session immediately
              initSession(savedName);
          } else {
              // Ask for name
              setIsNameModalOpen(true);
          }

          if (autoSavedData && autoSavedData.words.length > 0) {
              setFoundSaveData(autoSavedData);
          } else {
              // CHANGE: If no local data found, show Startup Options instead of strictly starting fresh immediately
              setShowStartupOptions(true);
          }
      }, 2500);
      
      return () => clearTimeout(timer);
  }, []);

  const initSession = (name: string) => {
      const newLog: SessionLog = {
          id: currentSessionIdRef.current,
          userName: name,
          deviceModel: getDeviceInfo(),
          loginTime: Date.now(),
          lastActiveTime: Date.now(),
          wordsLearnedInSession: 0,
          isActive: true
      };
      
      setSessionLogs(prev => {
          // Mark all others as inactive
          const deactivated = prev.map(l => ({ ...l, isActive: false }));
          return [newLog, ...deactivated];
      });
  };

  const handleNameSubmit = () => {
      if (nameInputRef.current && nameInputRef.current.value.trim()) {
          // Trigger fullscreen on this interaction
          triggerMobileFullscreen();
          
          const name = nameInputRef.current.value.trim();
          setUserName(name);
          localStorage.setItem('roturk_username', name);
          setIsNameModalOpen(false);
          initSession(name);
          playClickSound();
      }
  };

  // Update session words learned
  const incrementSessionLearned = () => {
      setSessionLogs(prev => prev.map(log => {
          if (log.id === currentSessionIdRef.current) {
              return { 
                  ...log, 
                  wordsLearnedInSession: log.wordsLearnedInSession + 1,
                  lastActiveTime: Date.now()
              };
          }
          return log;
      }));
  };

  // Fetch words effect
  useEffect(() => {
    // UPDATED: Only fetch automatically if initialized AND no saved data AND no startup options visible
    if (hasInitialized && !foundSaveData && !showStartupOptions) {
      fetchMoreWords();
    }
  }, [hasInitialized, foundSaveData, showStartupOptions]); 

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Achievement Check
  useEffect(() => {
    let newUnlocked: string[] = [];
    ACHIEVEMENTS_DATA.forEach(ach => {
        if (!userStats.achievements.includes(ach.id) && ach.condition(userStats)) {
            newUnlocked.push(ach.id);
        }
    });
    if (newUnlocked.length > 0) {
        playFanfareSound();
        setUserStats(prev => ({ ...prev, achievements: [...prev.achievements, ...newUnlocked] }));
        showToast(`🏆 Yeni Başarım: ${newUnlocked.length} rozet kazanıldı!`);
    }
  }, [userStats]);

  const showToast = (message: string) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 3500); };

  const fetchMoreWords = useCallback(async () => {
    if (isLoading) return; 
    setIsLoading(true);
    try {
        const allExistingWordsSet = new Set(words.map(w => w.romanian.toLowerCase().trim()));
        let validNewWords: Word[] = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 5; 
        const BATCH_SIZE = 5;

        while (validNewWords.length < 3 && attempts < MAX_ATTEMPTS) {
            const existingRomanianList = words.map(w => w.romanian);
            const rawNewWordsData = await generateVocabularyBatch(BATCH_SIZE, existingRomanianList);
            const uniqueCandidates = (rawNewWordsData as Word[]).filter(newWord => {
                const normalized = newWord.romanian.toLowerCase().trim();
                const isInState = allExistingWordsSet.has(normalized);
                const isInCurrentBatch = validNewWords.some(w => w.romanian.toLowerCase().trim() === normalized);
                return !isInState && !isInCurrentBatch;
            });
            validNewWords = [...validNewWords, ...uniqueCandidates];
            attempts++;
            if (validNewWords.length >= 3) break;
        }
        
        if (validNewWords.length > 0) {
            const newWordsAdded = [...validNewWords];
            setWords(prev => {
                const combined = [...prev, ...newWordsAdded];
                return combined;
            });
            showToast(`${validNewWords.length} yeni kelime eklendi!`);
        }
    } catch (error) {
        console.error("Error fetching words:", error);
    } finally {
        setIsLoading(false);
    }
  }, [words, isLoading, cardHistory]);

  // --- ACTIONS ---

  const recordHistory = (id: string) => {
      setCardHistory(prev => {
          if (prev.length > 0 && prev[prev.length - 1] === id) return prev;
          return [...prev, id];
      });
  };

  const handleMarkLearned = (id: string) => {
    const word = words.find(w => w.id === id);
    if (!word) return;

    setWords(prev => prev.map(w => {
        if (w.id === id) {
            return { ...w, isLearned: true, needsReview: false };
        }
        return w;
    }));

    if (!word.isLearned) {
        setUserStats(prev => ({ ...prev, totalLearned: prev.totalLearned + 1 }));
        incrementSessionLearned(); // Update session log
    }

    if (reviewWordId) {
        setReviewWordId(null);
    } else {
        if (historyIndex === -1) {
             recordHistory(id);
             if (unlearnedWords.length - liveIndex <= 3) fetchMoreWords();
             if (liveIndex < unlearnedWords.length - 1) {
             } else {
                 fetchMoreWords();
             }
        } else {
            if (historyIndex < cardHistory.length - 1) {
                setHistoryIndex(prev => prev + 1);
            } else {
                setHistoryIndex(-1);
            }
        }
    }
  };

  const handleNextCard = () => {
    if (reviewWordId) { setReviewWordId(null); return; }
    
    if (historyIndex === -1) {
        if (currentFlashcardWord) {
             recordHistory(currentFlashcardWord.id);
             if (unlearnedWords.length - liveIndex <= 3) {
                 fetchMoreWords();
             }
             setLiveIndex(prev => prev + 1);
        } else {
            fetchMoreWords();
        }
    } else {
        if (historyIndex < cardHistory.length - 1) {
            setHistoryIndex(prev => prev + 1);
        } else {
            setHistoryIndex(-1);
        }
    }
  };

  const handlePrevCard = () => {
      if (historyIndex === -1) {
          if (cardHistory.length > 0) {
              setHistoryIndex(cardHistory.length - 1);
          }
      } else {
          if (historyIndex > 0) {
              setHistoryIndex(prev => prev - 1);
          }
      }
  };

  const handleUpdateWord = (id: string, updates: Partial<Word>) => setWords(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  
  const handleToggleReview = (id: string) => {
      setWords(prev => prev.map(w => {
          if (w.id === id) {
              const newNeedsReview = !w.needsReview;
              if (!newNeedsReview) {
                  return { ...w, needsReview: false, isLearned: true };
              }
              return { ...w, needsReview: newNeedsReview };
          }
          return w;
      }));
  };

  const handleFlashcardToggleReview = (id: string) => {
    const word = words.find(w => w.id === id);
    if (!word) return;

    handleToggleReview(id);

    if (!word.needsReview) {
        if (historyIndex !== -1) {
            setHistoryIndex(-1);
        } 
        else {
            if (unlearnedWords.length - liveIndex <= 3) {
                fetchMoreWords();
            }
        }
    }
  };
  
  const handleViewChange = (newView: AppView) => {
      playClickSound();
      setView(newView);
      setReviewWordId(null);
  };

  const handleQuizComplete = (pct: number, correct: number) => {
      playFanfareSound();
      alert(`Test Tamamlandı! Başarı: %${Math.round(pct)}`);
      setUserStats(prev => ({ ...prev, quizScore: prev.quizScore + correct }));
      if (pct === 100 && correct >= 5) setUserStats(prev => ({ ...prev, bestStreak: Math.max(prev.bestStreak, correct) }));
      setView(AppView.ACHIEVEMENTS);
  };

  const handleUpdateTarget = (newTarget: number) => {
      playClickSound();
      setUserStats(prev => ({ ...prev, targetWordCount: newTarget }));
      showToast(`Hedef ${newTarget} kelime olarak güncellendi!`);
  };

  // --- RESTORE LOGIC ---
  const handleRestoreSession = () => {
      // Trigger fullscreen on this interaction
      triggerMobileFullscreen();

      if (!foundSaveData) return;
      playClickSound();
      setWords(foundSaveData.words);
      setUserStats({
          ...foundSaveData.userStats,
          targetWordCount: foundSaveData.userStats.targetWordCount || 100
      });
      setFoundSaveData(null);
      setHasInitialized(true);
      setHasUnsavedChanges(false); 
      lastSaveTimeRef.current = Date.now();
      showToast("Oturum geri yüklendi. İyi çalışmalar!");
  };

  const handleStartFresh = () => {
      // Trigger fullscreen on this interaction
      triggerMobileFullscreen();

      playClickSound();
      clearBrowserStorage();
      setFoundSaveData(null);
      setWords([]);
      setUserStats({ totalLearned: 0, quizScore: 0, currentStreak: 0, bestStreak: 0, achievements: [], targetWordCount: 100 });
      setHasInitialized(true);
      setHasUnsavedChanges(false);
      lastSaveTimeRef.current = Date.now();
  };

  const handleManualStartFresh = () => {
      // Trigger fullscreen on this interaction
      triggerMobileFullscreen();

      playClickSound();
      setShowStartupOptions(false);
      // Trigger the "fresh start" flow
      setHasInitialized(true);
      lastSaveTimeRef.current = Date.now();
  };

  const handleManualLoadFromFile = () => {
      playClickSound();
      // NOTE: Removed preemptive triggerMobileFullscreen here as it blocks the file picker on some browsers.
      if (startupFileInputRef.current) {
          startupFileInputRef.current.value = '';
          startupFileInputRef.current.click();
      }
  };

  const handleStartupFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Aggressively trigger fullscreen on change event (before async)
      triggerMobileFullscreen();

      const file = e.target.files?.[0]; 
      if (!file) return;
      
      setIsLoading(true);
      try { 
          const data = await loadProgressFromLocalFile(file); 
          // Load directly since we are at startup
          setWords(data.words);
          setUserStats({
              ...data.userStats,
              targetWordCount: data.userStats.targetWordCount || 100
          });
          setCardHistory([]);
          setHistoryIndex(-1);
          const unlearned = data.words.filter(w => !w.isLearned);
          if (unlearned.length > 0) {
              setCardHistory([unlearned[0].id]);
              setHistoryIndex(0);
          }
          
          setHasUnsavedChanges(false);
          lastSaveTimeRef.current = Date.now();
          showToast("Dosya başarıyla yüklendi!");
          setShowStartupOptions(false);
          setHasInitialized(true);
          setView(AppView.FLASHCARDS);
      } 
      catch (err) { 
          showToast("Dosya okunamadı veya hatalı."); 
      } finally { 
          setIsLoading(false); 
      }
  };

  // --- SAVE/LOAD FILE ---
  const handleSaveLevel = () => { 
      playClickSound(); 
      saveProgressToLocalFile(words, userStats); 
      setHasUnsavedChanges(false); 
      setShowSaveReminder(false);
      lastSaveTimeRef.current = Date.now(); // Reset reminder timer
      showToast("Yedek alındı."); 
      setIsSettingsOpen(false); 
  };

  const handleRemindLater = () => {
      playClickSound();
      setShowSaveReminder(false);
      lastSaveTimeRef.current = Date.now(); // Reset reminder timer to start counting from now
  };
  
  const handleTriggerLoadLevel = () => { 
      playClickSound(); 
      // NOTE: Removed preemptive triggerMobileFullscreen here as it blocks the file picker.
      fileInputRef.current && (fileInputRef.current.value = '', fileInputRef.current.click()); 
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Aggressively trigger fullscreen on change event (before async)
      triggerMobileFullscreen();

      const file = e.target.files?.[0]; if (!file) return;
      setIsLoading(true);
      try { const data = await loadProgressFromLocalFile(file); setPendingImport({ file, data }); setIsSettingsOpen(false); } 
      catch (err) { showToast("Dosya hatası."); } finally { setIsLoading(false); }
  };
  const confirmImportLevel = () => {
      if (!pendingImport) return;
      // Trigger fullscreen
      triggerMobileFullscreen();

      playClickSound();
      setWords(pendingImport.data.words);
      setUserStats({
          ...pendingImport.data.userStats,
          targetWordCount: pendingImport.data.userStats.targetWordCount || 100
      });
      setCardHistory([]);
      setHistoryIndex(-1);
      const unlearned = pendingImport.data.words.filter(w => !w.isLearned);
      if (unlearned.length > 0) {
          setCardHistory([unlearned[0].id]);
          setHistoryIndex(0);
      }
      setHasUnsavedChanges(false);
      lastSaveTimeRef.current = Date.now(); // Reset timer
      showToast("Seviye yüklendi!");
      setPendingImport(null);
      setView(AppView.FLASHCARDS);
  };

  const toggleFullscreen = () => { playClickSound(); if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(console.error); else if (document.exitFullscreen) document.exitFullscreen(); };

  if (showSplash) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white animate-in fade-in duration-500">
              <div className="flex items-center gap-4 text-6xl mb-6 animate-bounce"><span>🇷🇴</span><span>🇹🇷</span></div>
              <h1 className="text-4xl font-extrabold mb-2">RoTurk</h1>
              <p className="text-indigo-200 text-lg font-medium">Romence Öğrenmenin En Kolay Yolu</p>
              <div className="mt-8 flex flex-col items-center gap-2"><Loader2 className="animate-spin w-8 h-8 text-white opacity-80" /><p className="text-sm opacity-60">Yükleniyor...</p></div>
          </div>
      );
  }

  // --- NAME INPUT MODAL ---
  if (isNameModalOpen) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-gray-100 dark:border-gray-700">
                  <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <User className="text-indigo-600 dark:text-indigo-300 w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Hoş Geldin!</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Seni tanımamız için lütfen adını gir.</p>
                  
                  <input 
                    ref={nameInputRef}
                    type="text" 
                    placeholder="Adın nedir?" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-center"
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  />
                  
                  <button 
                    onClick={handleNameSubmit}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg"
                  >
                      Başla
                  </button>
              </div>
          </div>
      );
  }

  // --- STARTUP OPTIONS MODAL (No Local Storage Found) ---
  if (showStartupOptions && !foundSaveData && !isNameModalOpen) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-gray-100 dark:border-gray-700 relative">
                  <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FileSearch className="text-orange-600 dark:text-orange-400 w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">Kayıtlı Oturum Yok</h2>
                  <p className="text-gray-500 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                      Tarayıcı hafızasında aktif bir oturum bulamadık. Daha önce indirdiğiniz bir yedek dosyanız (.json) varsa onu yükleyebilir veya sıfırdan başlayabilirsiniz.
                  </p>
                  
                  <div className="space-y-3">
                      <button 
                          onClick={handleManualLoadFromFile}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg transition flex items-center justify-center gap-2 group"
                      >
                          <FolderOpen size={20} className="group-hover:scale-110 transition-transform" /> 
                          Dosyadan Yükle
                      </button>
                      
                      <input 
                          type="file" 
                          ref={startupFileInputRef} 
                          className="hidden" 
                          accept=".json" 
                          onChange={handleStartupFileChange} 
                      />

                      <button 
                          onClick={handleManualStartFresh}
                          className="w-full py-4 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-2 border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl font-bold transition flex items-center justify-center gap-2"
                      >
                          <PlusCircle size={20} /> 
                          Hayır, Sıfırdan Başla
                      </button>
                  </div>
                  <p className="mt-4 text-xs text-gray-400">
                      Not: Uygulama otomatik olarak ilerlemenizi tarayıcıya kaydeder. Dosya yedeklemesi manueldir.
                  </p>
              </div>
          </div>
      );
  }

  // --- VIEW RENDERING ---
  let content;
  if (view === AppView.ACTIVITY_LOG) {
      content = <ActivityLog 
                    logs={sessionLogs} 
                    currentSessionId={currentSessionIdRef.current}
                    onBack={() => setView(AppView.FLASHCARDS)} 
                />;
  } else if (view === AppView.FLASHCARDS || reviewWordId) {
      if (!currentFlashcardWord && isLoading) {
          content = <div className="flex flex-col items-center justify-center h-full text-indigo-600 dark:text-indigo-400"><Loader2 className="animate-spin w-12 h-12 mb-4" /><p className="font-medium">Hazırlanıyor...</p></div>;
      } else if (!currentFlashcardWord) {
          content = <div className="flex flex-col items-center justify-center h-full text-center p-6 dark:text-gray-200"><h2 className="text-2xl font-bold mb-4">Harika! 🎉</h2><p className="mb-6 text-gray-600 dark:text-gray-400">Yeni kelime kalmadı.</p><button onClick={fetchMoreWords} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md dark:bg-indigo-500">Yeni Kelime Getir</button></div>;
      } else {
          content = (
            <div className="h-full overflow-y-auto flex flex-col items-center">
                {reviewWordId && <div className="p-2 shrink-0 w-full max-w-md"><button onClick={() => setReviewWordId(null)} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300 font-medium px-4 py-2 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-lg"><ArrowLeft size={20} /> Listeye Dön</button></div>}
                <div className="w-full max-w-md">
                    <Flashcard 
                        word={currentFlashcardWord} 
                        onMarkLearned={handleMarkLearned}
                        onNext={handleNextCard}
                        onPrev={handlePrevCard}
                        canGoPrev={historyIndex > 0 || (historyIndex === -1 && cardHistory.length > 0)}
                        onUpdateWord={handleUpdateWord}
                        onToggleReview={handleFlashcardToggleReview}
                    />
                </div>
            </div>
          );
      }
  } else if (view === AppView.LEARNED_LIST) {
      content = <LearnedList 
                    words={learnedWords} 
                    onToggleReview={handleToggleReview} 
                    onOpenFlashcard={setReviewWordId}
                    initialScroll={learnedListScroll}
                    onSaveScroll={setLearnedListScroll} 
                />;
  } else if (view === AppView.DIFFICULT_LIST) {
      content = <DifficultList 
                    words={difficultWords} 
                    onToggleReview={handleToggleReview} 
                    onOpenFlashcard={setReviewWordId}
                    initialScroll={difficultListScroll}
                    onSaveScroll={setDifficultListScroll} 
                />;
  } else if (view === AppView.QUIZ) content = <div className="h-full overflow-y-auto"><Quiz words={learnedWords} onComplete={handleQuizComplete} /></div>;
  else if (view === AppView.ACHIEVEMENTS) content = <div className="h-full overflow-y-auto"><AchievementsList stats={userStats} achievements={ACHIEVEMENTS_DATA} /></div>;
  else if (view === AppView.BRAIN_STATS) content = <BrainStats stats={userStats} learnedCount={learnedWords.length} difficultCount={difficultWords.length} onUpdateTarget={handleUpdateTarget} />;

  // --- PC/DESKTOP SIDEBAR COMPONENT ---
  const DesktopSidebar = () => (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen shrink-0 transition-colors duration-300">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2 select-none">
                <span className="text-3xl">🇷🇴</span> RoTurk <span className="text-3xl">🇹🇷</span>
            </h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                <User size={16} />
                <span className="font-medium truncate">{userName || "Misafir"}</span>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => handleViewChange(AppView.FLASHCARDS)} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${view === AppView.FLASHCARDS && !reviewWordId ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <Layers size={20} /> Kartlar
            </button>
            <button onClick={() => handleViewChange(AppView.DIFFICULT_LIST)} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${view === AppView.DIFFICULT_LIST ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <AlertCircle size={20} /> Tekrar Listesi
            </button>
            <button onClick={() => handleViewChange(AppView.LEARNED_LIST)} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${view === AppView.LEARNED_LIST ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <List size={20} /> Öğrendiklerim
            </button>
            <button onClick={() => handleViewChange(AppView.QUIZ)} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${view === AppView.QUIZ ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <GraduationCap size={20} /> Test Modu
            </button>
            <button onClick={() => handleViewChange(AppView.BRAIN_STATS)} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${view === AppView.BRAIN_STATS ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <Brain size={20} /> İstatistikler
            </button>
            <button onClick={() => handleViewChange(AppView.ACHIEVEMENTS)} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-all ${view === AppView.ACHIEVEMENTS ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <Trophy size={20} /> Başarılar
            </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
             {/* Quick Actions in Sidebar */}
             <button onClick={() => { playClickSound(); setIsSettingsOpen(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <Settings size={18} /> Ayarlar
             </button>
             <button onClick={toggleTheme} className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                {theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}
             </button>
        </div>
    </aside>
  );

  return (
    <div className="h-screen flex flex-col md:flex-row w-full bg-gray-50 dark:bg-gray-950 shadow-2xl overflow-hidden relative transition-colors duration-300">
      {toastMessage && <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-[60] w-max max-w-[90%] animate-in fade-in slide-in-from-bottom-5 duration-300"><div className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium"><div className="bg-gray-700 dark:bg-gray-900 p-1 rounded-full"><AlertCircle size={16} className="text-white"/></div>{toastMessage}</div></div>}
      
      {/* Save Reminder Modal */}
      {showSaveReminder && (
        <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center border-t-4 border-orange-500">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Clock className="text-orange-600 dark:text-orange-400 w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Hatırlatma</h2>
                
                <div className="bg-orange-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 text-left">
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                        Şu kadar süre geçti: <span className="font-bold text-orange-600 dark:text-orange-400">{reminderElapsedMinutes} dakika</span>.
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Henüz çalışmanızı dosyaya kaydetmediniz. Verilerinizi güvende tutmak için yedek almanız önerilir.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleSaveLevel}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <Save size={20} /> Şimdi Kaydet
                    </button>
                    <button 
                        onClick={handleRemindLater}
                        className="w-full py-3 bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition flex items-center justify-center gap-2"
                    >
                        <Bell size={18} /> Sonra Hatırlat (10dk)
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Restore Session Modal */}
      {foundSaveData && (
         <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative text-center">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Save className="text-indigo-600 dark:text-indigo-300 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">Tekrar Hoş Geldin!</h2>
                <p className="text-gray-500 dark:text-gray-300 mb-6 leading-relaxed">
                    Son ziyaretinden kalan kayıtlı bir oturum bulduk. Kaldığın yerden devam etmek ister misin?
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 mb-8 border border-gray-100 dark:border-gray-600 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase">Tarih</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{new Date(foundSaveData.timestamp).toLocaleString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase">İlerleme</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{foundSaveData.userStats.totalLearned} Kelime</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={handleRestoreSession}
                        className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <Play size={20} fill="currentColor" /> Devam Et
                    </button>
                    <button 
                        onClick={handleStartFresh}
                        className="w-full py-4 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                    >
                        Yeni Başlangıç Yap
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* Import Modal */}
      {pendingImport && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                <AlertTriangle size={48} className="text-orange-500 mx-auto mb-4"/>
                <h2 className="text-xl font-bold dark:text-white mb-2">Yüklensin mi?</h2>
                
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 px-4">
                    "{pendingImport.file.name}" dosyasındaki veriler mevcut ilerlemenizin üzerine yazılacak.
                </p>

                {/* New Details Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-gray-600 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase">Tarih</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {new Date(pendingImport.data.timestamp).toLocaleDateString('tr-TR')}
                        </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase">Saat</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {new Date(pendingImport.data.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase">İlerleme</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">
                            {pendingImport.data.userStats.totalLearned} Kelime
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setPendingImport(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-xl font-semibold">İptal</button>
                    <button onClick={confirmImportLevel} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold">Yükle</button>
                </div>
            </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && !pendingImport && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={24}/>
            </button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 dark:text-white">
              <Settings size={24}/> Ayarlar
            </h2>
            
            {/* Database Stats */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-600">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-lg">
                        <Database size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Kelime Havuzu</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Offline Veritabanı</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-300">{offlineStats.remaining}</p>
                    <p className="text-xs text-gray-400">/ {offlineStats.total}</p>
                </div>
            </div>

            {/* NEW: Activity Log Button */}
            <button 
                onClick={() => {
                    setIsSettingsOpen(false);
                    setView(AppView.ACTIVITY_LOG);
                }}
                className="w-full mb-4 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl flex items-center justify-between px-4 font-medium transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
            >
                <div className="flex items-center gap-3">
                    <History size={18} />
                    <span>Cihaz ve Oturum Geçmişi</span>
                </div>
                <ArrowLeft size={16} className="rotate-180" />
            </button>

            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button onClick={handleSaveLevel} className="w-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 py-4 rounded-xl flex items-center justify-center gap-3 font-medium transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/60">
                <Download size={20}/> Kaydet (Yedekle)
              </button>
              <button onClick={handleTriggerLoadLevel} className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-4 rounded-xl flex items-center justify-center gap-3 font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-600">
                <Upload size={20}/> Yükle (Geri Al)
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            </div>
          </div>
        </div>
      )}

      {/* RENDER DESKTOP SIDEBAR */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
          
          {/* Header - Optimized for Mobile (Sticky) and Desktop (Full width) */}
          <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-3 py-2 flex justify-between items-center shadow-sm z-20 shrink-0 transition-colors duration-300 gap-2 overflow-x-auto scrollbar-hide">
            
            {/* Logo - Only visible on Mobile since Desktop has Sidebar */}
            <h1 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-1 shrink-0 select-none md:hidden">
                <span className="text-2xl">🇷🇴</span>
                <span className="hidden sm:inline">RoTurk</span>
                <span className="text-2xl">🇹🇷</span>
            </h1>

            {/* Desktop Page Title (Replaces Logo) */}
            <h1 className="hidden md:block text-xl font-bold text-gray-700 dark:text-gray-200">
                {view === AppView.FLASHCARDS ? 'Kelime Kartları' : 
                 view === AppView.LEARNED_LIST ? 'Öğrenilen Kelimeler' :
                 view === AppView.DIFFICULT_LIST ? 'Tekrar Listesi' :
                 view === AppView.QUIZ ? 'Test Modu' :
                 view === AppView.BRAIN_STATS ? 'İstatistikler' : 'RoTurk'}
            </h1>
            
            <div className="flex gap-1.5 items-center ml-auto shrink-0">
                {/* Real Data: Unique Users Last 24h - Optimized for mobile */}
                <div className="flex flex-col items-center justify-center px-1.5 py-0.5 bg-indigo-50 dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-gray-700 shadow-sm min-w-[32px]" title="Son 24 saatteki tekil kullanıcı sayısı">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-none">{dailyActiveUsers}</span>
                    <Users size={10} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                </div>

                {/* Quick Save Button */}
                <button
                    onClick={handleSaveLevel}
                    className={`p-1.5 rounded-full transition-all relative active:scale-95 group ${
                        hasUnsavedChanges
                        ? 'text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                        : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                    }`}
                    title={hasUnsavedChanges ? "Kaydedilmemiş değişiklikler var. Yedeklemek için tıkla." : "Tüm veriler güvende."}
                >
                    <Save size={18} />
                    {hasUnsavedChanges && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center animate-pulse">
                            <span className="sr-only">Kaydedilmedi</span>
                        </div>
                    )}
                </button>

                {/* Stats Group - Optimized */}
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => handleViewChange(AppView.ACHIEVEMENTS)} 
                        className="group relative text-[10px] font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-300 flex items-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all"
                        title="Toplam Puan"
                    >
                        <Trophy size={12} className="text-yellow-500 group-hover:scale-110 transition-transform" /> 
                        {userStats.quizScore}
                    </button>
                    
                    <div className="text-[10px] font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-300 flex items-center gap-1" title="Öğrenilen Kelime Sayısı">
                        <GraduationCap size={12} className="text-green-500" /> 
                        {learnedWords.length}
                    </div>
                </div>

                {/* Fullscreen Toggle - Optimized & VISIBLE ON MOBILE */}
                <button
                    onClick={toggleFullscreen}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
                    title={isFullscreen ? "Küçült" : "Tam Ekran"}
                >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
                
                {/* Divider - Mobile Only Actions (Hidden on Desktop because they are in Sidebar) */}
                <div className="md:hidden flex gap-1 items-center">
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
                    
                    <button 
                        onClick={toggleTheme} 
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95" 
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    
                    <button 
                        onClick={() => { playClickSound(); setIsSettingsOpen(true); }} 
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>
          </header>

          {/* Content Body - Removed max-w-md constraint for desktop */}
          <div className="flex-1 overflow-hidden relative w-full">
            {content}
          </div>

          {/* Mobile Bottom Navigation (Hidden on md+) */}
          <nav className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-2 pb-6 flex justify-between items-end z-20 shrink-0 transition-colors duration-300">
            <button onClick={() => handleViewChange(AppView.FLASHCARDS)} className={`flex flex-col items-center flex-1 p-2 rounded-lg transition-colors ${view === AppView.FLASHCARDS && !reviewWordId ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400 dark:text-gray-500'}`}><Layers size={22} /><span className="text-[10px] font-medium mt-1">Kartlar</span></button>
            
            <button onClick={() => handleViewChange(AppView.DIFFICULT_LIST)} className={`flex flex-col items-center flex-1 p-2 rounded-lg transition-colors ${view === AppView.DIFFICULT_LIST ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'text-gray-400 dark:text-gray-500'}`}><AlertCircle size={22} /><span className="text-[10px] font-medium mt-1">Tekrar</span></button>
            
            {/* CENTER BRAIN BUTTON */}
            <div className="relative -top-5">
                <button 
                    onClick={() => handleViewChange(AppView.BRAIN_STATS)} 
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl border-4 border-white dark:border-gray-800 transition-all transform hover:scale-105 active:scale-95 ${view === AppView.BRAIN_STATS ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400'}`}
                >
                    <Brain size={32} />
                </button>
            </div>

            <button onClick={() => handleViewChange(AppView.QUIZ)} className={`flex flex-col items-center flex-1 p-2 rounded-lg transition-colors ${view === AppView.QUIZ ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400 dark:text-gray-500'}`}><GraduationCap size={22} /><span className="text-[10px] font-medium mt-1">Test</span></button>
            
            <button onClick={() => handleViewChange(AppView.LEARNED_LIST)} className={`flex flex-col items-center flex-1 p-2 rounded-lg transition-colors ${view === AppView.LEARNED_LIST ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400 dark:text-gray-500'}`}><List size={22} /><span className="text-[10px] font-medium mt-1">Listem</span></button>
          </nav>
      </main>
    </div>
  );
};

export default App;
