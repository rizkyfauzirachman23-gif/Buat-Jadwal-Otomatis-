import React, { useState, useEffect } from 'react';
import { Teacher, TeacherAssignment } from '../types';
import { Plus, Trash2, User, BookOpen, Layers, Info, Keyboard, Hash, MapPin, CalendarX, Split, Pencil, Check, BarChart3, Users, Briefcase, Activity, CalendarCheck } from 'lucide-react';

interface Props {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
}

export const TeacherInput: React.FC<Props> = ({ teachers, setTeachers }) => {
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]);
  
  // Local state for assignments within the form
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  // Input states
  const [subjName, setSubjName] = useState('');
  const [subjMode, setSubjMode] = useState<'select' | 'manual'>('select'); 

  const [subjDuration, setSubjDuration] = useState<number>(40);
  
  const [weeklyCount, setWeeklyCount] = useState<number>(2);
  const [maxConsecutive, setMaxConsecutive] = useState<number>(2); 
  const [reqRoom, setReqRoom] = useState<string>('Kelas Biasa');

  // Grade & Class Logic
  const [gradeMode, setGradeMode] = useState<'select' | 'manual'>('select');
  const [selectedGrade, setSelectedGrade] = useState('7');
  const [manualGrade, setManualGrade] = useState('');

  const [classMode, setClassMode] = useState<'select' | 'manual'>('select');
  const [selectedClassSuffix, setSelectedClassSuffix] = useState('A');
  const [manualClass, setManualClass] = useState('');

  // Validate Max Consecutive when Weekly Count changes
  useEffect(() => {
    if (maxConsecutive > weeklyCount) {
        setMaxConsecutive(weeklyCount);
    }
  }, [weeklyCount, maxConsecutive]);

  const gradeOptions = ['7', '8', '9', '10', '11', '12'];
  const classSuffixOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const roomOptions = ['Kelas Biasa', 'Lab Komputer', 'Lab IPA', 'Lab Bahasa', 'Lapangan Olahraga', 'Aula'];
  
  const smpSubjects = [
    "Pendidikan Agama",
    "PPKn",
    "Bahasa Indonesia",
    "Matematika",
    "Ilmu Pengetahuan Alam (IPA)",
    "Ilmu Pengetahuan Sosial (IPS)",
    "Bahasa Inggris",
    "Seni Budaya",
    "PJOK",
    "Prakarya",
    "Informatika",
    "Bahasa Daerah",
    "Bimbingan Konseling (BK)"
  ];

  const toggleUnavailableDay = (day: string) => {
    setUnavailableDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setUnavailableDays([]);
    setAssignments([]);
    setSubjName('');
    setWeeklyCount(2);
    setMaxConsecutive(2);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setName(teacher.name);
    setCode(teacher.code);
    setUnavailableDays(teacher.unavailableDays || []);
    setAssignments([...teacher.assignments]); // Clone to avoid mutation refs
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addAssignment = () => {
    if (!subjName) return;

    let finalGradeString = gradeMode === 'select' ? selectedGrade : manualGrade;
    let finalClassString = '';
    if (classMode === 'select') {
        if (gradeMode === 'select') {
             finalClassString = `${selectedGrade}${selectedClassSuffix}`;
        } else {
             finalClassString = `${manualGrade} (${selectedClassSuffix})`; 
             if (manualGrade.includes(',')) {
                 finalClassString = manualClass || `Kelas ${selectedClassSuffix}`;
             } else {
                 finalClassString = `${manualGrade}${selectedClassSuffix}`;
             }
        }
    } else {
        finalClassString = manualClass;
    }

    const safeWeeklyCount = Math.max(1, weeklyCount);
    const safeMaxConsecutive = Math.min(Math.max(1, maxConsecutive), safeWeeklyCount);

    // Logic for Bulk Grades (Comma Separated)
    const isBulkGrade = gradeMode === 'manual' && finalGradeString.includes(',');
    
    if (isBulkGrade) {
        const gradesInput = finalGradeString.split(',').map(g => g.trim()).filter(g => g !== '');
        const newAssignments: TeacherAssignment[] = gradesInput.map((g, index) => ({
            id: Date.now().toString() + Math.random() + index,
            subjectName: subjName,
            grade: g,
            classes: classMode === 'manual' ? finalClassString : '',
            duration: subjDuration,
            weeklyCount: safeWeeklyCount,
            maxConsecutiveSessions: safeMaxConsecutive,
            reqRoom: reqRoom
        }));
        setAssignments([...assignments, ...newAssignments]);
    } else {
        const newAsg: TeacherAssignment = {
            id: Date.now().toString() + Math.random(),
            subjectName: subjName,
            grade: finalGradeString,
            classes: finalClassString,
            duration: subjDuration,
            weeklyCount: safeWeeklyCount,
            maxConsecutiveSessions: safeMaxConsecutive,
            reqRoom: reqRoom
        };
        setAssignments([...assignments, newAsg]);
    }
    
    setManualClass('');
    if(gradeMode === 'manual') setManualGrade('');
    setWeeklyCount(2); 
    setMaxConsecutive(2);
    setReqRoom('Kelas Biasa');
  };

  const removeAssignment = (id: string) => {
    setAssignments(assignments.filter(a => a.id !== id));
  };

  const handleSaveTeacher = () => {
    if (!name || !code || assignments.length === 0) return;

    if (editingId) {
        // Update existing
        setTeachers(prev => prev.map(t => {
            if (t.id === editingId) {
                return {
                    ...t,
                    name,
                    code,
                    unavailableDays,
                    assignments
                };
            }
            return t;
        }));
    } else {
        // Add new
        const newTeacher: Teacher = {
            id: Date.now().toString(),
            name,
            code,
            assignments: assignments,
            unavailableDays: unavailableDays
        };
        setTeachers([...teachers, newTeacher]);
    }
    
    resetForm();
  };

  const removeTeacher = (id: string) => {
    if (editingId === id) resetForm();
    setTeachers(teachers.filter(t => t.id !== id));
  };

  // Helper for Workload Visualization
  const calculateWorkload = (t: Teacher) => {
      const totalJP = t.assignments.reduce((sum, a) => sum + a.weeklyCount, 0);
      const maxCapacity = 30; // 30 JP is standard full load
      const percentage = Math.min((totalJP / maxCapacity) * 100, 100);
      
      let statusColor = "bg-emerald-500";
      let label = "Ringan";
      
      if (totalJP > 30) {
          statusColor = "bg-red-500";
          label = "Overload";
      } else if (totalJP > 24) {
          statusColor = "bg-amber-500";
          label = "Padat";
      } else if (totalJP >= 12) {
          statusColor = "bg-blue-500";
          label = "Ideal";
      } else {
          statusColor = "bg-slate-300";
          label = "Ringan";
      }

      return { totalJP, percentage, statusColor, label };
  };

  // Stats for the top of list
  const totalHoursAll = teachers.reduce((sum, t) => sum + t.assignments.reduce((s, a) => s + a.weeklyCount, 0), 0);
  const avgHours = teachers.length > 0 ? (totalHoursAll / teachers.length).toFixed(1) : "0";

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-indigo-700">
        <User size={24} /> {editingId ? 'Edit Data Guru' : 'Input Data Guru'}
      </h2>

      {/* --- FORM INPUT --- */}
      <div className={`p-5 rounded-xl border mb-8 transition-colors ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className={`font-medium flex items-center gap-2 ${editingId ? 'text-amber-700' : 'text-slate-800'}`}>
                {editingId ? <Pencil className="w-4 h-4"/> : <Plus className="w-4 h-4 text-indigo-500"/>} 
                {editingId ? 'Update Data Guru' : 'Tambah Guru Baru'}
            </h3>
            {editingId && (
                <button onClick={resetForm} className="text-xs text-slate-500 underline hover:text-slate-800">
                    Batal Edit
                </button>
            )}
        </div>
        
        {/* --- SECTION 1 & 2: IDENTITAS GURU --- */}
        <div className="mb-6 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">1</span> 
                Identitas Guru (Nama & Kode)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">1. Nama Guru</label>
                <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all focus:bg-white"
                placeholder="Contoh: Ir. Rizki Fauzi Rachman, M.Pd"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">2. Kode Guru (Inisial)</label>
                <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all focus:bg-white font-mono uppercase"
                placeholder="Contoh: B01"
                />
            </div>
            </div>
        </div>

        {/* --- SECTION 3: HARI --- */}
        <div className="mb-6 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">2</span> 
                3. Pengaturan Hari
            </h4>
            <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <CalendarX size={12} className="text-red-500"/> Pilih Hari dimana Guru <b className="text-red-600">BERHALANGAN / TIDAK BISA</b> hadir:
            </label>
            <div className="flex flex-wrap gap-2">
                {daysOfWeek.map(day => (
                    <button
                        key={day}
                        onClick={() => toggleUnavailableDay(day)}
                        className={`px-4 py-2 rounded-md text-xs font-bold border transition-all ${
                            unavailableDays.includes(day)
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 ring-1 ring-red-200'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                    >
                        {day}
                    </button>
                ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">* Guru tidak akan dijadwalkan pada hari yang dipilih (merah).</p>
        </div>

        {/* --- SECTION 4: MATA PELAJARAN --- */}
        <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mb-4 shadow-sm relative overflow-hidden">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-600 flex items-center justify-center text-[10px]">3</span> 
                4. Input Mata Pelajaran
            </h4>

            <div className="absolute top-0 right-0 bg-indigo-100 px-3 py-1 rounded-bl-lg text-[10px] text-indigo-600 border-b border-l border-indigo-200 flex items-center gap-1 font-medium">
                <Info size={10} /> Tips: Pecah jam panjang (e.g. 6JP) menjadi sesi kecil.
            </div>

            <div className="flex flex-col gap-3 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    
                    {/* Mapel (3 cols) */}
                    <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Mata Pelajaran</label>
                        {subjMode === 'select' ? (
                            <select
                                value={subjName}
                                onChange={(e) => {
                                    if(e.target.value === 'manual_opt') {
                                        setSubjMode('manual');
                                        setSubjName('');
                                    } else {
                                        setSubjName(e.target.value);
                                    }
                                }}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none bg-white font-medium text-slate-700"
                            >
                                <option value="" disabled>Pilih Mapel...</option>
                                {smpSubjects.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                <option value="manual_opt" className="font-bold text-indigo-600">+ Input Manual...</option>
                            </select>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={subjName}
                                    onChange={(e) => setSubjName(e.target.value)}
                                    className="w-full p-2 border border-indigo-300 rounded-md text-sm focus:border-indigo-500 outline-none pr-6 font-medium"
                                    placeholder="Ketik nama mapel..."
                                    autoFocus
                                />
                                <button 
                                    onClick={() => setSubjMode('select')}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                    title="Kembali ke Pilihan"
                                >
                                    <Keyboard size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tingkat & Kelas (Combined for space - 3 cols) */}
                    <div className="md:col-span-3 grid grid-cols-2 gap-2">
                        <div>
                             <label className="block text-xs text-slate-500 mb-1">Tingkat</label>
                             <select
                                value={gradeMode === 'select' ? selectedGrade : manualGrade}
                                onChange={(e) => {
                                    if(e.target.value === 'manual_opt') setGradeMode('manual');
                                    else setSelectedGrade(e.target.value);
                                }}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none bg-white"
                             >
                                {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                        </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Kelas</label>
                             <select
                                value={classMode === 'select' ? selectedClassSuffix : manualClass}
                                onChange={(e) => {
                                    if(e.target.value === 'manual_opt') setClassMode('manual');
                                    else setSelectedClassSuffix(e.target.value);
                                }}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none bg-white"
                             >
                                {classSuffixOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                        </div>
                    </div>

                    {/* Jumlah Jam Total (1.5 cols) */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-indigo-600 mb-1">Total JP/Minggu</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={weeklyCount}
                                onChange={(e) => setWeeklyCount(Number(e.target.value))}
                                className="w-full p-2 border border-indigo-200 bg-white rounded-md text-sm focus:border-indigo-500 outline-none font-bold text-indigo-900"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-bold pointer-events-none">JP</div>
                        </div>
                    </div>

                    {/* Max Consecutive (1.5 cols) */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-orange-600 mb-1">Max Sesi/Hari</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="8"
                                value={maxConsecutive}
                                onChange={(e) => setMaxConsecutive(Number(e.target.value))}
                                className="w-full p-2 border border-orange-200 bg-white rounded-md text-sm focus:border-orange-500 outline-none font-bold text-orange-900"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-orange-400 font-bold pointer-events-none">JP</div>
                        </div>
                    </div>

                    {/* Ruangan Khusus (1.5 cols) - Shrink slightly */}
                    <div className="md:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">Ruangan</label>
                        <select
                            value={reqRoom}
                            onChange={(e) => setReqRoom(e.target.value)}
                            className={`w-full p-2 border rounded-md text-sm focus:border-indigo-500 outline-none ${reqRoom !== 'Kelas Biasa' ? 'bg-amber-50 border-amber-300 text-amber-800 font-medium' : 'bg-white border-slate-300'}`}
                        >
                            {roomOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    
                    {/* Add Button (1 col) */}
                    <div className="md:col-span-12 lg:col-span-12 xl:col-span-1 mt-2 xl:mt-0">
                        <button
                            onClick={addAssignment}
                            disabled={!subjName}
                            className="w-full p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
                            title="Tambah Mapel ke Daftar"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List of temporary assignments */}
            {assignments.length > 0 && (
                <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Daftar Mapel Guru Ini ({assignments.length}):</p>
                    {assignments.map(asg => (
                        <div key={asg.id} className="flex items-center justify-between bg-white p-2 rounded text-sm border border-indigo-100 shadow-sm">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="font-bold text-slate-700 flex items-center gap-1">
                                    <BookOpen size={14} className="text-indigo-400"/> {asg.subjectName}
                                </span>
                                <span className="text-slate-500 text-xs flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                    <Layers size={12}/> {asg.grade} - {asg.classes || 'Auto'}
                                </span>
                                {/* Badge JP */}
                                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-indigo-100">
                                    <Hash size={10}/> Total: {asg.weeklyCount} JP
                                </span>
                                {/* Badge Max Consecutive */}
                                <span className="text-xs font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-100">
                                    <Split size={10}/> Max/Hari: {asg.maxConsecutiveSessions}
                                </span>
                            </div>
                            <button onClick={() => removeAssignment(asg.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <button
          onClick={handleSaveTeacher}
          disabled={!name || !code || assignments.length === 0}
          className={`w-full py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-medium shadow-sm ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {editingId ? <Check size={18} /> : <Plus size={18} />} 
          {editingId ? 'Simpan Perubahan' : 'Simpan Data Guru'}
        </button>
      </div>

      {/* --- LIST GURU TERSIMPAN --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-700">Daftar Guru ({teachers.length})</h3>
            
            {/* Simple Dashboard Stats */}
            {teachers.length > 0 && (
                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Briefcase size={12} className="text-slate-400"/>
                        Total: <b>{totalHoursAll} JP</b>
                    </div>
                    <div className="flex items-center gap-1">
                        <Activity size={12} className="text-slate-400"/>
                        Rata-rata: <b>{avgHours} JP/Guru</b>
                    </div>
                </div>
            )}
        </div>
        
        {teachers.length === 0 && <p className="text-center text-slate-400 py-6 text-sm italic">Belum ada data guru. Silakan tambah di atas atau Import Excel.</p>}

        {teachers.map(teacher => {
          const workload = calculateWorkload(teacher);
          
          return (
          <div key={teacher.id} className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all ${editingId === teacher.id ? 'ring-2 ring-amber-400 border-amber-200 bg-amber-50/10' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <div className="bg-indigo-100 text-indigo-700 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0">
                            {teacher.code.substring(0,2)}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm truncate">{teacher.name}</h4>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                            {teacher.code}
                        </span>
                        {teacher.unavailableDays && teacher.unavailableDays.length > 0 && (
                             <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-normal ml-auto sm:ml-0">
                                <CalendarX size={10} /> Libur: {teacher.unavailableDays.join(', ')}
                             </span>
                        )}
                    </div>

                    {/* --- WORKLOAD VISUALIZATION (UPDATED) --- */}
                    <div className="mt-3 pr-4 max-w-md">
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                                <BarChart3 size={10}/> Beban Mengajar
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-slate-700">{workload.totalJP} JP</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full text-white font-bold ${workload.statusColor} shadow-sm`}>
                                    {workload.label}
                                </span>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className={`h-full ${workload.statusColor} transition-all duration-700 ease-out relative`} 
                                style={{ width: `${workload.percentage}%` }}
                            >
                                <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                    <button 
                        onClick={() => handleEditTeacher(teacher)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100"
                        title="Edit Guru"
                    >
                        <Pencil size={16} />
                    </button>
                    <button 
                        onClick={() => removeTeacher(teacher.id)} 
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Hapus Guru"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            
            {/* Expanded Assignments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-50">
                {teacher.assignments.map((asg, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-600 bg-slate-50/50 p-1.5 rounded border border-slate-100 hover:border-indigo-100 hover:bg-white transition-colors">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                            <span className="font-medium truncate">{asg.subjectName}</span>
                            <span className="text-slate-400 text-[10px] truncate max-w-[60px]">({asg.classes || asg.grade})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                             <span className="font-mono text-slate-500 bg-white px-1 rounded border border-slate-100 shadow-sm">{asg.weeklyCount}h</span>
                        </div>
                    </div>
                ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};