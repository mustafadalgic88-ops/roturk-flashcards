
import { GoogleGenAI, Type } from "@google/genai";
import { Word } from '../types';
import { OFFLINE_VOCABULARY } from '../data/offlineVocabulary';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Circuit Breaker State
let isApiQuotaExceeded = false;

// --- Instant TTS (Quota-Free) ---
export const playTextToSpeech = (text: string, lang: string = 'ro') => {
  if (!text) return;

  try {
      const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
          playPromise.catch(error => {
              fallbackSpeechSynthesis(text, lang);
          });
      }
  } catch (e) {
      fallbackSpeechSynthesis(text, lang);
  }
};

const fallbackSpeechSynthesis = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang; 
        window.speechSynthesis.speak(utterance);
    }
}

// --- Text Generation (Vocab) ---
export const generateVocabularyBatch = async (count: number = 3, existingWords: string[] = []): Promise<Partial<Word>[]> => {
  // 1. Normalize existing words for comparison
  const existingWordsSet = new Set(existingWords.map(w => w.toLowerCase().trim()));

  // 2. STRATEGY: OFFLINE FIRST (Instant Loading)
  // Check if we have unused words in our local database.
  const availableOfflineWords = OFFLINE_VOCABULARY.filter(
      item => !existingWordsSet.has(item.romanian.toLowerCase().trim())
  );

  // If we have available offline words, use them immediately.
  // This eliminates network latency completely for the first ~1000 words.
  if (availableOfflineWords.length > 0) {
      // Shuffle and pick 'count' items
      const shuffled = availableOfflineWords.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);

      return selected.map(item => ({
          ...item,
          id: crypto.randomUUID(),
          isLearned: false,
          reviewCount: 0,
          needsReview: false
      }));
  }

  // 3. API FALLBACK (Only if Offline DB is exhausted)
  // If the user has learned ALL ~1000 offline words, we try to fetch new ones from Gemini.
  
  if (isApiQuotaExceeded) {
    // If API is also down/quota exceeded, return random offline words (review mode)
    const randomSelection = OFFLINE_VOCABULARY.sort(() => 0.5 - Math.random()).slice(0, count);
    return randomSelection.map(item => ({ 
        ...item, 
        id: crypto.randomUUID(), 
        isLearned: false, 
        reviewCount: 0, 
        needsReview: false 
    }));
  }

  try {
    const existingWordsStr = existingWords.slice(-100).join(", "); 
    const prompt = `
      Generate ${count} distinct, useful Romanian words for a beginner Turkish speaker.
      Do NOT include these words: ${existingWordsStr}.
      Provide the Romanian word, **its phonetic pronunciation (e.g. [salut])**, Turkish meaning, a simple Romanian example sentence using the word, its Turkish translation, and a **single Emoji** that best represents the word.
      Focus on common nouns, verbs, or adjectives.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              romanian: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              turkish: { type: Type.STRING },
              exampleRo: { type: Type.STRING },
              exampleTr: { type: Type.STRING },
              emoji: { type: Type.STRING }
            },
            required: ["romanian", "pronunciation", "turkish", "exampleRo", "exampleTr", "emoji"]
          }
        }
      }
    });

    const json = JSON.parse(response.text || "[]");
    
    if (!Array.isArray(json) || json.length === 0) {
        throw new Error("Empty API response");
    }

    return json.map((item: any) => ({
        ...item,
        id: crypto.randomUUID(),
        isLearned: false,
        reviewCount: 0,
        needsReview: false
    }));

  } catch (error) {
    console.warn("Gemini API Error. Activating Offline Mode Circuit Breaker.");
    isApiQuotaExceeded = true;
    // Fallback to offline (even if duplicates, better than crash)
    const fallback = OFFLINE_VOCABULARY.sort(() => 0.5 - Math.random()).slice(0, count);
    return fallback.map(item => ({ ...item, id: crypto.randomUUID(), isLearned: false, reviewCount: 0, needsReview: false }));
  }
};
