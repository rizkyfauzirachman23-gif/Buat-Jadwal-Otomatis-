import React, { useState, useMemo } from 'react';
import { ScheduleResponse, ScheduleItem } from '../types';
import { Calendar, Download, Clock, Pencil, Save, X, FileSpreadsheet, Layers, Users, BookOpen, MapPin, Filter, Sparkles, BrainCircuit, AlertTriangle, Printer, Eye, Grid3X3, List } from 'lucide-react';
import { analyzeScheduleWithAI } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Props {
  schedule: ScheduleResponse | null;
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleResponse | null>>;
}

export const ScheduleResult: React.FC<Props> = ({ schedule, setSchedule }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<ScheduleItem[]>([]);
  
  // Filter & View State
  const [viewType, setViewType] = useState<'LIST' | 'MATRIX'>('LIST');
  const [viewMode, setViewMode] = useState<'TEACHER' | 'CLASS'>('TEACHER'); // For List Mode
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL'); // For List Mode
  
  // Matrix specific state
  const [matrixDay, setMatrixDay] = useState<string>('');

  // AI Analysis State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  if (!schedule) return null;

  // Initialize matrix day if empty
  if (!matrixDay && schedule.items.length > 0) {
      setMatrixDay(schedule.items[0].day);
  }

  const handleEditClick = () => {
    setEditedItems([...schedule.items]);
    setIsEditing(true);
    // Force List view when editing for easier manipulation
    setViewType('LIST'); 
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedItems([]);
  };

  const handleSave = () => {
    if (schedule) {
      setSchedule({ ...schedule, items: editedItems });
    }
    setIsEditing(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
        const result = await analyzeScheduleWithAI(schedule);
        setAnalysisResult(result);
    } catch (error) {
        console.error(error);
        setAnalysisResult("Maaf, terjadi kesalahan saat menganalisis jadwal.");
    } finally {
        setAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const updateItem = (index: number, field: keyof ScheduleItem, value: string) => {
    const newItems = [...editedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditedItems(newItems);
  };

  // --- Filtering & Logic ---
  const rawItems = isEditing ? editedItems : schedule.items;
  
  // Extract lists for dropdowns
  const uniqueTeachersList = useMemo(() => Array.from(new Set(rawItems.map(i => i.teacher)))
    .filter((name: string) => name && name.trim() !== '')
    .sort(), [rawItems]);

  const uniqueClassesList = useMemo(() => Array.from(new Set(rawItems.map(i => i.className)))
    .filter((name: string) => name && name.trim() !== '')
    .sort(), [rawItems]);

  const uniqueDays = useMemo(() => Array.from(new Set(rawItems.map(i => i.day))), [rawItems]);

  const currentItems = useMemo(() => {
    if (viewType === 'MATRIX') return rawItems.filter(i => i.day === matrixDay);
    
    if (selectedFilter === 'ALL') return rawItems;
    if (viewMode === 'TEACHER') return rawItems.filter(i => i.teacher === selectedFilter);
    if (viewMode === 'CLASS') return rawItems.filter(i => i.className === selectedFilter);
    return rawItems;
  }, [rawItems, selectedFilter, viewMode, viewType, matrixDay]);

  // --- CONFLICT DETECTION LOGIC ---
  const conflicts = useMemo(() => {
     const conflictMap = new Map<number, string[]>(); 
     const teacherTimeMap = new Map<string, number[]>(); 
     const roomTimeMap = new Map<string, number[]>(); 
     const classTimeMap = new Map<string, number[]>(); 

     rawItems.forEach((item, index) => {
         if (!item.teacherCode || !item.timeSlot || !item.day) return;

         const teacherKey = `${item.day}|${item.timeSlot}|${item.teacherCode}`;
         if (!teacherTimeMap.has(teacherKey)) teacherTimeMap.set(teacherKey, []);
         teacherTimeMap.get(teacherKey)?.push(index);

         const classKey = `${item.day}|${item.timeSlot}|${item.className}`;
         if (!classTimeMap.has(classKey)) classTimeMap.set(classKey, []);
         classTimeMap.get(classKey)?.push(index);

         if (item.room && item.room !== 'Kelas Biasa' && !item.room.toLowerCase().includes('biasa')) {
             const roomKey = `${item.day}|${item.timeSlot}|${item.room}`;
             if (!roomTimeMap.has(roomKey)) roomTimeMap.set(roomKey, []);
             roomTimeMap.get(roomKey)?.push(index);
         }
     });

     teacherTimeMap.forEach((indices, key) => {
         if (indices.length > 1) {
             const [d, t, code] = key.split('|');
             const reason = `Guru ${code} double job di jam ${t}`;
             indices.forEach(idx => {
                 const currentReasons = conflictMap.get(idx) || [];
                 if(!currentReasons.includes(reason)) conflictMap.set(idx, [...currentReasons, reason]);
             });
         }
     });

     classTimeMap.forEach((indices, key) => {
         if (indices.length > 1) {
             const [d, t, cls] = key.split('|');
             const reason = `Kelas ${cls} tabrakan di jam ${t}`;
             indices.forEach(idx => {
                 const currentReasons = conflictMap.get(idx) || [];
                 if(!currentReasons.includes(reason)) conflictMap.set(idx, [...currentReasons, reason]);
             });
         }
     });

     return conflictMap;
  }, [rawItems]);

  const hasConflicts = conflicts.size > 0;

  // --- CSV Export ---
  const downloadCSV = () => {
    const headers = ["Hari", "No", "Kode Guru", "Nama Guru", "Mata Pelajaran", "Tingkat", "Kelas", "Ruangan", "Waktu"];
    const csvContent = [
      headers.join(","),
      ...rawItems.map((item, idx) => 
        `"${item.day}","${idx+1}","${item.teacherCode}","${item.teacher}","${item.subject}","${item.grade}","${item.className}","${item.room || '-'}","${item.timeSlot}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `jadwal_pelajaran_full_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- List View Groups ---
  const groupedList = useMemo(() => {
      const days = Array.from(new Set(currentItems.map(i => i.day)));
      return days.map(day => ({
        day,
        items: currentItems
          .map((item, originalIndex) => ({ ...item, originalIndex: isEditing ? originalIndex : rawItems.indexOf(item) }))
          .filter(i => i.day === day)
          .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
      }));
  }, [currentItems, isEditing, rawItems]);

  // --- Matrix View Data Prep ---
  const matrixData = useMemo(() => {
      if (viewType !== 'MATRIX') return null;

      const dayItems = rawItems
        .map((item, index) => ({...item, originalIndex: index}))
        .filter(i => i.day === matrixDay);
      
      const timeSlots = Array.from(new Set(dayItems.map(i => i.timeSlot))).sort();
      const classes = Array.from(new Set(dayItems.map(i => i.className))).sort();

      return { timeSlots, classes, items: dayItems };
  }, [rawItems, matrixDay, viewType]);

  // Stats
  const uniqueClasses = new Set(rawItems.map(i => i.className)).size;
  const totalHours = rawItems.length;
  const activeTeachers = new Set(rawItems.map(i => i.teacherCode)).size;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-5">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3.5 rounded-xl text-white shadow-blue-200 shadow-lg">
                <Layers size={24} />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Kelas</p>
                <p className="text-3xl font-bold text-slate-800">{uniqueClasses}</p>
            </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-5">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3.5 rounded-xl text-white shadow-emerald-200 shadow-lg">
                <BookOpen size={24} />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sesi</p>
                <p className="text-3xl font-bold text-slate-800">{totalHours}</p>
            </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-5">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3.5 rounded-xl text-white shadow-purple-200 shadow-lg">
                <Users size={24} />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Guru Aktif</p>
                <p className="text-3xl font-bold text-slate-800">{activeTeachers}</p>
            </div>
        </div>
      </div>

      {/* 2. Warning Box for Conflicts */}
      {hasConflicts && (
         <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-4 animate-pulse no-print shadow-sm">
            <div className="bg-red-100 p-2 rounded-full text-red-600">
                <AlertTriangle size={24} />
            </div>
            <div>
                <h3 className="font-bold text-red-800 text-lg">Terdeteksi Bentrok Jadwal</h3>
                <p className="text-red-700 text-sm mt-1">
                    Sistem mendeteksi adanya bentrok. Cek baris berwarna merah di tampilan daftar atau sel merah di tampilan grid.
                </p>
            </div>
         </div>
      )}

      {/* 3. AI Analysis Section */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-xl no-print relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-3">
                        <BrainCircuit size={28} className="text-indigo-400"/> Analisis Cerdas AI
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Deteksi burnout guru, distribusi mapel, dan efisiensi jadwal.</p>
                </div>
                {!analysisResult && (
                    <button 
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 backdrop-blur-md"
                    >
                        {analyzing ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        ) : (
                            <Sparkles size={16} className="text-yellow-300" />
                        )}
                        {analyzing ? 'Menganalisis...' : 'Mulai Analisis'}
                    </button>
                )}
            </div>
            
            {analysisResult && (
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 text-sm leading-relaxed animate-fade-in shadow-inner">
                    <div className="prose prose-invert prose-sm max-w-none marker:text-indigo-400">
                        <ReactMarkdown>{analysisResult}</ReactMarkdown>
                    </div>
                    <button 
                        onClick={() => setAnalysisResult(null)}
                        className="mt-6 text-xs text-slate-400 hover:text-white underline transition-colors"
                    >
                        Tutup Laporan
                    </button>
                </div>
            )}
          </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 no-print border-b border-slate-100 pb-6">
          <div>
              <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                    <Calendar size={24} /> 
                </div>
                {schedule.scheduleName || "Jadwal Pelajaran"}
              </h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
              {!isEditing ? (
                  <>
                      <button 
                          onClick={handleEditClick}
                          className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
                      >
                          <Pencil size={16} /> Edit
                      </button>
                      <button 
                          onClick={handlePrint}
                          className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
                      >
                          <Printer size={16} /> Cetak
                      </button>
                      <button 
                          onClick={downloadCSV}
                          className="flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 border border-transparent px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200"
                      >
                          <FileSpreadsheet size={16} /> Unduh CSV
                      </button>
                  </>
              ) : (
                  <>
                      <button 
                          onClick={handleCancel}
                          className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all"
                      >
                          <X size={16} /> Batal
                      </button>
                      <button 
                          onClick={handleSave}
                          className="flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-md"
                      >
                          <Save size={16} /> Simpan
                      </button>
                  </>
              )}
          </div>
        </div>

        {/* --- VIEW TOGGLE & FILTER CONTROL --- */}
        <div className="flex flex-col gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200 no-print">
            
            {/* Top Row: View Type (List vs Matrix) */}
            <div className="flex justify-between items-center">
                 <div className="flex bg-white rounded-lg border border-slate-300 p-1 shadow-sm">
                    <button 
                        onClick={() => setViewType('LIST')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewType === 'LIST' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <List size={14}/> Tampilan Daftar
                    </button>
                    <button 
                        onClick={() => setViewType('MATRIX')}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewType === 'MATRIX' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Grid3X3 size={14}/> Tampilan Grid
                    </button>
                </div>
            </div>
            
            {viewType === 'LIST' ? (
                /* LIST VIEW FILTERS */
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-slate-500" />
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Filter:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 w-full">
                        <div className="flex bg-white rounded-lg border border-slate-300 p-1 shadow-sm">
                            <button 
                                onClick={() => { setViewMode('TEACHER'); setSelectedFilter('ALL'); }}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'TEACHER' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Users size={14}/> Guru
                            </button>
                            <button 
                                onClick={() => { setViewMode('CLASS'); setSelectedFilter('ALL'); }}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'CLASS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Layers size={14}/> Kelas
                            </button>
                        </div>
                        <select
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value)}
                            disabled={isEditing}
                            className={`flex-1 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-medium shadow-sm ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <option value="ALL">Tampilkan Semua</option>
                            {viewMode === 'TEACHER' ? (
                                uniqueTeachersList.map((t, idx) => <option key={`t-${idx}`} value={t}>{t}</option>)
                            ) : (
                                uniqueClassesList.map((c, idx) => <option key={`c-${idx}`} value={c}>Kelas {c}</option>)
                            )}
                        </select>
                    </div>
                </div>
            ) : (
                /* MATRIX VIEW TABS */
                <div className="flex flex-wrap gap-2">
                    {uniqueDays.map(day => (
                        <button
                            key={day}
                            onClick={() => setMatrixDay(day)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                                matrixDay === day 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-white hover:border-indigo-400'
                            }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* --- CONTENT RENDER --- */}
        
        {viewType === 'MATRIX' && matrixData && (
            <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-sm schedule-container">
                <table className="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 bg-slate-100 border border-slate-300 font-bold text-slate-700 sticky left-0 z-20 min-w-[100px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <div className="flex flex-col items-center">
                                    <span className="uppercase tracking-wider">Jam</span>
                                    <span className="text-[10px] font-normal text-slate-500">{matrixDay}</span>
                                </div>
                            </th>
                            {matrixData.classes.map(cls => (
                                <th key={cls} className="p-3 bg-indigo-50 border border-slate-300 font-bold text-indigo-800 text-center min-w-[120px]">
                                    Kelas {cls}
                                </span>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrixData.timeSlots.map(time => (
                            <tr key={time}>
                                <th className="p-3 bg-white border border-slate-300 font-mono font-medium text-slate-600 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                                    {time}
                                </th>
                                {matrixData.classes.map(cls => {
                                    // Find item for this cell
                                    const cellItem = matrixData.items.find(i => i.timeSlot === time && i.className === cls);
                                    
                                    // Check conflict
                                    const conflictReasons = cellItem ? conflicts.get(cellItem.originalIndex) : null;
                                    const isConflict = conflictReasons && conflictReasons.length > 0;

                                    return (
                                        <td key={`${time}-${cls}`} className={`p-2 border border-slate-300 h-20 align-top relative group transition-colors ${
                                            !cellItem ? 'bg-slate-50/50' : isConflict ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-indigo-50'
                                        }`}>
                                            {cellItem ? (
                                                <div className="flex flex-col h-full justify-between gap-1">
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-[11px] leading-tight mb-0.5">{cellItem.subject}</div>
                                                        <div className="text-[10px] text-slate-500">{cellItem.teacherCode}</div>
                                                    </div>
                                                    {cellItem.room && cellItem.room !== 'Kelas Biasa' && (
                                                         <div className="text-[9px] font-semibold text-amber-700 bg-amber-50 w-fit px-1 rounded border border-amber-100">{cellItem.room}</div>
                                                    )}
                                                    
                                                    {/* Tooltip for Matrix */}
                                                    <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-[10px] p-2 rounded shadow-lg pointer-events-none z-50 w-40">
                                                        <p className="font-bold">{cellItem.teacher}</p>
                                                        {isConflict && <p className="text-red-300 font-bold mt-1">⚠️ Konflik!</p>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-200 text-center block text-lg">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {viewType === 'LIST' && (
        <div className="space-y-12">
          {groupedList.length === 0 && (
             <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                 <Filter size={48} className="mx-auto text-slate-300 mb-4" />
                 <p className="text-slate-500 font-medium">Tidak ada jadwal ditemukan untuk filter ini.</p>
                 <button onClick={() => setSelectedFilter('ALL')} className="mt-2 text-indigo-600 text-sm font-semibold hover:underline">
                    Reset Filter
                 </button>
             </div>
          )}
          
          {groupedList.map((group) => (
            <div key={group.day} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm schedule-container bg-white">
              <div className="bg-slate-50/80 backdrop-blur px-6 py-4 border-b border-slate-200 flex items-center justify-between schedule-header sticky top-0 z-10">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-indigo-600 rounded-full inline-block no-print shadow-sm"></span>
                    {group.day}
                </h3>
                <span className="text-xs font-bold bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-600 shadow-sm no-print">
                    {group.items.length} Sesi
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-100/50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-bold w-16 text-center tracking-wider">No</th>
                      <th scope="col" className="px-6 py-4 font-bold w-32 tracking-wider">Waktu</th>
                      <th scope="col" className="px-6 py-4 font-bold tracking-wider">Mata Pelajaran</th>
                      <th scope="col" className="px-6 py-4 font-bold tracking-wider">Guru</th>
                      <th scope="col" className="px-6 py-4 font-bold w-24 text-center tracking-wider">Kelas</th>
                      <th scope="col" className="px-6 py-4 font-bold w-40 tracking-wider">Ruangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {group.items.map((item, idx) => {
                       const conflictReasons = conflicts.get(item.originalIndex);
                       const isConflict = conflictReasons && conflictReasons.length > 0;
                       
                       return (
                      <tr 
                        key={idx} 
                        className={`transition-colors group relative ${isConflict ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-indigo-50/30'}`}
                      >
                        
                        <td className="px-6 py-4 text-slate-400 font-mono text-xs text-center border-r border-slate-50">
                          {idx + 1}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-600 whitespace-nowrap text-xs border-r border-slate-50">
                          {isEditing ? (
                              <input 
                                  type="text" 
                                  value={item.timeSlot}
                                  onChange={(e) => updateItem(item.originalIndex, 'timeSlot', e.target.value)}
                                  className="w-full p-1.5 border border-slate-300 rounded text-xs"
                              />
                          ) : (
                              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg w-fit font-mono ${isConflict ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
                                  <Clock size={12} className="no-print opacity-70" />
                                  {item.timeSlot}
                              </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-slate-800 border-r border-slate-50">
                           {isEditing ? (
                              <input 
                                  type="text" 
                                  value={item.subject}
                                  onChange={(e) => updateItem(item.originalIndex, 'subject', e.target.value)}
                                  className="w-full p-1.5 border border-slate-300 rounded text-xs"
                              />
                          ) : (
                              <span className="flex items-center gap-2 font-medium">
                                <div className={`w-2 h-2 rounded-full ${isConflict ? 'bg-red-500' : 'bg-teal-400'} no-print`}></div>
                                {item.subject}
                              </span>
                          )}
                        </td>

                        <td className="px-6 py-4 border-r border-slate-50">
                           {isEditing ? (
                              <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={item.teacherCode}
                                    placeholder="Kode"
                                    onChange={(e) => updateItem(item.originalIndex, 'teacherCode', e.target.value)}
                                    className="w-16 p-1.5 border border-slate-300 rounded text-xs"
                                />
                                <input 
                                    type="text" 
                                    value={item.teacher}
                                    placeholder="Nama"
                                    onChange={(e) => updateItem(item.originalIndex, 'teacher', e.target.value)}
                                    className="flex-1 p-1.5 border border-slate-300 rounded text-xs"
                                />
                              </div>
                          ) : (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    {item.teacher}
                                    {isConflict && (
                                        <div className="group/tooltip relative no-print inline-block">
                                            <AlertTriangle size={14} className="text-red-500 cursor-help" />
                                            <div className="absolute left-1/2 bottom-full mb-2 w-64 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-3 rounded-lg shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                                                <p className="font-bold mb-1 border-b border-slate-600 pb-1">Detail Konflik:</p>
                                                {conflictReasons.map((r, i) => <div key={i} className="mb-0.5">• {r}</div>)}
                                            </div>
                                        </div>
                                    )}
                                </span>
                                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 rounded w-fit border border-slate-100 mt-1">
                                    {item.teacherCode}
                                </span>
                              </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center border-r border-slate-50">
                           {isEditing ? (
                              <input 
                                  type="text" 
                                  value={item.className}
                                  onChange={(e) => updateItem(item.originalIndex, 'className', e.target.value)}
                                  className="w-full p-1.5 border border-slate-300 rounded text-xs text-center font-bold"
                              />
                          ) : (
                              <div className="flex flex-col items-center">
                                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                                    {item.className}
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-1">Tingkat {item.grade}</span>
                              </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                           {isEditing ? (
                              <input 
                                  type="text" 
                                  value={item.room || ''}
                                  onChange={(e) => updateItem(item.originalIndex, 'room', e.target.value)}
                                  className="w-full p-1.5 border border-slate-300 rounded text-xs"
                              />
                          ) : (
                              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border ${
                                  item.room && item.room.includes('Lab') ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                  item.room && item.room.includes('Lapangan') ? 'bg-green-50 text-green-700 border-green-100' : 
                                  'bg-white text-slate-500 border-transparent'
                                }`}>
                                  {item.room && item.room !== 'Kelas Biasa' && <MapPin size={12} className="no-print opacity-70" />}
                                  {item.room || '-'}
                              </div>
                          )}
                        </td>

                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};