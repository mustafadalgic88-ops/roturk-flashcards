
import React from 'react';
import { SessionLog } from '../types';
import { Clock, Smartphone, User, Zap, Calendar, History, ArrowLeft, Activity } from 'lucide-react';

interface ActivityLogProps {
  logs: SessionLog[];
  onBack: () => void;
  currentSessionId: string | null;
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs, onBack, currentSessionId }) => {
  // Sort logs by time (newest first)
  const sortedLogs = [...logs].sort((a, b) => b.loginTime - a.loginTime);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  const getDeviceIcon = (model: string) => {
    if (model.includes('iPhone') || model.includes('Android') || model.includes('Mobile')) {
        return <Smartphone size={16} />;
    }
    return <Activity size={16} />; // Generic for desktop/others
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 shadow-sm z-10 flex items-center gap-3 border-b dark:border-gray-700">
        <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
        >
            <ArrowLeft size={24} />
        </button>
        <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <History size={20} className="text-indigo-500" />
                Aktivite Kayıtları
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Oturum geçmişi ve performans takibi</p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
                <History size={48} className="mx-auto mb-4 opacity-30" />
                <p>Henüz kayıt bulunmuyor.</p>
            </div>
        ) : (
            sortedLogs.map((log) => {
                const isCurrent = log.id === currentSessionId;
                
                return (
                    <div 
                        key={log.id} 
                        className={`relative rounded-xl p-4 border shadow-sm transition-all ${
                            isCurrent 
                            ? 'bg-white dark:bg-gray-800 border-green-400 dark:border-green-500/50 shadow-green-100 dark:shadow-none' 
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-90'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                {/* Avatar Container with Relative positioning for the badge */}
                                <div className={`relative p-2 rounded-full ${isCurrent ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                    <User size={18} />
                                    
                                    {/* Active Status Indicator (Top-Left) */}
                                    {isCurrent && (
                                        <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5 z-10">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-gray-800"></span>
                                        </span>
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
                                        {log.userName}
                                        {isCurrent && <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Aktif</span>}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        {getDeviceIcon(log.deviceModel)}
                                        <span className="truncate max-w-[120px]">{log.deviceModel}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                                    <Calendar size={10} /> {formatDate(log.loginTime)}
                                </p>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-end gap-1">
                                    <Clock size={10} /> {formatTime(log.loginTime)}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 dark:bg-black/20 rounded-lg p-2 flex items-center justify-between border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <div className="bg-yellow-100 dark:bg-yellow-900/20 p-1.5 rounded-md text-yellow-600 dark:text-yellow-400">
                                    <Zap size={14} />
                                </div>
                                <span className="text-xs text-gray-600 dark:text-gray-300">Bu Oturumda:</span>
                            </div>
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                +{log.wordsLearnedInSession} Kelime
                            </span>
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
