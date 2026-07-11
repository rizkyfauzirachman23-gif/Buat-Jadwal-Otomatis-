import React, { useEffect } from 'react';
import { TimeSettings, SchoolBreak } from '../types';
import { Clock, Plus, Trash2, Coffee, Calendar, Copy, Check, Watch } from 'lucide-react';

interface Props {
  timeSettings: TimeSettings;
  setTimeSettings: React.Dispatch<React.SetStateAction<TimeSettings>>;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const TimeConfig: React.FC<Props> = ({ timeSettings, setTimeSettings }) => {
  const [breakName, setBreakName] = React.useState('');
  const [breakStart, setBreakStart] = React.useState('');
  const [breakEnd, setBreakEnd] = React.useState('');

  // Strict Initialization: Ensure dailyOverrides exists immediately
  useEffect(() => {
    if (!timeSettings.dailyOverrides || Object.keys(timeSettings.dailyOverrides).length === 0) {
        const defaults: Record<string, { start: string, end: string }> = {};
        DAYS.forEach(day => {
            defaults[day] = { start: timeSettings.startHour || '07:00', end: timeSettings.endHour || '15:00' };
        });
        setTimeSettings(prev => ({ ...prev, dailyOverrides: defaults }));
    }
  }, []); // Run once on mount

  const handleDailyTimeChange = (day: string, type: 'start' | 'end', value: string) => {
    setTimeSettings(prev => {
        const currentOverrides = prev.dailyOverrides || {};
        const currentDayConfig = currentOverrides[day] || { start: prev.startHour, end: prev.endHour };
        
        return {
            ...prev,
            dailyOverrides: {
                ...currentOverrides,
                [day]: {
                    ...currentDayConfig,
                    [type]: value
                }
            }
        };
    });
  };

  const handleDurationChange = (minutes: number) => {
    setTimeSettings(prev => ({
        ...prev,
        lessonDuration: minutes
    }));
  };

  const copyMondayToAll = () => {
      // 1. Get Monday Config safely
      const mondayConfig = timeSettings.dailyOverrides?.['Senin'];
      
      // Fallback if Monday is somehow missing
      const sourceConfig = mondayConfig || { start: timeSettings.startHour, end: timeSettings.endHour };

      if (confirm(`Salin jam Senin (${sourceConfig.start} - ${sourceConfig.end}) ke SELURUH hari (Senin-Sabtu)?`)) {
          const newOverrides: Record<string, { start: string, end: string }> = {};
          
          // 2. Create deep copy for all days
          DAYS.forEach(day => {
              newOverrides[day] = { ...sourceConfig };
          });

          // 3. Force state update
          setTimeSettings(prev => ({
              ...prev,
              dailyOverrides: newOverrides
          }));
      }
  };

  const addBreak = () => {
    if (!breakName || !breakStart || !breakEnd) return;
    
    const newBreak: SchoolBreak = {
      id: Date.now().toString(),
      name: breakName,
      startTime: breakStart,
      endTime: breakEnd
    };

    setTimeSettings(prev => ({
      ...prev,
      breaks: [...prev.breaks, newBreak].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));

    setBreakName('');
    setBreakStart('');
    setBreakEnd('');
  };

  const removeBreak = (id: string) => {
    setTimeSettings(prev => ({
      ...prev,
      breaks: prev.breaks.filter(b => b.id !== id)
    }));
  };

  const durations = [30, 35, 40, 45, 60];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-indigo-700">
        <Clock size={24} /> Pengaturan Jam Pelajaran
      </h2>

      {/* Per Day Configuration */}
      <div className="mb-6 pb-6 border-b border-slate-100">
        <div className="flex justify-between items-end mb-2">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600"/> Jam Efektif Harian
            </h3>
            <button 
                type="button"
                onClick={copyMondayToAll}
                className="text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                title="Salin jam Senin ke semua hari lain"
            >
                <Copy size={12}/> Samakan Semua
            </button>
        </div>
        
        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {DAYS.map(day => {
                const config = timeSettings.dailyOverrides?.[day] || { start: '07:00', end: '15:00' };
                // Visual highlight for short days (Friday/Saturday mostly)
                const isShortDay = day === 'Jumat' || day === 'Sabtu';
                
                return (
                    <div key={day} className={`grid grid-cols-12 gap-2 items-center p-1 rounded ${isShortDay ? 'bg-indigo-50/50' : ''}`}>
                        <div className={`col-span-3 text-xs font-bold ${isShortDay ? 'text-indigo-700' : 'text-slate-600'}`}>
                            {day}
                        </div>
                        <div className="col-span-4">
                            <input
                                type="time"
                                value={config.start}
                                onChange={(e) => handleDailyTimeChange(day, 'start', e.target.value)}
                                className="w-full p-1.5 text-xs border border-slate-300 rounded focus:border-indigo-500 outline-none text-center bg-white shadow-sm font-mono"
                            />
                        </div>
                        <div className="col-span-1 text-center text-slate-400 font-bold">-</div>
                        <div className="col-span-4">
                            <input
                                type="time"
                                value={config.end}
                                onChange={(e) => handleDailyTimeChange(day, 'end', e.target.value)}
                                className="w-full p-1.5 text-xs border border-slate-300 rounded focus:border-indigo-500 outline-none text-center bg-white shadow-sm font-mono"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Lesson Duration Setting */}
      <div className="mb-6 pb-6 border-b border-slate-100">
         <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Watch size={16} className="text-teal-600"/> Durasi per JP (Jam Pelajaran)
         </h3>
         <div className="flex flex-wrap gap-2">
            {durations.map(mins => (
                <button
                    key={mins}
                    onClick={() => handleDurationChange(mins)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border flex-1 transition-all ${
                        timeSettings.lessonDuration === mins
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-200'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {mins} Menit
                </button>
            ))}
         </div>
         <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">Manual:</span>
            <div className="relative w-24">
                 <input 
                    type="number"
                    value={timeSettings.lessonDuration}
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
                    className="w-full p-1.5 text-sm font-bold border border-slate-300 rounded focus:border-teal-500 outline-none text-center"
                 />
                 <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">min</span>
            </div>
         </div>
      </div>

      {/* Bagian Istirahat */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Coffee size={16} className="text-amber-600"/> Jam Istirahat & Sholat
        </h3>
        
        {/* Input Istirahat */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3 shadow-sm">
            <div className="grid grid-cols-1 gap-2 mb-2">
                <input
                    type="text"
                    placeholder="Nama (Ex: Istirahat 1)"
                    value={breakName}
                    onChange={(e) => setBreakName(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-sm w-full outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="time"
                        value={breakStart}
                        onChange={(e) => setBreakStart(e.target.value)}
                        className="p-2 border border-slate-300 rounded text-sm w-full outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                        type="time"
                        value={breakEnd}
                        onChange={(e) => setBreakEnd(e.target.value)}
                        className="p-2 border border-slate-300 rounded text-sm w-full outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            </div>
            <button 
                type="button"
                onClick={addBreak}
                disabled={!breakName || !breakStart || !breakEnd}
                className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
                <Plus size={16}/> Tambah Istirahat
            </button>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
                *Jadwal tidak akan diletakkan di jam ini.
            </p>
        </div>

        {/* List Istirahat */}
        <div className="space-y-2">
            {timeSettings.breaks.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">Belum ada jam istirahat diatur.</p>
            )}
            {timeSettings.breaks.map((b) => (
                <div key={b.id} className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded shadow-sm hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-100 p-1.5 rounded text-amber-700">
                            <Coffee size={14}/>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-700">{b.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1 rounded w-fit">{b.startTime} - {b.endTime}</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => removeBreak(b.id)} 
                        className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                    >
                        <Trash2 size={14}/>
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};