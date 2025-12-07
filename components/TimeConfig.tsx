import React, { useState } from 'react';
import { TimeSettings, SchoolBreak } from '../types';
import { Clock, Plus, Trash2, Coffee, Sun } from 'lucide-react';

interface Props {
  timeSettings: TimeSettings;
  setTimeSettings: React.Dispatch<React.SetStateAction<TimeSettings>>;
}

export const TimeConfig: React.FC<Props> = ({ timeSettings, setTimeSettings }) => {
  const [breakName, setBreakName] = useState('');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');

  const handleTimeChange = (field: 'startHour' | 'endHour', value: string) => {
    setTimeSettings(prev => ({ ...prev, [field]: value }));
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

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-indigo-700">
        <Clock size={24} /> Pengaturan Waktu
      </h2>

      {/* Jam Sekolah Utama */}
      <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
             <Sun size={14} className="text-amber-500"/> Jam Masuk
          </label>
          <input
            type="time"
            value={timeSettings.startHour}
            onChange={(e) => handleTimeChange('startHour', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <Sun size={14} className="text-indigo-500"/> Jam Pulang
          </label>
          <input
            type="time"
            value={timeSettings.endHour}
            onChange={(e) => handleTimeChange('endHour', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Bagian Istirahat */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Coffee size={16} className="text-amber-600"/> Jam Istirahat & Sholat
        </h3>
        
        {/* Input Istirahat */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <input
                    type="text"
                    placeholder="Nama (Ex: Istirahat 1)"
                    value={breakName}
                    onChange={(e) => setBreakName(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-sm w-full"
                />
                <div className="flex items-center gap-1">
                    <input
                        type="time"
                        value={breakStart}
                        onChange={(e) => setBreakStart(e.target.value)}
                        className="p-2 border border-slate-300 rounded text-sm w-full"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="time"
                        value={breakEnd}
                        onChange={(e) => setBreakEnd(e.target.value)}
                        className="p-2 border border-slate-300 rounded text-sm w-full"
                    />
                </div>
                <button 
                    onClick={addBreak}
                    disabled={!breakName || !breakStart || !breakEnd}
                    className="bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                >
                    <Plus size={16}/> Tambah
                </button>
            </div>
            <p className="text-[10px] text-slate-500">
                Sistem tidak akan menaruh jadwal pelajaran di jam ini.
            </p>
        </div>

        {/* List Istirahat */}
        <div className="space-y-2">
            {timeSettings.breaks.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-2">Belum ada jam istirahat diatur.</p>
            )}
            {timeSettings.breaks.map((b) => (
                <div key={b.id} className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-100 p-1.5 rounded text-amber-700">
                            <Coffee size={14}/>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-800">{b.name}</p>
                            <p className="text-xs text-slate-500">{b.startTime} - {b.endTime}</p>
                        </div>
                    </div>
                    <button onClick={() => removeBreak(b.id)} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 size={16}/>
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};