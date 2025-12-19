
import { Word, UserStats, BackupData } from '../types';

const STORAGE_KEY = 'roturk_progress_v1';

export const saveToBrowserStorage = (words: Word[], userStats: UserStats) => {
  const data: BackupData = {
    version: 1,
    timestamp: Date.now(),
    words,
    userStats
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to local storage", e);
  }
};

export const loadFromBrowserStorage = (): BackupData | null => {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    return JSON.parse(item) as BackupData;
  } catch (e) {
    console.error("Failed to load from local storage", e);
    return null;
  }
};

export const clearBrowserStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear local storage", e);
  }
};

export const saveProgressToLocalFile = (words: Word[], userStats: UserStats) => {
  const data: BackupData = {
    version: 1,
    timestamp: Date.now(),
    words,
    userStats
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  
  // Format date for filename: roturk-backup-2023-10-27.json
  const dateStr = new Date().toISOString().split('T')[0];
  link.download = `roturk-level-backup-${dateStr}.json`;
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const loadProgressFromLocalFile = (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const data = JSON.parse(result) as BackupData;

        // Basic validation
        if (!data.words || !Array.isArray(data.words) || !data.userStats) {
          reject(new Error("Geçersiz dosya formatı."));
          return;
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Dosya okunamadı."));
    };

    reader.readAsText(file);
  });
};
