
import React, { useState, useEffect, useCallback } from 'react';
import { Word } from '../types';
import { Trophy, ArrowRight, XCircle, CheckCircle, Sparkles, RotateCcw, Play, Save, Eye } from 'lucide-react';
import { playSuccessSound, playErrorSound, playStreakSound, playClickSound } from '../services/audioEffects';

interface QuizProps {
  words: Word[];
  onComplete: (score: number, correctCount: number) => void;
}

// Internal type for the question structure
interface QuestionType {
    word: Word;
    options: string[];
    correctAnswer: string;
}

// Type for saving/loading session
interface QuizSession {
    questions: QuestionType[];
    currentQuestionIndex: number;
    score: number;
    streak: number;
}

const STORAGE_KEY_QUIZ = 'roturk_active_quiz_session';

const Quiz: React.FC<QuizProps> = ({ words, onComplete }) => {
  // We use state for questions now instead of useMemo to allow loading from storage
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Resume Modal State
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedSession, setSavedSession] = useState<QuizSession | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Logic to Generate New Questions ---
  const generateNewQuestions = useCallback(() => {
    if (words.length < 4) return [];

    // Prioritize words with LOWER reviewCount to increase learning potential.
    // Sort words by reviewCount ascending.
    const candidates = [...words].sort((a, b) => {
        const countDiff = (a.reviewCount || 0) - (b.reviewCount || 0);
        // If counts are equal, randomize slightly to avoid same order every time
        if (countDiff === 0) return 0.5 - Math.random();
        return countDiff;
    });

    // Take the top 20 candidates (those with lowest views)
    // Then shuffle ONLY those 20 to pick 10 random ones from the "least viewed" pool.
    const poolSize = Math.min(20, candidates.length);
    const pool = candidates.slice(0, poolSize).sort(() => 0.5 - Math.random());
    const selectedWords = pool.slice(0, Math.min(10, pool.length)); // Max 10 questions

    return selectedWords.map(targetWord => {
      // Generate distractors
      const distractors = words
        .filter(w => w.id !== targetWord.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.turkish);
      
      const options = [...distractors, targetWord.turkish].sort(() => 0.5 - Math.random());

      return {
        word: targetWord,
        options,
        correctAnswer: targetWord.turkish
      };
    });
  }, [words]);

  // --- Save Session Helper ---
  const saveSession = (q: QuestionType[], idx: number, s: number, str: number) => {
      const session: QuizSession = {
          questions: q,
          currentQuestionIndex: idx,
          score: s,
          streak: str
      };
      localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(session));
  };

  const clearSession = () => {
      localStorage.removeItem(STORAGE_KEY_QUIZ);
  };

  // --- Initialization Effect ---
  useEffect(() => {
      // Check local storage for existing session
      const stored = localStorage.getItem(STORAGE_KEY_QUIZ);
      
      if (stored) {
          try {
              const session = JSON.parse(stored) as QuizSession;
              // Basic validation to ensure session is valid
              if (session.questions && session.questions.length > 0 && session.currentQuestionIndex < session.questions.length) {
                  setSavedSession(session);
                  setShowResumePrompt(true);
                  setIsInitialized(true);
                  return; 
              }
          } catch (e) {
              console.error("Failed to parse quiz session", e);
          }
      }

      // If no session or invalid, start new
      startNewQuiz();
      setIsInitialized(true);
  }, []); // Run once on mount

  const startNewQuiz = () => {
      const newQuestions = generateNewQuestions();
      setQuestions(newQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setStreak(0);
      setSelectedOption(null);
      setShowResult(false);
      setShowResumePrompt(false);
      
      // Save initial state so if they leave immediately it's saved? 
      // Actually, usually we save after first interaction, but let's save now to be safe.
      if (newQuestions.length > 0) {
        saveSession(newQuestions, 0, 0, 0);
      }
  };

  const handleResume = () => {
      playClickSound();
      if (savedSession) {
          setQuestions(savedSession.questions);
          setCurrentQuestionIndex(savedSession.currentQuestionIndex);
          setScore(savedSession.score);
          setStreak(savedSession.streak);
          setShowResumePrompt(false);
      }
  };

  const handleStartNew = () => {
      playClickSound();
      clearSession();
      startNewQuiz();
  };

  const handleOptionClick = (option: string) => {
    if (selectedOption || showResult) return;
    
    playClickSound();
    setSelectedOption(option);
    setShowResult(true);

    const isCorrect = option === questions[currentQuestionIndex].correctAnswer;
    
    let newScore = score;
    let newStreak = streak;

    if (isCorrect) {
      newScore = score + 1;
      newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      
      if (newStreak > 0 && newStreak % 5 === 0) {
        playStreakSound();
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      } else {
        playSuccessSound();
      }
    } else {
      playErrorSound();
      newStreak = 0;
      setStreak(0);
    }

    // Save progress immediately (even though we wait for 'Next' to advance index, the score changed)
    // Note: We don't increment index yet.
    saveSession(questions, currentQuestionIndex, newScore, newStreak);
  };

  const handleNext = () => {
    playClickSound();
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedOption(null);
      setShowResult(false);
      
      // Save progress with new index
      saveSession(questions, nextIndex, score, streak);
    } else {
      clearSession(); // Quiz done
      onComplete((score + (selectedOption === questions[currentQuestionIndex].correctAnswer ? 0 : 0)) / questions.length * 100, score);
    }
  };

  if (words.length < 4) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-800 dark:text-gray-200">
            <Trophy className="text-yellow-400 w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Yeterli Kelime Yok</h2>
            <p className="text-gray-600 dark:text-gray-400">Test modunu açmak için en az 4 kelime öğrenmelisin.</p>
        </div>
    )
  }

  // Prevent rendering until we decided whether to show resume prompt or new quiz
  if (!isInitialized) return null;

  // --- Resume Modal ---
  if (showResumePrompt) {
      return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-700">
                  <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Save className="text-indigo-600 dark:text-indigo-300 w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">Yarım Kalan Test</h2>
                  <p className="text-gray-500 dark:text-gray-300 mb-8">
                      Önceki testinizden kalan ilerleme bulundu. 
                      <br/>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {savedSession?.currentQuestionIndex || 0}. Soruda
                      </span> kaldınız.
                  </p>
                  
                  <div className="space-y-3">
                      <button 
                          onClick={handleResume}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg transition flex items-center justify-center gap-2"
                      >
                          <Play size={20} fill="currentColor" /> Devam Et
                      </button>
                      <button 
                          onClick={handleStartNew}
                          className="w-full py-4 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200 border-2 border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl font-bold transition flex items-center justify-center gap-2"
                      >
                          <RotateCcw size={20} /> Yeni Test Başlat
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // Defensive check
  if (questions.length === 0) return null;

  const question = questions[currentQuestionIndex];

  // FIX: Look up the live word from the 'words' prop to get the most current reviewCount.
  // The 'question.word' object is a snapshot created when the quiz was generated (or loaded from storage),
  // so it might have stale data (e.g. reviewCount: 0).
  const liveWord = words.find(w => w.id === question.word.id) || question.word;

  return (
    <div className="max-w-md mx-auto p-6 flex flex-col h-full justify-center relative">
      
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-2xl animate-in fade-in zoom-in duration-300">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl text-center transform scale-110">
              <div className="text-6xl mb-2 animate-bounce">🔥</div>
              <h2 className="text-2xl font-bold text-orange-500">Mükemmel!</h2>
              <p className="font-bold text-gray-700 dark:text-gray-200">Üst üste 5 Doğru!</p>
           </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Soru {currentQuestionIndex + 1}/{questions.length}</span>
            <div className="flex gap-2">
                <span className={`${streak > 2 ? 'text-orange-500 font-bold' : ''}`}>Seri: {streak} 🔥</span>
                <span>Skor: {score}</span>
            </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
            <div 
                className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center mb-8 border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl select-none pointer-events-none transform translate-x-1/4 -translate-y-1/4 dark:invert">
            ?
        </div>
        
        {/* View Count Indicator */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-1.5 opacity-60">
            <Eye size={12} className="text-gray-500 dark:text-gray-400" />
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{liveWord.reviewCount || 0}</span>
        </div>

        <span className="text-sm text-gray-400 uppercase tracking-wider">Bu kelimenin anlamı ne?</span>
        <h2 className="text-4xl font-bold text-indigo-900 dark:text-indigo-100 mt-4 relative z-10">{liveWord.romanian}</h2>
      </div>

      <div className="space-y-3">
        {question.options.map((option, idx) => {
            let buttonClass = "w-full p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 outline-none focus:scale-[1.02] ";
            
            if (showResult) {
                if (option === question.correctAnswer) {
                    buttonClass += "bg-green-50 dark:bg-green-900/40 border-green-500 text-green-700 dark:text-green-300 shadow-md";
                } else if (option === selectedOption) {
                    buttonClass += "bg-red-50 dark:bg-red-900/40 border-red-500 text-red-700 dark:text-red-300 shadow-md";
                } else {
                    buttonClass += "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 opacity-60";
                }
            } else {
                buttonClass += "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-200 hover:shadow-sm";
            }

            return (
                <button 
                    key={idx}
                    onClick={() => handleOptionClick(option)}
                    disabled={showResult}
                    className={buttonClass}
                >
                    <div className="flex justify-between items-center">
                        {option}
                        {showResult && option === question.correctAnswer && <CheckCircle size={20} className="text-green-500"/>}
                        {showResult && option === selectedOption && option !== question.correctAnswer && <XCircle size={20} className="text-red-500"/>}
                    </div>
                </button>
            )
        })}
      </div>

      {showResult && (
        <button 
            onClick={handleNext}
            className="mt-8 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-2"
        >
            {currentQuestionIndex === questions.length - 1 ? 'Bitir' : 'Sonraki Soru'}
            <ArrowRight size={20} />
        </button>
      )}
    </div>
  );
};

export default Quiz;
