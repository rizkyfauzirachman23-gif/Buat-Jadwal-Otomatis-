import React, { useState, useEffect, useRef } from 'react';
import { TeacherInput } from './components/TeacherInput';
import { TimeConfig } from './components/TimeConfig';
import { ScheduleResult } from './components/ScheduleResult';
import { NearbyPlaces } from './components/NearbyPlaces';
import { Teacher, ScheduleResponse, AppStatus, TimeSettings } from './types';
import { generateSchedule } from './services/geminiService';
import { BrainCircuit, Sparkles, CalendarDays, Loader2, RotateCcw, Save, FlaskConical, Bell, X, CheckCircle, AlertCircle, Upload, Download } from 'lucide-react';

const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const LOADING_MESSAGES = [
  "Menganalisis ketersediaan guru...",
  "Menghitung slot waktu presisi...",
  "Mengalokasikan ruangan laboratorium...",
  "Memeriksa bentrok jadwal...",
  "Menyeimbangkan beban kerja guru...",
  "Menyisipkan waktu istirahat & sholat...",
  "Finalisasi jadwal pelajaran..."
];

const DEFAULT_TIME_SETTINGS: TimeSettings = {
  startHour: '07:00',
  endHour: '15:00',
  breaks: [
    { id: '1', name: 'Istirahat 1', startTime: '10:00', endTime: '10:20' },
    { id: '2', name: 'Sholat Dzuhur / Istirahat 2', startTime: '12:00', endTime: '12:40' }
  ]
};

