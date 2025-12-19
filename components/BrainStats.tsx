
import React, { useState, useEffect } from 'react';
import { Brain, Target, Edit2, Check, AlertCircle, CircleDashed } from 'lucide-react';
import { UserStats } from '../types';

interface BrainStatsProps {
  stats: UserStats;
  learnedCount: number;
  difficultCount: number;
  onUpdateTarget: (target: number) => void;
}

const BrainStats: React.FC<BrainStatsProps> = ({ stats, learnedCount, difficultCount, onUpdateTarget }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(stats.targetWordCount.toString());
  
  // Animation states
  const [animLearned, setAnimLearned] = useState(0);
  const [animDifficult, setAnimDifficult] = useState(0);

  // Calculate percentages
  const target = stats.targetWordCount || 100;
  
  // Cap percentages so they don't overflow visual graph
  const totalCount = learnedCount + difficultCount;
  
  const finalLearnedPct = Math.min(100, (learnedCount / target) * 100);
  const finalDifficultPct = Math.min(100 - finalLearnedPct, (difficultCount / target) * 100);
  const remainingVisPct = 100 - (finalLearnedPct + finalDifficultPct);

  useEffect(() => {
    // Animate values on mount
    const duration = 1500; // ms
    const steps = 60;
    const stepTime = duration / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      setAnimLearned(finalLearnedPct * easeOut);
      setAnimDifficult(finalDifficultPct * easeOut);

      if (currentStep >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [finalLearnedPct, finalDifficultPct]);

  const handleSaveTarget = () => {
    const val = parseInt(tempTarget);
    if (!isNaN(val) && val > 0) {
      onUpdateTarget(val);
      setIsEditing(false);
    }
  };

  // --- Visualization Constants ---
  const BRAIN_START_X = 35;
  const BRAIN_WIDTH = 135;
  const INDICATOR_Y = 55;

  const stop1 = animLearned;
  const stop2 = animLearned + animDifficult;

  // Anchor Points
  const xGreen = BRAIN_START_X + (BRAIN_WIDTH * (animLearned / 2) / 100);
  const xOrange = BRAIN_START_X + (BRAIN_WIDTH * (animLearned + (animDifficult / 2)) / 100);
  const xGray = BRAIN_START_X + (BRAIN_WIDTH * (stop2 + (100 - stop2) / 2) / 100);

  const labelTargetGreen = { x: 15, y: 15 };
  const labelTargetOrange = { x: 100, y: -10 };
  const labelTargetGray = { x: 185, y: 15 };

  return (
    <div className="h-full w-full flex flex-col items-center bg-gray-50 dark:bg-[#050a14] overflow-y-auto overflow-x-hidden pb-8 transition-colors duration-300">
      
      {/* Cinematic Electrical & Particle CSS */}
      <style>{`
        @keyframes electricFlow {
          0% { stroke-dashoffset: 100; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: -100; opacity: 0; }
        }
        
        @keyframes floatParticle {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-40px) translateX(10px); opacity: 0; }
        }

        @keyframes pulseHologram {
          0% { filter: drop-shadow(0 0 5px rgba(6,182,212,0.3)); }
          50% { filter: drop-shadow(0 0 15px rgba(6,182,212,0.6)); }
          100% { filter: drop-shadow(0 0 5px rgba(6,182,212,0.3)); }
        }

        .spark-path {
          stroke-dasharray: 20, 100;
          stroke-dashoffset: 100;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: url(#blueGlow);
        }
        
        .spark-active { animation: electricFlow 3s infinite linear; }
        .particle { animation: floatParticle 6s infinite ease-out; }
      `}</style>

      {/* Header - Reduced bottom margin to mb-1 */}
      <div className="w-full bg-white dark:bg-gray-900 p-6 rounded-b-3xl shadow-sm text-center mb-1 shrink-0 z-20 relative">
         <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 rounded-full mb-3 shadow-inner">
            <Brain className="text-cyan-600 dark:text-cyan-300 w-8 h-8" />
         </div>
         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Beyin Haritası</h2>
         <p className="text-gray-500 dark:text-gray-400 text-sm">Nöral Bağlantı Durumu</p>
      </div>

      {/* Brain Visualization Container - Increased top margin to mt-16 to provide clearance for the floating stats */}
      <div className="relative w-full max-w-sm aspect-[4/3] flex items-center justify-center p-2 mb-4 mt-16">
        
        {/* --- PROFESSIONAL ATMOSPHERIC BACKGROUND --- */}
        <div className="absolute inset-0 flex items-center justify-center overflow-visible z-0 pointer-events-none">
             {/* 1. Deep Core (Black/Blue Void) */}
             <div className="absolute w-[140%] h-[140%] bg-radial-gradient from-[#0f172a] via-[#020617] to-black opacity-90 rounded-full"></div>
             
             {/* 2. Central Glow (Source Light) */}
             <div className="absolute w-64 h-64 bg-blue-500/20 rounded-full blur-[70px] animate-pulse"></div>
             <div className="absolute w-48 h-48 bg-cyan-400/10 rounded-full blur-[50px] top-1/3"></div>

             {/* 3. Floating Particles (Stars/Dust) */}
             {[...Array(8)].map((_, i) => (
                <div 
                    key={i}
                    className="particle absolute w-1 h-1 bg-white rounded-full"
                    style={{
                        top: `${Math.random() * 80 + 10}%`,
                        left: `${Math.random() * 80 + 10}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        opacity: 0.6
                    }}
                ></div>
             ))}
        </div>

        {/* The Brain SVG */}
        <svg viewBox="0 0 200 160" className="w-full h-full overflow-visible relative z-10" style={{ animation: 'pulseHologram 4s infinite ease-in-out' }}>
          <defs>
            {/* Holographic Dot Pattern (Simulating Cells/Neurons) */}
            <pattern id="neuronPattern" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
               <circle cx="1.5" cy="1.5" r="0.8" fill="#38bdf8" opacity="0.4"/>
            </pattern>

            {/* Dynamic Data Gradient - Restoring proportions with Neon Colors */}
            <linearGradient id="statsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {/* Learned (Neon Green) */}
              <stop offset="0%" stopColor="#059669" /> {/* Emerald 600 */}
              <stop offset={`${stop1}%`} stopColor="#34d399" /> {/* Emerald 400 */}
              
              {/* Difficult (Neon Orange) - Sharp transition logic */}
              <stop offset={`${stop1}%`} stopColor="#ea580c" /> {/* Orange 600 */}
              <stop offset={`${stop2}%`} stopColor="#fb923c" /> {/* Orange 400 */}
              
              {/* Remaining (Deep Blue/Void) - Sharp transition logic */}
              <stop offset={`${stop2}%`} stopColor="#1e293b" /> {/* Slate 800 */}
              <stop offset="100%" stopColor="#0f172a" /> {/* Slate 950 */}
            </linearGradient>

            {/* Cranial Outline Gradient */}
            <linearGradient id="skullGradient" x1="0%" y1="0%" x2="0%" y2="100%">
               <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.4"/>
               <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1"/>
            </linearGradient>

            {/* Strong Electric Glow Filter */}
            <filter id="blueGlow" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
               <feMerge>
                   <feMergeNode in="coloredBlur"/>
                   <feMergeNode in="SourceGraphic"/>
               </feMerge>
            </filter>
          </defs>
          
          {/* --- LAYER 1: The Cranial Halo (Skull Outline) --- */}
          <path 
            d="M40,118 C30,108 20,95 20,75 C20,35 55,15 100,15 C150,15 185,40 185,85 C185,118 160,140 120,140 C100,140 85,130 75,130 C65,130 50,128 40,118 Z"
            fill="none"
            stroke="url(#skullGradient)"
            strokeWidth="1"
            opacity="0.5"
            className="transition-all duration-100"
          />

          {/* --- LAYER 2: The Brain Mass (Data Gradient Base) --- */}
          {/* This layer provides the base color based on user progress */}
          <path 
            d="M45,115 C35,105 25,95 25,75 C25,40 55,20 100,20 C145,20 180,45 180,85 C180,115 155,135 120,135 C100,135 85,125 75,125 C65,125 55,125 45,115 Z"
            fill="url(#statsGradient)"
            stroke="none"
            className="transition-all duration-100"
          />
          
          {/* --- LAYER 2b: Holographic Pattern Overlay --- */}
          {/* This sits ON TOP of the colors to give it the texture/tech look without hiding the data */}
          <path 
            d="M45,115 C35,105 25,95 25,75 C25,40 55,20 100,20 C145,20 180,45 180,85 C180,115 155,135 120,135 C100,135 85,125 75,125 C65,125 55,125 45,115 Z"
            fill="url(#neuronPattern)"
            stroke="#0ea5e9"
            strokeWidth="0.5"
            filter="url(#blueGlow)"
            className="transition-all duration-100"
            style={{ mixBlendMode: 'overlay', opacity: 0.6 }}
          />

          {/* --- LAYER 3: Internal Structure (Folds) --- */}
          <g fill="none" stroke="#7dd3fc" strokeWidth="1" strokeLinecap="round" opacity="0.4">
            <path d="M55 50 C 70 35 95 30 110 45" />
            <path d="M115 45 C 130 30 155 35 165 60" />
            <path d="M45 85 C 55 95 70 90 75 80" />
            <path d="M165 85 C 155 100 135 110 120 105" />
            <path d="M85 80 C 100 95 130 85 140 70" />
          </g>

          {/* --- LAYER 4: Neural Sparks (Electrical Activity) --- */}
          <g>
             {/* Main Bolt */}
             <path 
                d="M50,80 L70,60 L90,70 L110,50 L130,60" 
                className="spark-path spark-active"
                stroke="#fff" 
                strokeWidth="1.5"
                style={{ animationDuration: '2s' }}
             />
             {/* Secondary Bolt */}
             <path 
                d="M150,85 L130,95 L110,85 L90,100" 
                className="spark-path spark-active"
                stroke="#67e8f9" 
                strokeWidth="1"
                style={{ animationDelay: '0.5s', animationDuration: '3s' }}
             />
              {/* Third Bolt */}
              <path 
                d="M70,40 L90,50 L100,30" 
                className="spark-path spark-active"
                stroke="#a5f3fc" 
                strokeWidth="1"
                style={{ animationDelay: '1.2s', animationDuration: '4s' }}
             />
          </g>

          {/* --- LAYER 5: Data Nodes (Indicators) --- */}
          
          {/* Learned Node */}
          {animLearned > 1 && (
            <g className="transition-all duration-500 ease-out" style={{ opacity: animLearned > 0 ? 1 : 0 }}>
                {/* Glowing Core Node */}
                <circle cx={xGreen} cy={INDICATOR_Y} r="4" fill="#22c55e" stroke="#fff" strokeWidth="1" filter="url(#blueGlow)"/>
                <circle cx={xGreen} cy={INDICATOR_Y} r="8" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.5" className="animate-ping"/>
                
                {/* Connector Line */}
                <polyline 
                    points={`${xGreen},${INDICATOR_Y} ${xGreen},25 ${labelTargetGreen.x},${labelTargetGreen.y}`} 
                    fill="none" 
                    stroke="#22c55e" 
                    strokeWidth="1" 
                    strokeDasharray="2,2"
                    opacity="0.8"
                />
            </g>
          )}

          {/* Difficult Node */}
          {animDifficult > 1 && (
            <g className="transition-all duration-500 ease-out" style={{ opacity: animDifficult > 0 ? 1 : 0 }}>
                <circle cx={xOrange} cy={INDICATOR_Y} r="4" fill="#f97316" stroke="#fff" strokeWidth="1" filter="url(#blueGlow)"/>
                <circle cx={xOrange} cy={INDICATOR_Y} r="8" fill="none" stroke="#f97316" strokeWidth="0.5" opacity="0.5" className="animate-ping" style={{ animationDelay: '0.5s' }}/>

                <polyline 
                    points={`${xOrange},${INDICATOR_Y} ${labelTargetOrange.x},${labelTargetOrange.y}`} 
                    fill="none" 
                    stroke="#f97316" 
                    strokeWidth="1" 
                    strokeDasharray="2,2"
                    opacity="0.8"
                />
            </g>
          )}

          {/* Remaining Node */}
          {remainingVisPct > 1 && (
            <g className="transition-all duration-500 ease-out">
                <circle cx={xGray} cy={INDICATOR_Y} r="3" fill="#94a3b8" stroke="#fff" strokeWidth="1"/>
                <polyline 
                    points={`${xGray},${INDICATOR_Y} ${xGray},25 ${labelTargetGray.x},${labelTargetGray.y}`} 
                    fill="none" 
                    stroke="#94a3b8" 
                    strokeWidth="1" 
                    strokeDasharray="2,2"
                    opacity="0.6"
                />
            </g>
          )}
        </svg>

        {/* --- HTML LABELS (Data Overlays) --- */}
        
        {animLearned > 0 && (
            <div className="absolute top-0 left-0 transform -translate-y-2 translate-x-1 animate-in slide-in-from-bottom-2 fade-in duration-700 w-auto min-w-[90px] z-30">
                <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border-l-2 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] text-center">
                    <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest mb-0.5">Öğrenilen</p>
                    <p className="text-xl font-black text-white leading-none">%{Math.round(animLearned)}</p>
                </div>
            </div>
        )}

        {animDifficult > 0 && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-12 animate-in slide-in-from-bottom-2 fade-in duration-700 delay-300 w-auto min-w-[90px] z-30">
                <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border-l-2 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-center">
                    <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-0.5">Zorlanan</p>
                    <p className="text-xl font-black text-white leading-none">%{Math.round(animDifficult)}</p>
                </div>
            </div>
        )}

        {remainingVisPct > 1 && (
            <div className="absolute top-0 right-0 transform -translate-y-2 -translate-x-1 animate-in slide-in-from-bottom-2 fade-in duration-700 delay-500 w-auto min-w-[90px] z-30">
                <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border-l-2 border-gray-400 shadow-sm text-center">
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">Kalan</p>
                    <p className="text-xl font-black text-gray-300 leading-none">%{Math.round(100 - animLearned - animDifficult)}</p>
                </div>
            </div>
        )}
      </div>

      {/* Stats Summary List */}
      <div className="w-full max-w-sm px-6 space-y-3 mb-8 relative z-10">
         <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border-l-4 border-green-500 group hover:shadow-md transition">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition"><Check size={20} /></div>
                <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold">Tamamlanan</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100 text-lg">{learnedCount} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Kelime</span></p>
                </div>
            </div>
         </div>

         <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border-l-4 border-orange-500 group hover:shadow-md transition">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition"><AlertCircle size={20} /></div>
                <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold">Tekrar Edilen</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100 text-lg">{difficultCount} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Kelime</span></p>
                </div>
            </div>
         </div>

         <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border-l-4 border-gray-300 dark:border-gray-600 group hover:shadow-md transition">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition"><CircleDashed size={20} /></div>
                <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold">Öğrenilecek (Kalan)</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100 text-lg">{Math.max(0, target - totalCount)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Kelime</span></p>
                </div>
            </div>
         </div>
      </div>

      {/* Target Setting */}
      <div className="w-full max-w-sm px-6 relative z-10">
        <div className="bg-indigo-600 dark:bg-indigo-900 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
             {/* Decorative Background Icon */}
             <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4 transition-transform group-hover:scale-110 duration-500">
                 <Target size={120} />
             </div>
             
             <div className="relative z-10">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg flex items-center gap-2"><Target size={20}/> Hedef Belirle</h3>
                     {!isEditing && (
                         <button onClick={() => setIsEditing(true)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition shadow-sm">
                             <Edit2 size={16} />
                         </button>
                     )}
                 </div>

                 {isEditing ? (
                     <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                         <input 
                            type="number" 
                            value={tempTarget}
                            onChange={(e) => setTempTarget(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl text-gray-800 font-bold outline-none border-2 border-indigo-400 focus:border-white shadow-inner bg-white"
                            autoFocus
                            placeholder="Örn: 500"
                         />
                         <button 
                            onClick={handleSaveTarget}
                            className="px-6 py-2 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 shadow-md"
                         >
                             Kaydet
                         </button>
                     </div>
                 ) : (
                     <div>
                         <div className="flex items-baseline gap-2">
                             <p className="text-4xl font-extrabold">{target}</p>
                             <span className="text-lg font-medium opacity-80">Kelime</span>
                         </div>
                         
                         <div className="mt-4 w-full bg-black/20 rounded-full h-3 backdrop-blur-sm overflow-hidden border border-white/10">
                             <div 
                                className="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                style={{ width: `${Math.min(100, (totalCount / target) * 100)}%`}}
                             ></div>
                         </div>
                         <div className="flex justify-between mt-2 text-xs font-medium text-indigo-200">
                             <span>Başlangıç</span>
                             <span>İlerleme: %{Math.round((totalCount / target) * 100)}</span>
                         </div>
                     </div>
                 )}
             </div>
        </div>
      </div>

    </div>
  );
};

export default BrainStats;
