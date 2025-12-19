
import React from 'react';
import { UserStats, Achievement } from '../types';
import { Trophy, Lock, Star, Zap, BookOpen } from 'lucide-react';

interface AchievementsListProps {
  stats: UserStats;
  achievements: Achievement[];
}

const AchievementsList: React.FC<AchievementsListProps> = ({ stats, achievements }) => {
  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <div className="text-center mb-8 bg-indigo-600 dark:bg-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-300" />
        <h2 className="text-2xl font-bold">Başarılarım</h2>
        <p className="opacity-80">Toplam Skor: {stats.quizScore}</p>
        <div className="flex justify-center gap-4 mt-4 text-sm">
            <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                <BookOpen size={14} /> {stats.totalLearned} Kelime
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                <Zap size={14} /> {stats.bestStreak} En İyi Seri
            </div>
        </div>
      </div>

      <div className="space-y-4">
        {achievements.map((achievement) => {
          const isUnlocked = stats.achievements.includes(achievement.id);
          
          return (
            <div 
              key={achievement.id} 
              className={`relative rounded-xl p-4 border flex items-center gap-4 transition-all duration-300 ${isUnlocked ? 'bg-white dark:bg-gray-800 border-yellow-400 shadow-md transform hover:-translate-y-1' : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-70 grayscale'}`}
            >
               <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner ${isUnlocked ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  {isUnlocked ? achievement.icon : <Lock size={24} className="text-gray-400 dark:text-gray-500"/>}
               </div>
               <div className="flex-1">
                  <h3 className={`font-bold ${isUnlocked ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{achievement.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{achievement.description}</p>
               </div>
               {isUnlocked && <Star className="text-yellow-400 fill-current animate-pulse" size={24} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsList;