// --- TOAST COMPONENT ---
interface ToastMsg { id: number; type: 'success' | 'error' | 'info'; text: string; }
const ToastContainer: React.FC<{ toasts: ToastMsg[], remove: (id: number) => void }> = ({ toasts, remove }) => (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 print:hidden">
        {toasts.map(t => (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all animate-fade-in-up min-w-[300px] ${
                t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-800'
            }`}>
                {t.type === 'success' ? <CheckCircle size={20}/> : t.type === 'error' ? <AlertCircle size={20}/> : <Bell size={20}/>}
                <span className="text-sm font-medium flex-1">{t.text}</span>
                <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100"><X size={16}/></button>
            </div>
        ))}
    </div>
);

const App: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [timeSettings, setTimeSettings] = useState<TimeSettings>(DEFAULT_TIME_SETTINGS);
  
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, text, type }]);
      setTimeout(() => removeToast(id), 4000);
  };
  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    try {
        const savedTeachers = localStorage.getItem('autoSchedule_teachers');
        const savedTime = localStorage.getItem('autoSchedule_time');
        const savedDays = localStorage.getItem('autoSchedule_days');
        
        if (savedTeachers) setTeachers(JSON.parse(savedTeachers));
        if (savedTime) setTimeSettings(JSON.parse(savedTime));
        if (savedDays) setSelectedDays(JSON.parse(savedDays));
    } catch (e) {
        console.error("Failed to load local storage data", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('autoSchedule_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('autoSchedule_time', JSON.stringify(timeSettings));
  }, [timeSettings]);

  useEffect(() => {
    localStorage.setItem('autoSchedule_days', JSON.stringify(selectedDays));
  }, [selectedDays]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === AppStatus.GENERATING) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleGenerate = async () => {
    const hasAssignments = teachers.some(t => t.assignments && t.assignments.length > 0);
    
    if (teachers.length === 0 || !hasAssignments) {
      addToast("Harap masukkan data guru dan tugas mengajar terlebih dahulu.", "error");
      return;
    }

    setStatus(AppStatus.GENERATING);
    setSchedule(null);
    setLoadingMsgIndex(0);

    try {
      const result = await generateSchedule(teachers, selectedDays, timeSettings);
      setSchedule(result);
      setStatus(AppStatus.SUCCESS);
      addToast("Jadwal berhasil dibuat!", "success");
    } catch (error: any) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      addToast(error.message || "Terjadi kesalahan saat membuat jadwal.", "error");
    }
  };

  const handleResetData = () => {
      if (confirm("Apakah Anda yakin ingin menghapus SEMUA data guru dan pengaturan?")) {
          setTeachers([]);
          setTimeSettings(DEFAULT_TIME_SETTINGS);
          setSchedule(null);
          localStorage.removeItem('autoSchedule_teachers');
          localStorage.removeItem('autoSchedule_time');
          localStorage.removeItem('autoSchedule_days');
          addToast("Data berhasil direset.", "success");
      }
  };

  // --- EXPORT / IMPORT LOGIC ---
  const handleExportData = () => {
    const data = {
      teachers,
      timeSettings,
      selectedDays,
      schedule, // Include current schedule result
      exportDate: new Date().toISOString(),
      appVersion: "2.0-dewa"
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_jadwal_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Data berhasil disimpan (Backup)", "success");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.teachers) setTeachers(json.teachers);
        if (json.timeSettings) setTimeSettings(json.timeSettings);
        if (json.selectedDays) setSelectedDays(json.selectedDays);
        if (json.schedule) {
            setSchedule(json.schedule);
            setStatus(AppStatus.SUCCESS);
        }
        addToast("Data berhasil dipulihkan (Restore)", "success");
      } catch (err) {
        console.error(err);
        addToast("File backup tidak valid.", "error");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const loadSampleData = () => {
    if (teachers.length > 0 && !confirm("Timpa data saat ini dengan data contoh?")) return;

    const samples: Teacher[] = [
      {
        id: 't1', name: 'Budi Santoso, M.Pd', code: 'BUD', unavailableDays: [],
        assignments: [
          { id: 'a1', subjectName: 'Matematika', grade: '7', classes: '7A', duration: 40, weeklyCount: 4, maxConsecutiveSessions: 2, reqRoom: 'Kelas Biasa' },
          { id: 'a2', subjectName: 'Matematika', grade: '7', classes: '7B', duration: 40, weeklyCount: 4, maxConsecutiveSessions: 2, reqRoom: 'Kelas Biasa' }
        ]
      },
      {
        id: 't2', name: 'Siti Aminah, S.Si', code: 'SIT', unavailableDays: ['Jumat'],
        assignments: [
          { id: 'a3', subjectName: 'IPA', grade: '7', classes: '7A', duration: 40, weeklyCount: 5, maxConsecutiveSessions: 2, reqRoom: 'Lab IPA' },
          { id: 'a4', subjectName: 'IPA', grade: '7', classes: '7B', duration: 40, weeklyCount: 5, maxConsecutiveSessions: 2, reqRoom: 'Lab IPA' }
        ]
      },
      {
        id: 't3', name: 'Rudi Hermawan, S.Kom', code: 'RUD', unavailableDays: [],
        assignments: [
          { id: 'a5', subjectName: 'Informatika', grade: '7', classes: '7A', duration: 40, weeklyCount: 2, maxConsecutiveSessions: 2, reqRoom: 'Lab Komputer' },
          { id: 'a6', subjectName: 'Informatika', grade: '7', classes: '7B', duration: 40, weeklyCount: 2, maxConsecutiveSessions: 2, reqRoom: 'Lab Komputer' }
        ]
      },
      {
        id: 't4', name: 'Dra. Yulia', code: 'YUL', unavailableDays: ['Senin'],
        assignments: [
          { id: 'a7', subjectName: 'Bahasa Indonesia', grade: '7', classes: '7A', duration: 40, weeklyCount: 4, maxConsecutiveSessions: 2, reqRoom: 'Kelas Biasa' },
          { id: 'a8', subjectName: 'Bahasa Indonesia', grade: '7', classes: '7B', duration: 40, weeklyCount: 4, maxConsecutiveSessions: 2, reqRoom: 'Kelas Biasa' }
        ]
      }
    ];
    setTeachers(samples);
    addToast("Data contoh berhasil dimuat.", "success");
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12 relative font-inter">
      <ToastContainer toasts={toasts} remove={removeToast} />
      
      {/* Hidden File Input for Restore */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* Cinematic Loading Overlay */}
      {status === AppStatus.GENERATING && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white animate-fade-in">
           <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-30 rounded-full animate-pulse"></div>
              <Loader2 size={64} className="animate-spin text-indigo-400 relative z-10" />
           </div>
           <h2 className="text-3xl font-bold mt-8 mb-2 tracking-tight">AI Sedang Bekerja</h2>
           <p className="text-indigo-200 text-lg animate-pulse min-h-[30px] text-center max-w-md px-4">
              {LOADING_MESSAGES[loadingMsgIndex]}
           </p>
           <div className="mt-8 w-64 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-progress-indeterminate"></div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200 ring-1 ring-white/50">
                <BrainCircuit className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none">Jadwal Otomatis</h1>
                <p className="text-xs text-slate-500 font-medium mt-1">Karya Riz Bennington</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
             <button 
                onClick={handleImportClick}
                className="text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-100 bg-white shadow-sm"
                title="Restore Backup"
             >
                <Upload size={14} /> Buka File
             </button>
             <button 
                onClick={handleExportData}
                className="text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-100 bg-white shadow-sm"
                title="Download Backup"
             >
                <Download size={14} /> Simpan File
             </button>
             <div className="h-6 w-px bg-slate-300 mx-1"></div>
             <button 
                onClick={handleResetData}
                className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-100 bg-white shadow-sm"
             >
                <RotateCcw size={14} /> Reset
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6 no-print">
            
            {/* Day Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
               <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <CalendarDays size={18} className="text-indigo-600"/> Hari Sekolah
                    </h3>
                    <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-green-100">
                        <CheckCircle size={10}/> Disimpan
                    </span>
               </div>
               <div className="flex flex-wrap gap-2">
                 {DAYS_OF_WEEK.map(day => (
                   <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                      selectedDays.includes(day)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                   >
                     {day}
                   </button>
                 ))}
               </div>
            </div>

            {/* Time Configuration */}
            <TimeConfig timeSettings={timeSettings} setTimeSettings={setTimeSettings} />
            
            {/* Teacher Input */}
            <TeacherInput teachers={teachers} setTeachers={setTeachers} />
            
            <button
              onClick={handleGenerate}
              disabled={status === AppStatus.GENERATING || teachers.length === 0}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transform transition-all font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
               {status === AppStatus.GENERATING ? <Loader2 className="animate-spin" /> : <Sparkles size={20} className="text-yellow-300" />} 
               Buat Jadwal Otomatis
            </button>
          </div>

          {/* Right Column: Results & Maps */}
          <div className="lg:col-span-8 space-y-6">
            {status === AppStatus.IDLE && (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center h-full min-h-[500px]">
                <div className="bg-indigo-50 p-8 rounded-full mb-6 animate-pulse ring-8 ring-indigo-50/50">
                  <CalendarDays className="text-indigo-500" size={64} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">Siap Membuat Jadwal Dewa</h3>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
                  Sistem AI kami siap menyusun jadwal presisi, anti-bentrok, dan seimbang.<br/>
                  Isi data di sebelah kiri untuk memulai, atau gunakan data contoh.
                </p>
                <div className="flex gap-3 justify-center">
                    <button onClick={loadSampleData} className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-2">
                        <FlaskConical size={16}/> Coba Data Dummy
                    </button>
                </div>
              </div>
            )}

            {schedule && <ScheduleResult schedule={schedule} setSchedule={setSchedule} />}
            
            {/* Maps Grounding Section */}
            <div className="map-section">
                <NearbyPlaces />
            </div>
          </div>
        </div>
      </main>
      
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite linear;
          width: 50%;
        }
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;